'use client';

import { useState, useCallback, useMemo, useEffect, useRef, memo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, MapPin, X, Search, Loader2, ChevronDown, Check, ImagePlus, Route, Plus, Pencil, Car, Footprints, Train as TrainIcon, Globe, Phone, ExternalLink, Navigation, Clock, GripVertical, Square, CheckSquare, CloudRain, Sparkles, Plane, Hotel, Coffee, DoorOpen, LogOut, UtensilsCrossed, Sun, CloudSun, Cloud, Umbrella, AlertTriangle, Star, BedDouble, Waves, Dumbbell, Shirt, Package, Briefcase, Camera, ShoppingBag, MoreHorizontal, Trash2 } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCenter,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '@/contexts/AuthContext';
import { useTripEditor, type EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import { useHotelLogic } from '@/lib/hooks/useHotelLogic';
import { parseDestinations, stringifyDestinations, parseTripNotes, stringifyTripNotes, type TripNoteItem, type ActivityData, type ActivityType } from '@/types/trip';
import { calculateDayNumberFromDate } from '@/lib/utils/time-calculations';
import { getAirportCoordinates } from '@/lib/utils/airports';
import { PageLoader } from '@/components/LoadingStates';
import { createClient } from '@/lib/supabase/client';
import type { Destination } from '@/types/destination';
import TripSettingsBox from '@/features/trip/components/TripSettingsBox';
import DestinationBox from '@/features/trip/components/DestinationBox';
import AddPlacePanel from '@/features/trip/components/AddPlacePanel';
import { NeighborhoodTags } from '@/features/trip/components/NeighborhoodBreakdown';
import DayIntelligence from '@/features/trip/components/DayIntelligence';
import { CrowdBadge } from '@/features/trip/components/CrowdIndicator';
import { UndoProvider } from '@/features/trip/components/UndoToast';
import { SavingFeedback } from '@/features/trip/components/SavingFeedback';
import { TripEditorHeader } from '@/features/trip/components/editor/TripEditorHeader';
import { TripChecklist } from '@/features/trip/components/editor/TripChecklist';
import { useWeather, type DayWeather } from '@/lib/hooks/useWeather';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { Settings, Moon } from 'lucide-react';
import LocalTimeDisplay from '@/features/trip/components/LocalTimeDisplay';
import TripQuickActions from '@/features/trip/components/TripQuickActions';

/**
 * TripPage - Completely rethought
 *
 * Philosophy:
 * - No sidebars - everything inline
 * - No buttons - things just work
 * - No forms - just type and select
 * - No modes - edit is default
 */
export default function TripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params?.id as string;
  const { user, loading: authLoading } = useAuth();

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/signin');
    }
  }, [authLoading, user, router]);

  const {
    trip,
    days,
    loading,
    savingStatus,
    lastSavedItemId,
    updateTrip,
    reorderItems,
    addPlace,
    addFlight,
    addTrain,
    addHotel,
    addActivity,
    removeItem,
    updateItemTime,
    updateItemNotes,
    updateItem,
    moveItemToDay,
    refresh,
  } = useTripEditor({
    tripId,
    userId: user?.id,
    onError: (error) => console.error('Trip editor error:', error),
  });

  // Expanded states
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [showTripNotes, setShowTripNotes] = useState(false);

  // Day selection state (for tab view)
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);

  // Sidebar states (desktop)
  const [showTripSettings, setShowTripSettings] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EnrichedItineraryItem | null>(null);
  const [sidebarAddDay, setSidebarAddDay] = useState<number | null>(null); // Which day is adding via sidebar

  // Weather state
  const [weatherByDate, setWeatherByDate] = useState<Record<string, DayWeather>>({});
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Drag and drop state
  const [draggedDestination, setDraggedDestination] = useState<Destination | null>(null);
  const [overDayNumber, setOverDayNumber] = useState<number | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  // DnD event handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const destination = event.active.data.current?.destination as Destination | undefined;
    if (destination) {
      setDraggedDestination(destination);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const dayNumber = event.over?.data.current?.dayNumber as number | undefined;
    setOverDayNumber(dayNumber ?? null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const destination = draggedDestination;
    const dayNumber = event.over?.data.current?.dayNumber as number | undefined;
    const insertIndex = event.over?.data.current?.insertIndex as number | undefined;
    const insertTime = event.over?.data.current?.insertTime as string | undefined;

    setDraggedDestination(null);
    setOverDayNumber(null);

    if (destination && dayNumber) {
      // Add the place with optional time hint and insert position
      // The insertIndex parameter handles positioning directly, no setTimeout needed
      addPlace(destination, dayNumber, insertTime, insertIndex);
      setSelectedDayNumber(dayNumber);
    }
  }, [draggedDestination, addPlace]);

  // Parse destinations
  const destinations = useMemo(() => parseDestinations(trip?.destination ?? null), [trip?.destination]);
  const primaryCity = destinations[0] || '';

  // Count total items
  const totalItems = useMemo(() => {
    return days.reduce((sum, day) => sum + day.items.length, 0);
  }, [days]);

  // Use optimized hotel logic hook - prevents cascading recalculations
  // when non-hotel items are added/removed/reordered
  const {
    hotels,
    nightlyHotelByDay,
    checkoutHotelByDay,
    checkInHotelByDay,
    breakfastHotelByDay,
  } = useHotelLogic(days, trip?.start_date);

  // Auto-fix items on wrong days
  const hasAutoFixed = useRef(false);
  useEffect(() => {
    if (loading || !trip?.start_date || days.length === 0 || hasAutoFixed.current) return;
    const total = days.reduce((sum, day) => sum + day.items.length, 0);
    if (total === 0) return;

    for (const day of days) {
      for (const item of day.items) {
        const dateToCheck = item.parsedNotes?.checkInDate || item.parsedNotes?.departureDate;
        if (dateToCheck) {
          const targetDay = calculateDayNumberFromDate(trip.start_date, trip.end_date, dateToCheck);
          if (targetDay !== null && targetDay !== day.dayNumber) {
            moveItemToDay(item.id, targetDay);
          }
        }
      }
    }
    hasAutoFixed.current = true;
  }, [loading, trip?.start_date, trip?.end_date, days, moveItemToDay]);

  // Fetch weather for trip dates
  useEffect(() => {
    if (!trip?.start_date || !primaryCity || weatherLoading) return;
    if (Object.keys(weatherByDate).length > 0) return; // Already fetched

    const fetchWeather = async () => {
      setWeatherLoading(true);
      try {
        // Get city coordinates (simplified - could use geocoding API)
        const geoResponse = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(primaryCity)}&count=1`
        );
        const geoData = await geoResponse.json();
        if (!geoData.results?.[0]) return;

        const { latitude, longitude } = geoData.results[0];

        // Fetch weather forecast
        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=auto&forecast_days=14`
        );
        const weatherData = await weatherResponse.json();

        if (weatherData.daily) {
          const weatherMap: Record<string, DayWeather> = {};
          const getDescription = (code: number) => {
            const codes: Record<number, string> = {
              0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
              45: 'Foggy', 51: 'Light drizzle', 61: 'Light rain', 63: 'Rain',
              65: 'Heavy rain', 71: 'Light snow', 73: 'Snow', 80: 'Rain showers',
              95: 'Thunderstorm'
            };
            return codes[code] || 'Unknown';
          };

          weatherData.daily.time.forEach((date: string, i: number) => {
            weatherMap[date] = {
              date,
              tempMax: Math.round(weatherData.daily.temperature_2m_max[i]),
              tempMin: Math.round(weatherData.daily.temperature_2m_min[i]),
              weatherCode: weatherData.daily.weather_code[i],
              description: getDescription(weatherData.daily.weather_code[i]),
              precipProbability: weatherData.daily.precipitation_probability_max[i] || 0,
            };
          });
          setWeatherByDate(weatherMap);
        }
      } catch (err) {
        console.error('Weather fetch error:', err);
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeather();
  }, [trip?.start_date, primaryCity, weatherLoading, weatherByDate]);

  // Toggle item expansion
  const toggleItem = useCallback((itemId: string) => {
    setExpandedItemId(prev => prev === itemId ? null : itemId);
  }, []);

  // Handle item selection for sidebar detail view (desktop)
  const handleSelectItem = useCallback((item: EnrichedItineraryItem) => {
    setSelectedItem(item);
    setShowTripSettings(false);
  }, []);

  // Handle trip deletion
  const handleDelete = useCallback(async () => {
    if (!user || !trip) return;
    const supabase = createClient();
    if (!supabase) return;

    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', trip.id)
      .eq('user_id', user.id);

    if (!error) {
      router.push('/trips');
    }
  }, [user, trip, router]);

  // Show loader while auth or trip is loading
  if (authLoading || loading) {
    return (
      <main className="w-full px-4 sm:px-6 pt-16 pb-24 sm:py-20 min-h-screen bg-[var(--editorial-bg)]">
        <div className="max-w-xl mx-auto"><PageLoader /></div>
      </main>
    );
  }

  // If not authenticated, the useEffect will redirect - show loader in meantime
  if (!user) {
    return (
      <main className="w-full px-4 sm:px-6 pt-16 pb-24 sm:py-20 min-h-screen bg-[var(--editorial-bg)]">
        <div className="max-w-xl mx-auto"><PageLoader /></div>
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="w-full px-4 sm:px-6 pt-16 pb-24 sm:py-20 min-h-screen bg-[var(--editorial-bg)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--editorial-text-secondary)] mb-4">Trip not found</p>
          <Link href="/trips" className="text-[var(--editorial-text-primary)] hover:opacity-70">Back to trips</Link>
        </div>
      </main>
    );
  }

  // Parse trip notes
  const tripNotes = trip.notes || '';

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
    <UndoProvider>
    <main className="w-full px-4 sm:px-6 pt-16 pb-24 sm:py-20 min-h-screen bg-[var(--editorial-bg)]">
      <div className="max-w-6xl mx-auto">
        {/* Back link */}
        <Link
          href="/trips"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Trips
        </Link>

        {/* Desktop flex layout with sidebar */}
        <div className="lg:flex lg:gap-8">
          {/* Main content column */}
          <div className="flex-1 min-w-0 max-w-xl lg:max-w-none">
            {/* Header - tap to edit */}
            <TripEditorHeader
              trip={trip}
              primaryCity={primaryCity}
              totalItems={totalItems}
              userId={user?.id}
              days={days}
              onUpdate={updateTrip}
              onDelete={handleDelete}
            />

            {/* Action bar: Local Time + Edit + Quick Actions + Settings */}
            <div className="flex items-center flex-wrap gap-y-2 mt-4 mb-4">
              <LocalTimeDisplay city={primaryCity} />

              <div className="flex items-center ml-auto">
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                    isEditMode
                      ? 'text-[var(--editorial-accent)] font-medium'
                      : 'text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)]'
                  }`}
                >
                  {isEditMode ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Done
                    </>
                  ) : (
                    <>
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </>
                  )}
                </button>

                <TripQuickActions
                  tripId={tripId}
                  tripTitle={trip.title || 'My Trip'}
                  startDate={trip.start_date}
                  endDate={trip.end_date}
                  destination={primaryCity}
                />

                <button
                  onClick={() => { setShowTripSettings(true); setSelectedItem(null); }}
                  className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Settings
                </button>
              </div>
            </div>

        {/* Trip Notes - expandable (mobile only, desktop uses sidebar) */}
        <div className="mt-4 lg:hidden">
          <button
            onClick={() => setShowTripNotes(!showTripNotes)}
            className="text-xs text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)] transition-colors"
          >
            {tripNotes ? 'View checklist' : 'Add checklist'}
            <ChevronDown className={`inline w-3 h-3 ml-1 transition-transform ${showTripNotes ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showTripNotes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <TripChecklist
                  notes={tripNotes}
                  onSave={(notes) => updateTrip({ notes })}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Trip Intelligence - Smart Warnings & Suggestions (mobile only) */}
        <div className="lg:hidden">
          <TripIntelligence
            days={days}
            city={primaryCity}
            weatherByDate={weatherByDate}
            onOptimizeRoute={(dayNumber, optimizedItems) => reorderItems(dayNumber, optimizedItems)}
          />
        </div>

        {/* Day Tabs */}
        {days.length > 0 && (
          <div className="sticky top-16 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 bg-[var(--editorial-bg)] mt-6">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {days.map((day) => {
                const isSelected = day.dayNumber === selectedDayNumber;
                const dayDate = day.date
                  ? new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : null;
                const dayWeather = day.date ? weatherByDate[day.date] : undefined;
                return (
                  <button
                    key={day.dayNumber}
                    onClick={() => setSelectedDayNumber(day.dayNumber)}
                    className={`flex-shrink-0 flex flex-col items-center px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-[var(--editorial-accent)] text-white'
                        : 'bg-[var(--editorial-bg-elevated)] text-[var(--editorial-text-secondary)] hover:bg-[var(--editorial-border-subtle)] border border-[var(--editorial-border)]'
                    }`}
                  >
                    <span>
                      {dayDate || `Day ${day.dayNumber}`}
                    </span>
                    {dayWeather && (
                      <span className={`text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-[var(--editorial-text-tertiary)]'}`}>
                        {dayWeather.tempMax}° {dayWeather.description.split(' ')[0]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected Day */}
        <div className="mt-4">
          {days.filter(day => day.dayNumber === selectedDayNumber).map((day) => {
            const dayDate = day.date;
            const weather = dayDate ? weatherByDate[dayDate] : undefined;
            const nightlyHotel = nightlyHotelByDay[day.dayNumber] || null;
            const checkoutHotel = checkoutHotelByDay[day.dayNumber] || null;
            const checkInHotel = checkInHotelByDay[day.dayNumber] || null;
            const breakfastHotel = breakfastHotelByDay[day.dayNumber] || null;
            return (
              <DaySection
                key={day.dayNumber}
                dayNumber={day.dayNumber}
                date={day.date ?? undefined}
                items={day.items}
                city={primaryCity}
                expandedItemId={expandedItemId}
                lastSavedItemId={lastSavedItemId}
                onToggleItem={toggleItem}
                onReorder={(items) => reorderItems(day.dayNumber, items)}
                isEditMode={isEditMode}
                isDropTarget={overDayNumber === day.dayNumber}
                nightlyHotel={nightlyHotel}
                checkoutHotel={checkoutHotel}
                checkInHotel={checkInHotel}
                breakfastHotel={breakfastHotel}
                onSelectItem={handleSelectItem}
                onRemove={removeItem}
                onUpdateItem={updateItem}
                onUpdateTime={updateItemTime}
                onOpenSidebarAdd={() => { setSidebarAddDay(day.dayNumber); setSelectedItem(null); }}
                onAddPlace={(dest) => addPlace(dest, day.dayNumber)}
                onAddFlight={(data) => addFlight({
                  type: 'flight',
                  airline: data.airline || '',
                  flightNumber: data.flightNumber || '',
                  from: data.from,
                  to: data.to,
                  departureDate: data.departureDate || '',
                  departureTime: data.departureTime || '',
                  arrivalDate: data.arrivalDate || '',
                  arrivalTime: data.arrivalTime || '',
                  confirmationNumber: data.confirmationNumber,
                  notes: data.notes,
                }, day.dayNumber)}
                onAddTrain={(data) => addTrain({
                  type: 'train',
                  trainLine: data.trainLine,
                  trainNumber: data.trainNumber,
                  from: data.from,
                  to: data.to,
                  departureDate: data.departureDate || '',
                  departureTime: data.departureTime || '',
                  arrivalDate: data.arrivalDate,
                  arrivalTime: data.arrivalTime,
                  confirmationNumber: data.confirmationNumber,
                  notes: data.notes,
                }, day.dayNumber)}
                onAddHotel={(data) => {
                  // Create a single hotel card with all info
                  addHotel({
                    type: 'hotel',
                    name: data.name || 'Hotel',
                    address: data.address,
                    checkInDate: day.date || '',
                    checkInTime: data.checkInTime || '16:00',
                    checkOutDate: data.checkOutDate,
                    checkOutTime: data.checkOutTime || '11:00',
                    confirmationNumber: data.confirmationNumber,
                    roomType: data.roomType,
                    breakfastIncluded: data.breakfastIncluded,
                    breakfastTime: data.breakfastIncluded ? '08:00' : undefined,
                    destination_slug: data.destination_slug,
                    image: data.image,
                    latitude: data.latitude,
                    longitude: data.longitude,
                  }, day.dayNumber);
                }}
                onAddActivity={(data) => addActivity(data, day.dayNumber)}
                weather={weather}
              />
            );
          })}
        </div>

        {/* Empty state - context-aware */}
        {totalItems === 0 && days.length > 0 && (
          <div className="text-center py-8 mt-4">
            <p className="text-sm text-[var(--editorial-text-secondary)] mb-2">
              {primaryCity
                ? `Start planning your ${primaryCity} trip`
                : 'Start planning your trip'}
            </p>
            <p className="text-xs text-[var(--editorial-text-tertiary)]">
              Tap the + button to add places, flights, or hotels
            </p>
          </div>
        )}
          </div>
          {/* End main content column */}

          {/* Desktop Sidebar */}
          <div className="hidden lg:block lg:w-80 lg:flex-shrink-0">
            <div className="sticky top-24 space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto pb-8">
              {/* Add Place Panel */}
              {sidebarAddDay !== null && (
                <AddPlacePanel
                  city={primaryCity}
                  dayNumber={sidebarAddDay}
                  onClose={() => setSidebarAddDay(null)}
                  onAddPlace={(dest) => {
                    addPlace(dest, sidebarAddDay);
                    setSidebarAddDay(null);
                  }}
                  onAddFlight={(data) => {
                    addFlight({
                      type: 'flight',
                      airline: data.airline || '',
                      flightNumber: data.flightNumber || '',
                      from: data.from,
                      to: data.to,
                      departureDate: '',
                      departureTime: data.departureTime || '',
                      arrivalDate: '',
                      arrivalTime: data.arrivalTime || '',
                      confirmationNumber: data.confirmationNumber,
                    }, sidebarAddDay);
                    setSidebarAddDay(null);
                  }}
                  onAddTrain={(data) => {
                    addTrain({
                      type: 'train',
                      trainLine: data.trainLine,
                      trainNumber: data.trainNumber,
                      from: data.from,
                      to: data.to,
                      departureDate: '',
                      departureTime: data.departureTime || '',
                      arrivalDate: '',
                      arrivalTime: data.arrivalTime,
                      confirmationNumber: data.confirmationNumber,
                    }, sidebarAddDay);
                    setSidebarAddDay(null);
                  }}
                  onAddHotel={(data) => {
                    // Get the day's date for checkInDate if not provided in form
                    const dayInfo = days.find(d => d.dayNumber === sidebarAddDay);
                    const dayDate = dayInfo?.date || '';
                    addHotel({
                      type: 'hotel',
                      name: data.name,
                      address: data.address,
                      checkInDate: data.checkInDate || dayDate,
                      checkInTime: data.checkInTime,
                      checkOutDate: data.checkOutDate,
                      checkOutTime: data.checkOutTime,
                      confirmationNumber: data.confirmationNumber,
                      destination_slug: data.destination_slug,
                      image: data.image,
                      latitude: data.latitude,
                      longitude: data.longitude,
                    }, sidebarAddDay);
                    setSidebarAddDay(null);
                  }}
                  onAddActivity={(data) => {
                    addActivity(data as ActivityData, sidebarAddDay);
                    setSidebarAddDay(null);
                  }}
                />
              )}

              {/* Selected Item Details */}
              {selectedItem && !sidebarAddDay && (
                <DestinationBox
                  item={selectedItem}
                  onClose={() => setSelectedItem(null)}
                  onTimeChange={updateItemTime}
                  onNotesChange={updateItemNotes}
                  onItemUpdate={(id, updates) => updateItem(id, updates)}
                  onRemove={removeItem}
                />
              )}

              {/* Trip Settings */}
              {showTripSettings && !sidebarAddDay && (
                <TripSettingsBox
                  trip={trip}
                  onUpdate={updateTrip}
                  onDelete={handleDelete}
                  onClose={() => setShowTripSettings(false)}
                />
              )}

              {/* Trip Intelligence */}
              {!sidebarAddDay && (
                <div className="bg-[var(--editorial-bg-elevated)] rounded-xl border border-[var(--editorial-border)] overflow-hidden">
                  <TripIntelligence
                    days={days}
                    city={primaryCity}
                    weatherByDate={weatherByDate}
                    onOptimizeRoute={(dayNumber, optimizedItems) => reorderItems(dayNumber, optimizedItems)}
                    compact
                  />
                </div>
              )}

              {/* Drag & Drop Palette */}
              {!sidebarAddDay && !selectedItem && (
                <SidebarDestinationPalette
                  city={primaryCity}
                  selectedDayNumber={selectedDayNumber}
                  onAddPlace={(dest, dayNum) => addPlace(dest, dayNum)}
                />
              )}

              {/* Checklist */}
              {!sidebarAddDay && (
                <div className="bg-[var(--editorial-bg-elevated)] rounded-xl border border-[var(--editorial-border)] p-4">
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Checklist</h3>
                  <TripChecklist
                    notes={tripNotes}
                    onSave={(notes) => updateTrip({ notes })}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        {/* End desktop flex layout */}
      </div>

      {/* Saving feedback indicator */}
      <SavingFeedback status={savingStatus} />
    </main>

    {/* Drag Overlay */}
    <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
      {draggedDestination && (
        <DragPreviewCard
          destination={draggedDestination}
          isOverTarget={overDayNumber !== null}
        />
      )}
    </DragOverlay>
    </UndoProvider>
    </DndContext>
  );
}

/**
 * Day section with items and smart search
 */
function DaySection({
  dayNumber,
  date,
  items,
  city,
  expandedItemId,
  lastSavedItemId,
  onToggleItem,
  onReorder,
  onRemove,
  onUpdateItem,
  onUpdateTime,
  onOpenSidebarAdd,
  onAddPlace,
  onAddFlight,
  onAddTrain,
  onAddHotel,
  onAddActivity,
  weather,
  isEditMode = false,
  isDropTarget = false,
  nightlyHotel,
  checkoutHotel,
  checkInHotel,
  breakfastHotel,
  onSelectItem,
}: {
  dayNumber: number;
  date?: string;
  items: EnrichedItineraryItem[];
  city: string;
  expandedItemId: string | null;
  lastSavedItemId?: string | null;
  onToggleItem: (id: string) => void;
  onReorder: (items: EnrichedItineraryItem[]) => void;
  onRemove: (id: string) => void;
  onUpdateItem: (id: string, updates: Record<string, unknown>) => void;
  onUpdateTime: (id: string, time: string) => void;
  onOpenSidebarAdd?: () => void; // Desktop: open sidebar add panel
  onAddPlace: (destination: Destination) => void;
  onAddFlight: (data: { airline?: string; flightNumber?: string; from: string; to: string; departureDate?: string; departureTime?: string; arrivalDate?: string; arrivalTime?: string; confirmationNumber?: string; notes?: string }) => void;
  onAddTrain: (data: { trainLine?: string; trainNumber?: string; from: string; to: string; departureDate?: string; departureTime?: string; arrivalDate?: string; arrivalTime?: string; duration?: string; confirmationNumber?: string; notes?: string }) => void;
  onAddHotel: (data: { name: string; address?: string; checkInDate?: string; checkInTime?: string; checkOutDate?: string; checkOutTime?: string; confirmationNumber?: string; roomType?: string; notes?: string; nights?: number; breakfastIncluded?: boolean; destination_slug?: string; image?: string; latitude?: number; longitude?: number }) => void;
  onAddActivity: (data: ActivityData) => void;
  weather?: DayWeather;
  isEditMode?: boolean;
  isDropTarget?: boolean;
  nightlyHotel?: EnrichedItineraryItem | null;
  checkoutHotel?: EnrichedItineraryItem | null;
  checkInHotel?: EnrichedItineraryItem | null;
  breakfastHotel?: EnrichedItineraryItem | null;
  onSelectItem?: (item: EnrichedItineraryItem) => void;
}) {
  // Make this day a drop target
  const { setNodeRef, isOver } = useDroppable({
    id: `day-drop-${dayNumber}`,
    data: {
      dayNumber,
      type: 'day',
    },
  });
  const showDropState = isOver || isDropTarget;

  const [orderedItems, setOrderedItems] = useState(items);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchSource, setSearchSource] = useState<'curated' | 'google'>('curated');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Destination[]>([]);
  const [googleResults, setGoogleResults] = useState<Array<{ id: string; name: string; formatted_address: string; latitude?: number; longitude?: number; category?: string; image?: string; rating?: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showTransportForm, setShowTransportForm] = useState<'flight' | 'hotel' | 'train' | 'activity' | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);

  // Activity options for quick-add
  const ACTIVITY_OPTIONS: { type: ActivityType; icon: typeof BedDouble; label: string; defaultDuration: number }[] = [
    { type: 'nap', icon: BedDouble, label: 'Nap / Rest', defaultDuration: 60 },
    { type: 'pool', icon: Waves, label: 'Pool Time', defaultDuration: 90 },
    { type: 'spa', icon: Sparkles, label: 'Spa', defaultDuration: 120 },
    { type: 'gym', icon: Dumbbell, label: 'Workout', defaultDuration: 60 },
    { type: 'breakfast-at-hotel', icon: Coffee, label: 'Hotel Breakfast', defaultDuration: 45 },
    { type: 'getting-ready', icon: Shirt, label: 'Getting Ready', defaultDuration: 45 },
    { type: 'packing', icon: Package, label: 'Packing', defaultDuration: 30 },
    { type: 'checkout-prep', icon: Package, label: 'Check-out Prep', defaultDuration: 30 },
    { type: 'free-time', icon: Clock, label: 'Free Time', defaultDuration: 60 },
    { type: 'sunset', icon: Sun, label: 'Sunset', defaultDuration: 45 },
    { type: 'work', icon: Briefcase, label: 'Work Time', defaultDuration: 120 },
    { type: 'call', icon: Phone, label: 'Call / Meeting', defaultDuration: 30 },
    { type: 'shopping-time', icon: ShoppingBag, label: 'Shopping', defaultDuration: 90 },
    { type: 'photo-walk', icon: Camera, label: 'Photo Walk', defaultDuration: 60 },
  ];
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter out hotels that are already shown as check-in/checkout cards
  const hotelCardIds = new Set([
    checkoutHotel?.id,
    checkInHotel?.id,
    breakfastHotel?.id,
  ].filter(Boolean));

  // Create virtual items for hotel activities (breakfast, checkout, checkin) with saved positions
  const hotelActivityItems = useMemo(() => {
    const activities: Array<EnrichedItineraryItem & { hotelActivityType?: 'breakfast' | 'checkout' | 'checkin'; savedPosition?: number }> = [];

    if (breakfastHotel) {
      activities.push({
        ...breakfastHotel,
        id: `breakfast-${breakfastHotel.id}`,
        hotelActivityType: 'breakfast',
        time: breakfastHotel.parsedNotes?.breakfastTime?.split('-')[0] || '08:00',
        savedPosition: breakfastHotel.parsedNotes?.breakfastPosition,
      } as EnrichedItineraryItem & { hotelActivityType: 'breakfast'; savedPosition?: number });
    }

    if (checkoutHotel) {
      activities.push({
        ...checkoutHotel,
        id: `checkout-${checkoutHotel.id}`,
        hotelActivityType: 'checkout',
        time: checkoutHotel.parsedNotes?.checkOutTime || '11:00',
        savedPosition: checkoutHotel.parsedNotes?.checkoutPosition,
      } as EnrichedItineraryItem & { hotelActivityType: 'checkout'; savedPosition?: number });
    }

    if (checkInHotel) {
      activities.push({
        ...checkInHotel,
        id: `checkin-${checkInHotel.id}`,
        hotelActivityType: 'checkin',
        time: checkInHotel.parsedNotes?.checkInTime || '15:00',
        savedPosition: checkInHotel.parsedNotes?.checkinPosition,
      } as EnrichedItineraryItem & { hotelActivityType: 'checkin'; savedPosition?: number });
    }

    return activities;
  }, [breakfastHotel, checkoutHotel, checkInHotel]);

  // Track previous state to detect changes
  const prevItemsLengthRef = useRef(items.length);
  const initializedRef = useRef(false);
  // Track the latest reorder to avoid stale closure issues
  const latestReorderRef = useRef<EnrichedItineraryItem[] | null>(null);

  useEffect(() => {
    // Filter items to exclude:
    // 1. Hotels shown as activity cards (by ID)
    // 2. Old-style checkout/breakfast hotel items (by hotelItemType)
    const filteredItems = items.filter(item => {
      if (hotelCardIds.has(item.id)) return false;
      const hotelItemType = item.parsedNotes?.hotelItemType;
      if (hotelItemType === 'checkout' || hotelItemType === 'breakfast') return false;
      return true;
    });

    const itemsChanged = items.length !== prevItemsLengthRef.current;
    prevItemsLengthRef.current = items.length;

    // Always include hotel activities in orderedItems for consistent rendering
    if (hotelActivityItems.length > 0) {
      // Only set initial order once, or when items actually change
      if (!initializedRef.current || itemsChanged) {
        initializedRef.current = true;

        // Check if any hotel activity has a saved position
        const hasSavedPositions = hotelActivityItems.some(
          (item) => (item as EnrichedItineraryItem & { savedPosition?: number }).savedPosition !== undefined
        );

        if (hasSavedPositions) {
          // Merge hotel activities into filtered items at their saved positions
          const allItems = [...filteredItems];

          // Sort hotel activities by their saved positions (ascending)
          const sortedActivities = [...hotelActivityItems].sort((a, b) => {
            const posA = (a as EnrichedItineraryItem & { savedPosition?: number }).savedPosition ?? 0;
            const posB = (b as EnrichedItineraryItem & { savedPosition?: number }).savedPosition ?? 0;
            return posA - posB;
          });

          // Insert each hotel activity at its saved position
          sortedActivities.forEach((activity) => {
            const savedPos = (activity as EnrichedItineraryItem & { savedPosition?: number }).savedPosition;
            if (savedPos !== undefined) {
              // Clamp position to valid range
              const insertAt = Math.min(savedPos, allItems.length);
              allItems.splice(insertAt, 0, activity);
            } else {
              // No saved position, add at beginning
              allItems.unshift(activity);
            }
          });

          setOrderedItems(allItems);
        } else {
          // No saved positions, put hotel activities at beginning (default)
          setOrderedItems([...hotelActivityItems, ...filteredItems]);
        }
      }
      // Otherwise preserve user's reordering
    } else {
      setOrderedItems(filteredItems);
    }
  }, [items, checkoutHotel?.id, checkInHotel?.id, breakfastHotel?.id, hotelActivityItems]);

  // Focus search input when shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Check if route could be optimized (items with coords not in optimal order)
  const canOptimize = useMemo(() => {
    if (items.length < 3) return false;
    const withCoords = items.filter(i =>
      (i.destination?.latitude && i.destination?.longitude) ||
      (i.parsedNotes?.latitude && i.parsedNotes?.longitude)
    );
    return withCoords.length >= 3;
  }, [items]);

  // Search destinations (curated or Google)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setGoogleResults([]);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (searchSource === 'curated') {
          const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `${searchQuery} ${city}` }),
          });
          if (response.ok) {
            const data = await response.json();
            setSearchResults(data.results || data.destinations || []);
            setGoogleResults([]);
          }
        } else {
          // Google Places search
          const response = await fetch('/api/google-places-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `${searchQuery} ${city}` }),
          });
          if (response.ok) {
            const data = await response.json();
            setGoogleResults(data.places || []);
            setSearchResults([]);
          }
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery, city, searchSource]);

  // Add destination (uses hook with optimistic updates)
  const addDestination = (destination: Destination) => {
    onAddPlace(destination);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  // Add transport/hotel (uses hook with optimistic updates)
  const addTransport = (type: 'flight' | 'hotel' | 'train', data: Record<string, string | boolean | number>) => {
    if (type === 'hotel') {
      onAddHotel({
        name: String(data.name) || 'Hotel',
        address: data.address ? String(data.address) : undefined,
        checkInDate: data.checkInDate ? String(data.checkInDate) : undefined,
        checkInTime: data.checkInTime ? String(data.checkInTime) : undefined,
        checkOutDate: data.checkOutDate ? String(data.checkOutDate) : undefined,
        checkOutTime: data.checkOutTime ? String(data.checkOutTime) : undefined,
        confirmationNumber: data.confirmation ? String(data.confirmation) : undefined,
        roomType: data.roomType ? String(data.roomType) : undefined,
        notes: data.notes ? String(data.notes) : undefined,
        nights: data.nights ? Number(data.nights) : 1,
        breakfastIncluded: Boolean(data.breakfastIncluded),
        destination_slug: data.destination_slug ? String(data.destination_slug) : undefined,
        image: data.image ? String(data.image) : undefined,
      });
    } else if (type === 'flight') {
      onAddFlight({
        airline: data.airline ? String(data.airline) : undefined,
        flightNumber: data.flightNumber ? String(data.flightNumber) : undefined,
        from: String(data.from),
        to: String(data.to),
        departureDate: data.departureDate ? String(data.departureDate) : undefined,
        departureTime: data.departureTime ? String(data.departureTime) : undefined,
        arrivalDate: data.arrivalDate ? String(data.arrivalDate) : undefined,
        arrivalTime: data.arrivalTime ? String(data.arrivalTime) : undefined,
        confirmationNumber: data.confirmation ? String(data.confirmation) : undefined,
        notes: data.notes ? String(data.notes) : undefined,
      });
    } else if (type === 'train') {
      onAddTrain({
        trainLine: data.trainLine ? String(data.trainLine) : undefined,
        trainNumber: data.trainNumber ? String(data.trainNumber) : undefined,
        from: String(data.from),
        to: String(data.to),
        departureDate: data.departureDate ? String(data.departureDate) : undefined,
        departureTime: data.departureTime ? String(data.departureTime) : undefined,
        arrivalDate: data.arrivalDate ? String(data.arrivalDate) : undefined,
        arrivalTime: data.arrivalTime ? String(data.arrivalTime) : undefined,
        duration: data.duration ? String(data.duration) : undefined,
        confirmationNumber: data.confirmation ? String(data.confirmation) : undefined,
        notes: data.notes ? String(data.notes) : undefined,
      });
    }

    setShowTransportForm(null);
    setShowAddMenu(false);
  };

  // Optimize route
  const optimizeRoute = async () => {
    if (!canOptimize) return;
    setIsOptimizing(true);
    try {
      const response = await fetch('/api/intelligence/route-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            id: item.id,
            title: item.title,
            latitude: item.destination?.latitude ?? item.parsedNotes?.latitude,
            longitude: item.destination?.longitude ?? item.parsedNotes?.longitude,
            time: item.time,
          })),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.optimizedOrder?.length === items.length) {
          const orderedItems = result.optimizedOrder
            .map((id: string) => items.find(item => item.id === id))
            .filter(Boolean);
          onReorder(orderedItems);
        }
      }
    } catch (err) {
      console.error('Optimize error:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleReorderComplete = useCallback(() => {
    // Use the latest reorder from ref to avoid stale closure issues
    // When onDragEnd is called, orderedItems may still have the old value due to React's batched state updates
    const currentOrder = latestReorderRef.current || orderedItems;
    latestReorderRef.current = null; // Clear the ref after use

    // Save hotel activity positions to hotel notes
    currentOrder.forEach((item, index) => {
      const hotelActivityType = (item as EnrichedItineraryItem & { hotelActivityType?: string }).hotelActivityType;
      if (hotelActivityType) {
        // Get the actual hotel ID from the virtual item ID (e.g., "checkin-abc123" -> "abc123")
        const actualHotelId = String(item.id).replace(`${hotelActivityType}-`, '');

        // Determine which position field to update based on activity type
        const positionField = hotelActivityType === 'checkin' ? 'checkinPosition'
          : hotelActivityType === 'checkout' ? 'checkoutPosition'
          : 'breakfastPosition';

        // Update the hotel item's notes with the position (updateItem expects partial ItineraryItemNotes)
        onUpdateItem(actualHotelId, {
          [positionField]: index
        });
      }
    });

    if (JSON.stringify(currentOrder.map(i => i.id)) !== JSON.stringify(items.map(i => i.id))) {
      onReorder(currentOrder);
    }
  }, [orderedItems, items, onReorder, onUpdateItem]);

  // Add Google Place to trip (convert to Destination-like object)
  const addGooglePlace = (place: { id: string; name: string; formatted_address: string; latitude?: number; longitude?: number; category?: string; image?: string }) => {
    // Create a Destination-like object from Google place data
    const destination = {
      slug: `google-${place.id}`, // Use Google place ID as slug
      name: place.name,
      city: city,
      category: place.category || 'place',
      latitude: place.latitude,
      longitude: place.longitude,
      image: place.image,
      formatted_address: place.formatted_address,
    } as Destination;

    onAddPlace(destination);
    setSearchQuery('');
    setSearchResults([]);
    setGoogleResults([]);
    setShowSearch(false);
  };

  const closeAllMenus = () => {
    setShowAddMenu(false);
    setShowSearch(false);
    setShowTransportForm(null);
    setSearchQuery('');
    setSearchResults([]);
    setGoogleResults([]);
    setSearchSource('curated');
  };

  // Parse as local time to avoid timezone shifts
  const dateDisplay = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : null;

  // Format date like "March 5th"
  const longDateDisplay = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : null;

  return (
    <div
      ref={setNodeRef}
      id={`day-${dayNumber}`}
      className={`scroll-mt-20 rounded-xl transition-all duration-200 ${
        showDropState
          ? 'bg-[var(--editorial-accent)]/10 ring-2 ring-[var(--editorial-accent)]/50 ring-inset p-3 -mx-3'
          : ''
      }`}
    >
      {/* Day header - editorial style with serif */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3
            className="text-[16px] font-normal text-[var(--editorial-text-primary)]"
            style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
          >
            Day {dayNumber}{longDateDisplay && `: ${longDateDisplay}`}
          </h3>
          {/* Weather badge - warm styling */}
          {weather && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-full">
              <WeatherIcon code={weather.weatherCode} className="w-3.5 h-3.5 text-[var(--editorial-accent)]" />
              <span className="text-xs text-[var(--editorial-text-secondary)]">
                {weather.tempMax}° {weather.description}
              </span>
            </div>
          )}
          {/* Day warnings - only shows when there's a problem */}
          <DayIntelligence
            items={items.map(item => ({
              id: item.id,
              title: item.title,
              time: item.time,
              destination: item.destination ? {
                category: item.destination.category,
                latitude: item.destination.latitude,
                longitude: item.destination.longitude,
              } : null,
              parsedNotes: item.parsedNotes ? {
                type: item.parsedNotes.type,
                category: item.parsedNotes.category,
              } : undefined,
            }))}
            weatherForecast={weather ? {
              condition: weather.description,
              precipitation: weather.precipProbability,
              tempMax: weather.tempMax,
            } : null}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Optimize prompt */}
          {canOptimize && (
            <button
              onClick={optimizeRoute}
              disabled={isOptimizing}
              className="flex items-center gap-1.5 text-xs text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)] transition-colors px-3 py-1 rounded-full hover:bg-[var(--editorial-border-subtle)]"
            >
              {isOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Route className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Optimize</span>
            </button>
          )}

          {/* Plus button */}
          <div className="relative">
            <button
              onClick={() => {
                // Desktop: use sidebar panel
                const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
                if (isDesktop && onOpenSidebarAdd) {
                  onOpenSidebarAdd();
                } else {
                  // Mobile: use inline menu
                  setShowAddMenu(!showAddMenu);
                  setShowSearch(false);
                  setShowTransportForm(null);
                }
              }}
              className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] hover:bg-[var(--editorial-border-subtle)] transition-colors"
            >
              <Plus className={`w-4 h-4 sm:w-3.5 sm:h-3.5 text-[var(--editorial-text-secondary)] transition-transform ${showAddMenu || showSearch || showTransportForm ? 'rotate-45' : ''}`} />
            </button>

            {/* Add menu dropdown (mobile only) */}
            <AnimatePresence>
              {showAddMenu && !showSearch && !showTransportForm && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  className="absolute right-0 top-full mt-1 w-44 sm:w-40 bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-2xl shadow-lg overflow-hidden z-20 lg:hidden"
                >
                  <button
                    onClick={() => { setShowSearch(true); setSearchSource('curated'); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 sm:px-3 sm:py-2 text-sm sm:text-sm text-[var(--editorial-text-primary)] hover:bg-[var(--editorial-border-subtle)] transition-colors text-left"
                  >
                    <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    From curation
                  </button>
                  <button
                    onClick={() => { setShowSearch(true); setSearchSource('google'); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 sm:px-3 sm:py-2 text-sm sm:text-sm text-[var(--editorial-text-primary)] hover:bg-[var(--editorial-border-subtle)] transition-colors text-left"
                  >
                    <Globe className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    From Google
                  </button>
                  <div className="border-t border-[var(--editorial-border)] my-1" />
                  <button
                    onClick={() => setShowTransportForm('flight')}
                    className="w-full flex items-center gap-2.5 px-4 py-3 sm:px-3 sm:py-2 text-sm sm:text-sm text-[var(--editorial-text-primary)] hover:bg-[var(--editorial-border-subtle)] transition-colors text-left"
                  >
                    <Plane className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    Flight
                  </button>
                  <button
                    onClick={() => setShowTransportForm('hotel')}
                    className="w-full flex items-center gap-2.5 px-4 py-3 sm:px-3 sm:py-2 text-sm sm:text-sm text-[var(--editorial-text-primary)] hover:bg-[var(--editorial-border-subtle)] transition-colors text-left"
                  >
                    <Hotel className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    Hotel
                  </button>
                  <button
                    onClick={() => setShowTransportForm('train')}
                    className="w-full flex items-center gap-2.5 px-4 py-3 sm:px-3 sm:py-2 text-sm sm:text-sm text-[var(--editorial-text-primary)] hover:bg-[var(--editorial-border-subtle)] transition-colors text-left"
                  >
                    <TrainIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    Train
                  </button>
                  <div className="border-t border-[var(--editorial-border)] my-1" />
                  <button
                    onClick={() => setShowTransportForm('activity')}
                    className="w-full flex items-center gap-2.5 px-4 py-3 sm:px-3 sm:py-2 text-sm sm:text-sm text-[var(--editorial-text-primary)] hover:bg-[var(--editorial-border-subtle)] transition-colors text-left"
                  >
                    <Clock className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    Activity
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Inline search panel (mobile only) */}
            <AnimatePresence>
              {showSearch && (
                <>
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={closeAllMenus}
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed inset-x-0 bottom-0 z-50 bg-[var(--editorial-bg-elevated)] border-t border-[var(--editorial-border)] rounded-t-2xl shadow-2xl p-4 pb-8 lg:hidden"
                    style={{ maxHeight: '70vh' }}
                  >
                  {/* Source toggle */}
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => { setSearchSource('curated'); setSearchQuery(''); setSearchResults([]); setGoogleResults([]); }}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                        searchSource === 'curated'
                          ? 'bg-[var(--editorial-accent)] text-white'
                          : 'bg-[var(--editorial-bg-elevated)] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Curated
                    </button>
                    <button
                      onClick={() => { setSearchSource('google'); setSearchQuery(''); setSearchResults([]); setGoogleResults([]); }}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                        searchSource === 'google'
                          ? 'bg-[var(--editorial-accent)] text-white'
                          : 'bg-[var(--editorial-bg-elevated)] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Google
                    </button>
                    <div className="flex-1" />
                    <button onClick={closeAllMenus} className="p-2 -mr-2">
                      <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 px-4 py-3 bg-[var(--editorial-bg-elevated)] rounded-xl">
                    {isSearching || isAdding ? (
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                    ) : searchSource === 'google' ? (
                      <Globe className="w-5 h-5 text-gray-400" />
                    ) : (
                      <Search className="w-5 h-5 text-gray-400" />
                    )}
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={searchSource === 'google' ? 'Search Google...' : 'Search curated places...'}
                      className="flex-1 bg-transparent text-[16px] text-[var(--editorial-text-primary)] placeholder-gray-400 outline-none"
                      autoFocus
                    />
                  </div>

                  {/* Search results */}
                  {(searchResults.length > 0 || googleResults.length > 0) && (
                    <div className="mt-3 max-h-[40vh] overflow-y-auto -mx-1">
                      {searchResults.map((destination) => (
                        <button
                          key={destination.id}
                          onClick={() => addDestination(destination)}
                          disabled={isAdding}
                          className="w-full flex items-center gap-3 px-3 py-3 hover:bg-[var(--editorial-border-subtle)] rounded-xl transition-colors text-left active:bg-gray-100 dark:active:bg-gray-700"
                        >
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-[var(--editorial-bg-elevated)] flex-shrink-0">
                            {destination.image_thumbnail || destination.image ? (
                              <Image src={destination.image_thumbnail || destination.image || ''} alt="" width={48} height={48} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--editorial-text-primary)] truncate">{destination.name}</p>
                            <p className="text-sm text-gray-400 truncate">{destination.category}</p>
                          </div>
                        </button>
                      ))}
                      {googleResults.map((place) => (
                        <button
                          key={place.id}
                          onClick={() => addGooglePlace(place)}
                          disabled={isAdding}
                          className="w-full flex items-center gap-3 px-3 py-3 hover:bg-[var(--editorial-border-subtle)] rounded-xl transition-colors text-left active:bg-gray-100 dark:active:bg-gray-700"
                        >
                          <div className="w-12 h-12 rounded-xl bg-[var(--editorial-bg-elevated)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {place.image ? (
                              <Image src={place.image} alt="" width={48} height={48} className="w-full h-full object-cover" />
                            ) : (
                              <Globe className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--editorial-text-primary)] truncate">{place.name}</p>
                            <p className="text-sm text-gray-400 truncate">{place.category || place.formatted_address}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Inline transport form (mobile only) */}
            <AnimatePresence>
              {showTransportForm && showTransportForm !== 'activity' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  className="absolute right-0 top-full mt-1 w-72 bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-2xl shadow-lg overflow-hidden z-20 p-3 lg:hidden"
                >
                  <TransportForm
                    type={showTransportForm}
                    city={city}
                    onSubmit={(data) => addTransport(showTransportForm, data)}
                    onCancel={closeAllMenus}
                    isAdding={isAdding}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Inline activity form (mobile only) */}
            <AnimatePresence>
              {showTransportForm === 'activity' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  className="absolute right-0 top-full mt-1 w-80 bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-2xl shadow-lg overflow-hidden z-20 p-3 lg:hidden"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-[var(--editorial-text-primary)]">Add activity</span>
                    <button onClick={closeAllMenus} className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Hotel activities, downtime, or personal time blocks</p>
                  <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
                    {ACTIVITY_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.type}
                          onClick={() => {
                            onAddActivity({
                              type: 'activity',
                              activityType: option.type,
                              title: option.label,
                              duration: option.defaultDuration,
                            });
                            closeAllMenus();
                          }}
                          className="flex items-center gap-2 p-2.5 rounded-lg text-left bg-[var(--editorial-bg-elevated)] hover:bg-[var(--editorial-border-subtle)] transition-colors"
                        >
                          <Icon className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-xs font-medium text-[var(--editorial-text-primary)]">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Neighborhood tags */}
      {items.length > 0 && (
        <div className="mb-3">
          <NeighborhoodTags items={items} />
        </div>
      )}

      {/* Items (including hotel activities which are now always part of orderedItems) */}
      {orderedItems.length > 0 ? (
        <Reorder.Group axis="y" values={orderedItems} onReorder={(newOrder) => {
          latestReorderRef.current = newOrder;
          setOrderedItems(newOrder);
        }} className="space-y-0">
          {/* Drop zone at the beginning */}
          <DropZoneBetweenItems
            dayNumber={dayNumber}
            insertIndex={0}
            insertTime={orderedItems[0]?.time || undefined}
          />
          {orderedItems.map((item, index) => {
            // Check if this is a virtual hotel activity item
            const hotelActivityType = (item as EnrichedItineraryItem & { hotelActivityType?: string }).hotelActivityType;
            const isHotelActivity = hotelActivityType === 'breakfast' || hotelActivityType === 'checkout' || hotelActivityType === 'checkin';

            return (
              <div key={item.id}>
                {isHotelActivity ? (
                  // Render hotel activity as a special card
                  <HotelActivityRow
                    item={item}
                    activityType={hotelActivityType}
                    isEditMode={isEditMode}
                    onSelect={onSelectItem}
                    onDragEnd={handleReorderComplete}
                  />
                ) : (
                  <ItemRow
                    item={item}
                    isExpanded={expandedItemId === item.id}
                    isEditMode={isEditMode}
                    onToggle={onToggleItem}
                    onRemove={onRemove}
                    onUpdateItem={onUpdateItem}
                    onUpdateTime={onUpdateTime}
                    onDragEnd={handleReorderComplete}
                    onSelect={onSelectItem}
                  />
                )}
                {/* Drop zone after each item */}
                <DropZoneBetweenItems
                  dayNumber={dayNumber}
                  insertIndex={index + 1}
                  insertTime={orderedItems[index + 1]?.time || undefined}
                />
                {index < orderedItems.length - 1 && (
                  <TravelTime from={item} to={orderedItems[index + 1]} />
                )}
              </div>
            );
          })}
        </Reorder.Group>
      ) : null}

      {/* Travel time to nightly hotel */}
      {nightlyHotel && orderedItems.length > 0 && (
        <TravelTime from={orderedItems[orderedItems.length - 1]} to={nightlyHotel} />
      )}

      {/* Nightly hotel indicator - Clean card matching flight style */}
      {nightlyHotel && (
        <button
          onClick={() => onSelectItem?.(nightlyHotel)}
          className="w-full mt-2 relative overflow-hidden rounded-2xl bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] hover:shadow-md transition-all text-left"
        >
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--editorial-bg-elevated)] flex items-center justify-center">
                  <Moon className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900 dark:text-white">
                    {nightlyHotel.title || 'Hotel'}
                  </p>
                  <p className="text-xs text-[var(--editorial-text-tertiary)] mt-0.5">
                    Overnight stay
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--editorial-text-tertiary)] uppercase tracking-wide">
                  Night
                </p>
              </div>
            </div>
          </div>
        </button>
      )}
    </div>
  );
}

/**
 * Transport/Hotel inline form with search
 */
function TransportForm({
  type,
  city,
  onSubmit,
  onCancel,
  isAdding,
}: {
  type: 'flight' | 'hotel' | 'train';
  city: string;
  onSubmit: (data: Record<string, string | boolean | number>) => void;
  onCancel: () => void;
  isAdding: boolean;
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [name, setName] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [checkIn, setCheckIn] = useState('16:00');
  const [checkOut, setCheckOut] = useState('11:00');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [address, setAddress] = useState('');
  const [roomType, setRoomType] = useState('');
  const [breakfast, setBreakfast] = useState('');
  const [confirmation, setConfirmation] = useState('');

  // Hotel search state
  const [hotelSearch, setHotelSearch] = useState('');
  const [searchSource, setSearchSource] = useState<'curated' | 'google'>('curated');
  const [searchResults, setSearchResults] = useState<Array<{ id: string | number; name: string; image?: string; category?: string; slug?: string; latitude?: number; longitude?: number; address?: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<{ id: string | number; name: string; image?: string; slug?: string; latitude?: number; longitude?: number; address?: string } | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Hotel search effect
  useEffect(() => {
    if (type !== 'hotel' || !hotelSearch.trim()) {
      setSearchResults([]);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (searchSource === 'curated') {
          const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `hotel ${hotelSearch} ${city}` }),
          });
          if (response.ok) {
            const data = await response.json();
            const hotels = (data.results || []).filter((d: any) =>
              d.category?.toLowerCase().includes('hotel') ||
              d.category?.toLowerCase().includes('accommodation') ||
              d.category?.toLowerCase().includes('lodging')
            );
            setSearchResults(hotels.map((h: any) => ({ id: h.id, name: h.name, image: h.image, category: h.category, slug: h.slug })));
          }
        } else {
          const response = await fetch('/api/google-places-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `hotel ${hotelSearch} ${city}` }),
          });
          if (response.ok) {
            const data = await response.json();
            setSearchResults((data.places || []).map((p: any) => ({
              id: p.id,
              name: p.name,
              image: p.image,
              category: p.category,
              latitude: p.latitude,
              longitude: p.longitude,
              address: p.formatted_address || p.address,
            })));
          }
        }
      } catch (err) {
        console.error('Hotel search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [hotelSearch, city, searchSource, type]);

  const selectHotel = (hotel: { id: string | number; name: string; image?: string; slug?: string; latitude?: number; longitude?: number; address?: string }) => {
    setSelectedHotel(hotel);
    setName(hotel.name);
    if (hotel.address) setAddress(hotel.address);
    setHotelSearch('');
    setSearchResults([]);
  };

  const handleSubmit = () => {
    if (type === 'flight') {
      onSubmit({ from, to, departureTime, arrivalTime, airline, flightNumber });
    } else if (type === 'train') {
      onSubmit({ from, to, departureTime, arrivalTime });
    } else {
      onSubmit({
        name,
        address,
        checkInDate,
        checkInTime: checkIn,
        checkOutDate,
        checkOutTime: checkOut,
        roomType,
        breakfastIncluded: breakfast === 'included',
        confirmation,
        ...(selectedHotel?.slug ? { destination_slug: selectedHotel.slug } : {}),
        ...(selectedHotel?.image ? { image: selectedHotel.image } : {}),
        ...(selectedHotel?.latitude ? { latitude: selectedHotel.latitude } : {}),
        ...(selectedHotel?.longitude ? { longitude: selectedHotel.longitude } : {}),
      });
    }
  };

  const canSubmit = type === 'hotel' ? name.trim() : (from.trim() && to.trim());

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--editorial-text-primary)] capitalize">
          Add {type}
        </span>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      {type === 'hotel' ? (
        <>
          {/* Search toggle */}
          <div className="flex items-center gap-1 mb-1">
            <button
              onClick={() => { setSearchSource('curated'); setHotelSearch(''); setSearchResults([]); }}
              className={`px-2 py-0.5 text-xs rounded-md transition-colors ${
                searchSource === 'curated'
                  ? 'bg-[var(--editorial-accent)] text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Curated
            </button>
            <button
              onClick={() => { setSearchSource('google'); setHotelSearch(''); setSearchResults([]); }}
              className={`px-2 py-0.5 text-xs rounded-md transition-colors ${
                searchSource === 'google'
                  ? 'bg-[var(--editorial-accent)] text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Google
            </button>
          </div>

          {/* Hotel search input */}
          <div className="relative">
            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg">
              {isSearching ? (
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              ) : searchSource === 'google' ? (
                <Globe className="w-4 h-4 text-gray-400" />
              ) : (
                <Search className="w-4 h-4 text-gray-400" />
              )}
              <input
                type="text"
                value={selectedHotel ? name : hotelSearch}
                onChange={(e) => {
                  if (selectedHotel) {
                    setSelectedHotel(null);
                    setName('');
                  }
                  setHotelSearch(e.target.value);
                }}
                placeholder={searchSource === 'google' ? 'Search hotels on Google...' : 'Search curated hotels...'}
                className="flex-1 bg-transparent text-sm text-[var(--editorial-text-primary)] placeholder-gray-400 outline-none"
                autoFocus
              />
              {selectedHotel && (
                <button onClick={() => { setSelectedHotel(null); setName(''); }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-2xl shadow-lg z-10 max-h-40 overflow-y-auto">
                {searchResults.map((hotel) => (
                  <button
                    key={hotel.id}
                    onClick={() => selectHotel(hotel)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--editorial-border-subtle)] text-left"
                  >
                    <div className="w-6 h-6 rounded bg-[var(--editorial-bg-elevated)] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {hotel.image ? (
                        <Image src={hotel.image} alt="" width={24} height={24} className="w-full h-full object-cover" />
                      ) : (
                        <Hotel className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--editorial-text-primary)] truncate">{hotel.name}</p>
                      {hotel.category && <p className="text-xs text-gray-400 truncate">{hotel.category}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Or manual entry */}
          {!selectedHotel && !hotelSearch && (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Or type hotel name manually"
              className="w-full px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
            />
          )}

          {/* Address */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., 1435 Brickell Ave, Miami"
              className="w-full mt-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
            />
          </div>

          {/* Check-in date/time */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-400 uppercase tracking-wide">Check-in Date</label>
              <input
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 uppercase tracking-wide">Time</label>
              <select
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
              >
                <option value="14:00">2 PM</option>
                <option value="15:00">3 PM</option>
                <option value="16:00">4 PM</option>
                <option value="17:00">5 PM</option>
                <option value="18:00">6 PM</option>
              </select>
            </div>
          </div>

          {/* Check-out date/time */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-400 uppercase tracking-wide">Check-out Date</label>
              <input
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 uppercase tracking-wide">Time</label>
              <select
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
              >
                <option value="10:00">10 AM</option>
                <option value="11:00">11 AM</option>
                <option value="12:00">12 PM</option>
              </select>
            </div>
          </div>

          {/* Room type and confirmation */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-400 uppercase tracking-wide">Room Type</label>
              <input
                type="text"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                placeholder="e.g., Ocean View Suite"
                className="w-full mt-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 uppercase tracking-wide">Confirmation #</label>
              <input
                type="text"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="Booking ref"
                className="w-full mt-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
              />
            </div>
          </div>

          {/* Breakfast checkbox */}
          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={breakfast === 'included'}
                onChange={(e) => setBreakfast(e.target.checked ? 'included' : '')}
                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
              />
              <span className="text-xs text-[var(--editorial-text-secondary)]">Breakfast included</span>
            </label>
          </div>
        </>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="From (e.g. LHR)"
              className="flex-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
              autoFocus
            />
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="To (e.g. CDG)"
              className="flex-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
            />
          </div>
          {type === 'flight' && (
            <div className="flex gap-2">
              <input
                type="text"
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                placeholder="Airline (e.g. BA)"
                className="flex-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
              />
              <input
                type="text"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                placeholder="Flight # (e.g. 123)"
                className="flex-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
              />
            </div>
          )}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-400 uppercase tracking-wide">Departure</label>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 uppercase tracking-wide">Arrival</label>
              <input
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
              />
            </div>
          </div>
        </>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || isAdding}
        className="w-full py-2 text-sm font-medium text-white bg-[var(--editorial-accent)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {isAdding ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Add ${type}`}
      </button>
    </div>
  );
}

/**
 * Hotel activity row - for breakfast, checkout, checkin items (draggable in edit mode)
 */
const HotelActivityRow = memo(function HotelActivityRow({
  item,
  activityType,
  isEditMode,
  onSelect,
  onDragEnd,
}: {
  item: EnrichedItineraryItem;
  activityType: 'breakfast' | 'checkout' | 'checkin';
  isEditMode?: boolean;
  onSelect?: (item: EnrichedItineraryItem) => void;
  onDragEnd?: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState(false);

  const image = item.destination?.image_thumbnail || item.destination?.image || item.parsedNotes?.image;
  const hotelName = item.title || 'Hotel';

  // Get styling based on activity type
  const getActivityStyle = () => {
    switch (activityType) {
      case 'checkin':
        return {
          icon: <DoorOpen className="w-4 h-4" />,
          label: 'CHECK-IN',
          time: item.parsedNotes?.checkInTime ? formatTime(item.parsedNotes.checkInTime) : '',
        };
      case 'breakfast':
        return {
          icon: <Coffee className="w-4 h-4" />,
          label: 'BREAKFAST',
          time: item.parsedNotes?.breakfastTime || '7:00–10:00',
        };
      case 'checkout':
        return {
          icon: <LogOut className="w-4 h-4" />,
          label: 'CHECK-OUT',
          time: item.parsedNotes?.checkOutTime ? formatTime(item.parsedNotes.checkOutTime) : '',
        };
    }
  };

  const style = getActivityStyle();

  return (
    <Reorder.Item
      value={item}
      id={item.id}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => { setIsDragging(false); onDragEnd?.(); }}
      dragListener={isEditMode}
      className={`${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'z-50' : ''}`}
    >
      <div
        onClick={() => onSelect?.(item)}
        className={`
          relative overflow-hidden rounded-2xl cursor-pointer transition-all
          bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)]
          ${isDragging ? 'shadow-xl ring-2 ring-stone-400 dark:ring-gray-500' : 'hover:shadow-md'}
        `}
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div className="w-9 h-9 rounded-xl bg-[var(--editorial-bg-elevated)] flex items-center justify-center">
                <span className="text-[var(--editorial-text-tertiary)]">{style.icon}</span>
              </div>

              {/* Hotel info */}
              <div>
                <p className="text-sm font-semibold text-stone-900 dark:text-white">
                  {hotelName}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.parsedNotes?.roomType && activityType === 'checkin' && (
                    <span className="text-xs text-[var(--editorial-text-tertiary)]">
                      {item.parsedNotes.roomType}
                    </span>
                  )}
                  {activityType === 'breakfast' && item.parsedNotes?.breakfastIncluded && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <Check className="w-3 h-3" />
                      Included
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Time */}
            <div className="text-right">
              <p className="text-sm font-semibold text-stone-900 dark:text-white">
                {style.time}
              </p>
              <p className="text-xs text-[var(--editorial-text-tertiary)] uppercase tracking-wide">
                {style.label}
              </p>
            </div>
          </div>
        </div>

        {/* Edit mode drag handle indicator */}
        {isEditMode && (
          <div className="absolute top-2 left-2 opacity-60">
            <GripVertical className="w-4 h-4 text-stone-400" />
          </div>
        )}
      </div>
    </Reorder.Item>
  );
});

/**
 * Item row - with inline times and edit button
 */
const ItemRow = memo(function ItemRow({
  item,
  isExpanded,
  isEditMode,
  onToggle,
  onRemove,
  onUpdateItem,
  onUpdateTime,
  onDragEnd,
  onSelect,
}: {
  item: EnrichedItineraryItem;
  isExpanded: boolean;
  isEditMode?: boolean;
  onToggle: (id: string) => void;
  onRemove?: (id: string) => void;
  onUpdateItem: (id: string, updates: Record<string, unknown>) => void;
  onUpdateTime: (id: string, time: string) => void;
  onDragEnd: () => void;
  onSelect?: (item: EnrichedItineraryItem) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const itemType = item.parsedNotes?.type || 'place';

  // Build inline display with all relevant times
  const getItemDisplay = () => {
    if (itemType === 'flight') {
      const from = item.parsedNotes?.from || '?';
      const to = item.parsedNotes?.to || '?';
      const depTime = item.parsedNotes?.departureTime;
      const arrTime = item.parsedNotes?.arrivalTime;
      const airline = [item.parsedNotes?.airline, item.parsedNotes?.flightNumber].filter(Boolean).join(' ');
      const terminal = item.parsedNotes?.terminal;
      const gate = item.parsedNotes?.gate;
      const seat = item.parsedNotes?.seatNumber;
      const confirmation = item.parsedNotes?.confirmationNumber;

      // Inline times: "10:30 dep → 14:45 arr"
      const timeDisplay = [
        depTime && `${formatTime(depTime)} dep`,
        arrTime && `${formatTime(arrTime)} arr`
      ].filter(Boolean).join(' → ');

      // Extra info line
      const extraInfo = [
        terminal && `T${terminal}`,
        gate && `Gate ${gate}`,
        seat && `Seat ${seat}`
      ].filter(Boolean).join(' · ');

      return {
        iconType: 'flight' as const,
        title: `${from} → ${to}`,
        inlineTimes: timeDisplay,
        subtitle: airline || undefined,
        extraInfo: extraInfo || undefined,
        confirmation
      };
    }

    if (itemType === 'hotel') {
      const hotelItemType = item.parsedNotes?.hotelItemType;
      const checkIn = item.parsedNotes?.checkInTime;
      const checkOut = item.parsedNotes?.checkOutTime;
      const breakfast = item.parsedNotes?.breakfastTime;
      const address = item.parsedNotes?.address || item.destination?.formatted_address;
      const confirmation = item.parsedNotes?.hotelConfirmation || item.parsedNotes?.confirmationNumber;

      // Calculate nights (parse as local time to avoid timezone shifts)
      const checkInDate = item.parsedNotes?.checkInDate;
      const checkOutDate = item.parsedNotes?.checkOutDate;
      let nights: number | null = null;
      if (checkInDate && checkOutDate) {
        const start = new Date(checkInDate + 'T00:00:00');
        const end = new Date(checkOutDate + 'T00:00:00');
        nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Handle specific hotel activity types
      if (hotelItemType === 'check_in') {
        return {
          iconType: 'checkin' as const,
          title: `Check in · ${item.title || 'Hotel'}`,
          inlineTimes: checkIn ? formatTime(checkIn) : undefined,
          subtitle: address ? address.split(',')[0] : undefined,
          confirmation
        };
      }

      if (hotelItemType === 'checkout') {
        return {
          iconType: 'checkout' as const,
          title: `Check out · ${item.title || 'Hotel'}`,
          inlineTimes: checkOut ? formatTime(checkOut) : undefined,
          subtitle: address ? address.split(',')[0] : undefined,
          confirmation
        };
      }

      if (hotelItemType === 'breakfast') {
        return {
          iconType: 'breakfast' as const,
          title: `Breakfast · ${item.title || 'Hotel'}`,
          inlineTimes: breakfast || undefined,
          subtitle: undefined
        };
      }

      // Default hotel card (overnight stay)
      const times = [
        checkIn && `check-in ${formatTime(checkIn)}`,
        checkOut && `checkout ${formatTime(checkOut)}`,
        breakfast && `breakfast ${breakfast}`
      ].filter(Boolean).join(' · ');

      return {
        iconType: 'hotel' as const,
        title: item.title || 'Hotel',
        inlineTimes: times || undefined,
        subtitle: address ? address.split(',')[0] : undefined,
        nights,
        confirmation
      };
    }

    if (itemType === 'train') {
      const from = item.parsedNotes?.from || '?';
      const to = item.parsedNotes?.to || '?';
      const depTime = item.parsedNotes?.departureTime;
      const arrTime = item.parsedNotes?.arrivalTime;
      const trainLine = item.parsedNotes?.trainLine;
      const trainNumber = item.parsedNotes?.trainNumber;
      const confirmation = item.parsedNotes?.confirmationNumber;

      const timeDisplay = [
        depTime && `${formatTime(depTime)} dep`,
        arrTime && `${formatTime(arrTime)} arr`
      ].filter(Boolean).join(' → ');

      const trainInfo = [trainLine, trainNumber].filter(Boolean).join(' ');

      return {
        iconType: 'train' as const,
        title: `${from} → ${to}`,
        inlineTimes: timeDisplay,
        subtitle: trainInfo || undefined,
        confirmation
      };
    }

    if (itemType === 'activity') {
      const activityType = item.parsedNotes?.activityType || 'free-time';
      const duration = item.parsedNotes?.duration;
      const time = item.time ? formatTime(item.time) : '';

      const durationDisplay = duration ? `${Math.round(duration / 60)}h ${duration % 60}m` : '';
      const timeDisplay = [time, durationDisplay].filter(Boolean).join(' · ');

      return {
        iconType: 'activity' as const,
        activityType,
        title: item.title || 'Activity',
        inlineTimes: timeDisplay || undefined,
        subtitle: undefined
      };
    }

    // Regular place
    const time = item.time ? formatTime(item.time) : '';
    const duration = item.parsedNotes?.duration;
    const category = item.destination?.category || item.parsedNotes?.category || '';
    const neighborhood = item.destination?.neighborhood;
    const rating = item.destination?.rating;

    // Build time display with duration
    const timeWithDuration = [
      time,
      duration && `${duration}h`
    ].filter(Boolean).join(' · ');

    // Location info
    const locationInfo = [neighborhood, category].filter(Boolean).join(' · ');

    return {
      iconType: 'place' as const,
      title: item.title || item.destination?.name || 'Place',
      inlineTimes: timeWithDuration || undefined,
      subtitle: locationInfo || undefined,
      rating
    };
  };

  const { iconType, title, inlineTimes, subtitle, ...extraData } = getItemDisplay();
  const image = item.destination?.image_thumbnail || item.destination?.image || item.parsedNotes?.image;
  const destination = item.destination;

  // Extra display data
  const extraInfo = (extraData as any).extraInfo;
  const confirmation = (extraData as any).confirmation;
  const nights = (extraData as any).nights;
  const rating = (extraData as any).rating;

  // Quick actions data
  const phone = item.parsedNotes?.phone;
  const website = item.parsedNotes?.website || destination?.website;
  const hasLocation = (destination?.latitude && destination?.longitude) ||
                      (item.parsedNotes?.latitude && item.parsedNotes?.longitude);

  // Close actions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setShowActions(false);
      }
    };
    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showActions]);

  // Parse airport code helper for flights
  const parseAirportCode = (value?: string) => {
    if (!value) return '---';
    const parts = value.split(/[-–—]/);
    return parts[0]?.trim().toUpperCase().slice(0, 3) || '---';
  };

  // Special premium flight card rendering
  if (itemType === 'flight') {
    const notes = item.parsedNotes;
    const originCode = parseAirportCode(notes?.from);
    const destCode = parseAirportCode(notes?.to);
    const airline = notes?.airline || '';
    const flightNum = notes?.flightNumber || '';
    const depTime = notes?.departureTime;
    const arrTime = notes?.arrivalTime;
    const terminal = notes?.terminal;
    const gate = notes?.gate;
    const seat = notes?.seatNumber;
    const flightConfirmation = notes?.confirmationNumber;

    return (
      <Reorder.Item
        value={item}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => { setIsDragging(false); onDragEnd(); }}
        className={`${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'z-10' : ''}`}
        dragListener={isEditMode}
      >
        <div
          className={`
            relative rounded-2xl overflow-hidden transition-all cursor-pointer
            bg-stone-50 dark:bg-gray-800/60
            ring-1 ring-stone-200/60 dark:ring-gray-700/50
            hover:ring-stone-300 dark:hover:ring-gray-600
            ${isDragging ? 'shadow-xl ring-2 ring-stone-400 dark:ring-gray-500' : ''}
          `}
          onClick={() => {
            const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
            if (isDesktop && onSelect) {
              onSelect(item);
            } else {
              onToggle(item.id);
            }
          }}
        >
          {/* Main Card Content */}
          <div className="p-4">
            {/* Header Row: Route + Status */}
            <div className="flex items-start justify-between mb-3">
              {/* Large Route Display */}
              <div className="flex items-center gap-2">
                <div className="text-center">
                  <p className="text-xl font-semibold tracking-tight text-stone-900 dark:text-white font-mono">
                    {originCode}
                  </p>
                </div>

                {/* Flight Path */}
                <div className="flex items-center gap-1 px-1.5">
                  <div className="w-1 h-1 rounded-full bg-stone-300 dark:bg-gray-600" />
                  <div className="w-8 h-px bg-stone-300 dark:bg-gray-600 relative">
                    <Plane className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 dark:text-gray-500" />
                  </div>
                  <div className="w-1 h-1 rounded-full bg-stone-300 dark:bg-gray-600" />
                </div>

                <div className="text-center">
                  <p className="text-xl font-semibold tracking-tight text-stone-900 dark:text-white font-mono">
                    {destCode}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                Confirmed
              </div>
            </div>

            {/* Dotted Perforation Line */}
            <div className="relative my-3">
              <div className="w-full border-t border-dashed border-stone-200 dark:border-gray-700" />
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-2 h-4 bg-[var(--editorial-bg-elevated)] rounded-r-full" />
              <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-2 h-4 bg-[var(--editorial-bg-elevated)] rounded-l-full" />
            </div>

            {/* Time Row */}
            <div className="flex items-center justify-between">
              {/* Departure */}
              <div>
                <p className="text-[9px] uppercase tracking-wider text-stone-400 dark:text-gray-500">Depart</p>
                <p className="text-base font-semibold text-stone-900 dark:text-white font-mono tabular-nums">
                  {depTime ? formatTime(depTime) : '--:--'}
                </p>
              </div>

              {/* Nonstop indicator */}
              <div className="text-center">
                <p className="text-[9px] text-stone-400 dark:text-gray-500">Nonstop</p>
              </div>

              {/* Arrival */}
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wider text-stone-400 dark:text-gray-500">Arrive</p>
                <p className="text-base font-semibold text-stone-900 dark:text-white font-mono tabular-nums">
                  {arrTime ? formatTime(arrTime) : '--:--'}
                </p>
              </div>
            </div>

            {/* Flight Identity Row */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-100 dark:border-gray-700/50">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-stone-600 dark:text-gray-400">
                  {airline}
                </p>
                {flightNum && (
                  <p className="text-xs text-stone-400 dark:text-gray-500 font-mono">
                    {flightNum}
                  </p>
                )}
              </div>

              {/* Terminal/Gate/Seat */}
              <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-gray-500 font-mono">
                {terminal && <span>T{terminal}</span>}
                {gate && <span>Gate {gate}</span>}
                {seat && <span>{seat}</span>}
              </div>
            </div>
          </div>

          {/* Edit mode drag handle indicator */}
          {isEditMode && (
            <div className="absolute top-2 left-2 opacity-60">
              <GripVertical className="w-4 h-4 text-stone-400" />
            </div>
          )}
        </div>

        {/* Expanded details (mobile) */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden lg:hidden"
            >
              <ItemDetails
                item={item}
                itemType={itemType}
                onUpdateItem={onUpdateItem}
                onUpdateTime={onUpdateTime}
                onClose={() => onToggle(item.id)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Reorder.Item>
    );
  }

  return (
    <Reorder.Item
      value={item}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => { setIsDragging(false); onDragEnd(); }}
      className={`${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'z-10' : ''}`}
      dragListener={isEditMode}
    >
      <div
        className={`
          relative rounded-2xl overflow-hidden transition-all cursor-pointer
          bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)]
          ${isDragging ? 'shadow-xl ring-2 ring-stone-400 dark:ring-gray-500' : 'hover:shadow-md'}
        `}
        onClick={() => {
          const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
          if (isDesktop && onSelect) {
              onSelect(item);
          } else {
              onToggle(item.id);
          }
        }}
      >
        <div className="p-4">
          <div className="flex items-center gap-3">
            {/* Drag handle - only visible in edit mode */}
            {isEditMode && (
              <div className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing">
                <GripVertical className="w-4 h-4 text-gray-400 opacity-60" />
              </div>
            )}

            {/* Icon */}
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-[var(--editorial-bg-elevated)] flex-shrink-0 flex items-center justify-center">
              {iconType === 'hotel' ? (
                <Hotel className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />
              ) : iconType === 'checkin' ? (
                <DoorOpen className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />
              ) : iconType === 'checkout' ? (
                <LogOut className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />
              ) : iconType === 'breakfast' ? (
                <UtensilsCrossed className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />
              ) : iconType === 'train' ? (
                <TrainIcon className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />
              ) : iconType === 'activity' ? (
                (() => {
                  const aType = (extraData as any).activityType;
                  switch (aType) {
                    case 'nap': return <BedDouble className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />;
                    case 'pool': return <Waves className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />;
                    case 'spa': return <Sparkles className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />;
                    case 'gym': return <Dumbbell className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />;
                    case 'breakfast-at-hotel': return <Coffee className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />;
                    case 'getting-ready': return <Shirt className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />;
                    case 'packing': case 'checkout-prep': return <Package className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />;
                    case 'sunset': return <Sun className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />;
                    case 'work': return <Briefcase className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />;
                    case 'call': return <Phone className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />;
                    case 'shopping-time': return <ShoppingBag className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />;
                    case 'photo-walk': return <Camera className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />;
                    default: return <Clock className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />;
                  }
                })()
              ) : image && !imageError ? (
                <Image
                  src={image}
                  alt=""
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <MapPin className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-900 dark:text-white truncate">{title}</p>
              <p className="text-xs text-[var(--editorial-text-tertiary)] truncate">
                {subtitle || (item.destination?.category) || 'Place'}
              </p>
            </div>

            {/* Rating badge */}
            {rating && (
              <div className="flex items-center gap-0.5 mr-2">
                <span className="text-xs text-red-500">●</span>
              </div>
            )}

            {/* More options button */}
            <div className="relative" ref={actionsRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowActions(!showActions);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <MoreHorizontal className="w-5 h-5 text-gray-400" />
              </button>

              {/* Actions dropdown */}
              <AnimatePresence>
                {showActions && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1 z-50 bg-[var(--editorial-bg-elevated)] rounded-2xl shadow-lg border border-[var(--editorial-border)] overflow-hidden min-w-[140px]"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowActions(false);
                        onToggle(item.id);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--editorial-text-primary)] hover:bg-[var(--editorial-border-subtle)] transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                    {onRemove && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowActions(false);
                          onRemove(item.id);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Edit mode drag handle indicator */}
        {isEditMode && (
          <div className="absolute top-2 left-2 opacity-60">
            <GripVertical className="w-4 h-4 text-stone-400" />
          </div>
        )}
      </div>

      {/* Expanded edit form - mobile only (desktop uses sidebar) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden lg:hidden"
          >
            <ItemDetails
              item={item}
              itemType={itemType}
              onUpdateItem={onUpdateItem}
              onUpdateTime={onUpdateTime}
              onRemove={onRemove ? () => onRemove(item.id) : undefined}
              onClose={() => onToggle(item.id)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
});

/**
 * Item details - minimal inline edit form for mobile
 */
function ItemDetails({
  item,
  itemType,
  onUpdateItem,
  onUpdateTime,
  onRemove,
  onClose,
}: {
  item: EnrichedItineraryItem;
  itemType: string;
  onUpdateItem: (id: string, updates: Record<string, unknown>) => void;
  onUpdateTime: (id: string, time: string) => void;
  onRemove?: () => void;
  onClose: () => void;
}) {
  // Core fields
  const [time, setTime] = useState(item.time || '');
  const [notes, setNotes] = useState(item.parsedNotes?.notes || '');
  const [confirmationNumber, setConfirmationNumber] = useState(
    item.parsedNotes?.confirmationNumber || item.parsedNotes?.hotelConfirmation || ''
  );

  // Flight/Train fields
  const [departureTime, setDepartureTime] = useState(item.parsedNotes?.departureTime || '');
  const [arrivalTime, setArrivalTime] = useState(item.parsedNotes?.arrivalTime || '');

  // Hotel fields
  const [checkInTime, setCheckInTime] = useState(item.parsedNotes?.checkInTime || '');
  const [checkOutTime, setCheckOutTime] = useState(item.parsedNotes?.checkOutTime || '');

  const handleSave = () => {
    const updates: Record<string, unknown> = {};

    if (itemType === 'hotel') {
      if (checkInTime !== (item.parsedNotes?.checkInTime || '')) updates.checkInTime = checkInTime;
      if (checkOutTime !== (item.parsedNotes?.checkOutTime || '')) updates.checkOutTime = checkOutTime;
      if (confirmationNumber !== (item.parsedNotes?.confirmationNumber || item.parsedNotes?.hotelConfirmation || '')) {
        updates.confirmationNumber = confirmationNumber;
        updates.hotelConfirmation = confirmationNumber;
      }
    } else if (itemType === 'flight' || itemType === 'train') {
      if (departureTime !== (item.parsedNotes?.departureTime || '')) updates.departureTime = departureTime;
      if (arrivalTime !== (item.parsedNotes?.arrivalTime || '')) updates.arrivalTime = arrivalTime;
      if (confirmationNumber !== (item.parsedNotes?.confirmationNumber || '')) updates.confirmationNumber = confirmationNumber;
    } else {
      if (time !== item.time) onUpdateTime(item.id, time);
    }

    if (notes !== (item.parsedNotes?.notes || '')) updates.notes = notes;

    if (Object.keys(updates).length > 0) {
      onUpdateItem(item.id, updates);
    }
    onClose();
  };

  return (
    <div className="px-3 pb-3 pt-2 space-y-3 border-t border-[var(--editorial-border)] mt-2">
      {/* Hotel: check-in/out times */}
      {itemType === 'hotel' && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Check-in</label>
            <input
              type="time"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border-0 rounded-lg"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Check-out</label>
            <input
              type="time"
              value={checkOutTime}
              onChange={(e) => setCheckOutTime(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border-0 rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Flight/Train: departure/arrival times */}
      {(itemType === 'flight' || itemType === 'train') && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Departs</label>
            <input
              type="time"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border-0 rounded-lg"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Arrives</label>
            <input
              type="time"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border-0 rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Place: scheduled time */}
      {itemType !== 'hotel' && itemType !== 'flight' && itemType !== 'train' && (
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Time</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border-0 rounded-lg"
          />
        </div>
      )}

      {/* Confirmation # for bookable items */}
      {(itemType === 'hotel' || itemType === 'flight' || itemType === 'train') && (
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Confirmation #</label>
          <input
            type="text"
            value={confirmationNumber}
            onChange={(e) => setConfirmationNumber(e.target.value)}
            placeholder="Booking reference"
            className="w-full px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border-0 rounded-lg font-mono"
          />
        </div>
      )}

      {/* Notes - always show */}
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a note..."
          rows={2}
          className="w-full px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border-0 rounded-lg resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        {onRemove ? (
          <button
            onClick={onRemove}
            className="text-xs text-red-500 hover:text-red-600 font-medium"
          >
            Remove
          </button>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-md"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Travel time between items - shows spare time, travel info, and suggestions
 */
const TravelTime = memo(function TravelTime({
  from,
  to,
  onUpdateTravelMode,
}: {
  from: EnrichedItineraryItem;
  to: EnrichedItineraryItem;
  onUpdateTravelMode?: (itemId: string, mode: 'walking' | 'driving' | 'transit') => void;
}) {
  const [mode, setMode] = useState<'walking' | 'driving' | 'transit'>(
    (from.parsedNotes?.travelModeToNext as 'walking' | 'driving' | 'transit') || 'driving'
  );

  // Check item types for special labels
  const fromType = from.parsedNotes?.type;
  const toType = to.parsedNotes?.type;

  // Get coordinates - check for airport/station coordinates for flights/trains
  let fromLat = from.destination?.latitude || from.parsedNotes?.latitude;
  let fromLng = from.destination?.longitude || from.parsedNotes?.longitude;
  let toLat = to.destination?.latitude || to.parsedNotes?.latitude;
  let toLng = to.destination?.longitude || to.parsedNotes?.longitude;

  // For flights/trains, use destination airport/station coordinates
  if (fromType === 'flight' && !fromLat && from.parsedNotes?.to) {
    const airportCoords = getAirportCoordinates(from.parsedNotes.to);
    if (airportCoords) {
      fromLat = airportCoords.latitude;
      fromLng = airportCoords.longitude;
    }
  }
  if (toType === 'flight' && !toLat && to.parsedNotes?.from) {
    const airportCoords = getAirportCoordinates(to.parsedNotes.from);
    if (airportCoords) {
      toLat = airportCoords.latitude;
      toLng = airportCoords.longitude;
    }
  }

  // Calculate distance (Haversine)
  let distanceKm = 0;
  if (fromLat && fromLng && toLat && toLng) {
    const R = 6371;
    const dLat = (toLat - fromLat) * Math.PI / 180;
    const dLng = (toLng - fromLng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(fromLat * Math.PI / 180) * Math.cos(toLat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    distanceKm = R * c;
  }

  // Estimate travel time based on mode
  // Walking: ~5 km/h, Driving: ~30 km/h, Subway: ~20 km/h (excludes bus)
  const getTravelMinutes = (): number | null => {
    if (distanceKm === 0) return null; // No valid coordinates
    switch (mode) {
      case 'walking': return Math.round(distanceKm * 12); // 12 min/km = 5 km/h
      case 'driving': return Math.round(distanceKm * 2);  // 2 min/km = 30 km/h
      case 'transit': return Math.round(distanceKm * 3);  // 3 min/km = 20 km/h (subway)
      default: return Math.round(distanceKm * 12);
    }
  };

  const travelMinutes = getTravelMinutes();

  // Cycle through modes
  const cycleMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const modes: Array<'walking' | 'driving' | 'transit'> = ['walking', 'driving', 'transit'];
    const currentIndex = modes.indexOf(mode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setMode(nextMode);
    onUpdateTravelMode?.(from.id, nextMode);
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'walking': return <Footprints className="w-3 h-3" />;
      case 'driving': return <Car className="w-3 h-3" />;
      case 'transit': return <TrainIcon className="w-3 h-3" />; // Metro/subway, not bus
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'walking': return 'walk';
      case 'driving': return 'drive';
      case 'transit': return 'subway'; // Display as subway/train, not bus
    }
  };

  // Get destination name
  const toName = to.title || to.destination?.name || 'next stop';

  // Determine special label based on from/to types
  const getSpecialLabel = () => {
    if (fromType === 'flight') return 'from airport';
    if (fromType === 'train') return 'from station';
    if (toType === 'flight') return 'to airport';
    if (toType === 'train') return 'to station';
    return null;
  };
  const specialLabel = getSpecialLabel();

  // Format duration nicely
  const formatDuration = (mins: number | null): string => {
    if (mins === null) return ''; // No coordinates available
    if (mins <= 0) return '<1 min';
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const duration = formatDuration(travelMinutes);
  const hasCoordinates = travelMinutes !== null;

  // Hide travel time if no coordinates available
  if (!hasCoordinates) {
    return null;
  }

  // Format distance
  const formatDistance = (km: number): string => {
    if (km < 1) {
      const meters = Math.round(km * 1000);
      return `${meters}m`;
    }
    const miles = km * 0.621371;
    if (miles < 10) {
      return `${miles.toFixed(1)} mi`;
    }
    return `${Math.round(miles)} mi`;
  };

  const distanceDisplay = distanceKm > 0 ? formatDistance(distanceKm) : '';

  return (
    <div className="flex items-center gap-3 py-2 pl-3">
      {/* Vertical connector line with dot */}
      <div className="w-6 flex flex-col items-center">
        <div className="w-px h-2 bg-[var(--editorial-border)]" />
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--editorial-border)]" />
        <div className="w-px h-2 bg-[var(--editorial-border)]" />
      </div>

      {/* Travel info */}
      <button
        onClick={cycleMode}
        className="flex items-center gap-2 px-2.5 py-1 text-xs text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)] hover:bg-[var(--editorial-border-subtle)] rounded-md transition-all"
        title={`${duration} by ${getModeLabel()} - click to change mode`}
      >
        <span className="p-1 bg-[var(--editorial-bg-elevated)] rounded-md">
          {getModeIcon()}
        </span>
        <span className="font-medium tabular-nums">{duration}</span>
        {distanceDisplay && (
          <span className="text-[var(--editorial-text-tertiary)]">({distanceDisplay})</span>
        )}
        {specialLabel && (
          <span className="text-[var(--editorial-accent)]">{specialLabel}</span>
        )}
      </button>
    </div>
  );
});

// Keep WalkingTime as alias for backwards compatibility
function WalkingTime({ from, to }: { from: EnrichedItineraryItem; to: EnrichedItineraryItem }) {
  return <TravelTime from={from} to={to} />;
}

function formatTime(time: string): string {
  try {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return time;
  }
}

/**
 * Item image with fallback on error
 */
function ItemImage({ src }: { src: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="w-6 h-6 rounded bg-[var(--editorial-bg-elevated)] flex items-center justify-center flex-shrink-0">
        <MapPin className="w-3 h-3 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0">
      <Image
        src={src}
        alt=""
        width={24}
        height={24}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

/**
 * Weather icon based on weather code
 */
function WeatherIcon({ code, className = '' }: { code: number; className?: string }) {
  // Weather code to icon mapping
  if (code === 0) return <Sun className={`text-amber-400 ${className}`} />;
  if (code <= 2) return <CloudSun className={`text-amber-300 ${className}`} />;
  if (code === 3) return <Cloud className={`text-gray-400 ${className}`} />;
  if (code >= 45 && code <= 48) return <Cloud className={`text-gray-400 ${className}`} />; // Fog
  if (code >= 51 && code <= 67) return <CloudRain className={`text-blue-400 ${className}`} />; // Rain
  if (code >= 71 && code <= 77) return <Cloud className={`text-blue-200 ${className}`} />; // Snow
  if (code >= 80 && code <= 82) return <CloudRain className={`text-blue-500 ${className}`} />; // Showers
  if (code >= 95) return <CloudRain className={`text-purple-400 ${className}`} />; // Thunderstorm
  return <Sun className={`text-gray-400 ${className}`} />;
}


/**
 * Gap suggestion - shows between items when there's a time gap
 */
function GapSuggestion({
  fromItem,
  toItem,
  city,
  onAddPlace,
}: {
  fromItem: EnrichedItineraryItem;
  toItem: EnrichedItineraryItem;
  city: string;
  onAddPlace: (destination: Destination, time?: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ id: number; slug: string; name: string; category: string; image?: string; reason?: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const fromTime = fromItem.time || fromItem.parsedNotes?.departureTime || fromItem.parsedNotes?.checkOutTime;
  const toTime = toItem.time || toItem.parsedNotes?.departureTime || toItem.parsedNotes?.checkInTime;
  const fromDuration = fromItem.parsedNotes?.duration || 1.5;

  if (!fromTime || !toTime) return null;

  // Calculate gap in minutes
  const [fromH, fromM] = fromTime.split(':').map(Number);
  const [toH, toM] = toTime.split(':').map(Number);
  const fromMins = fromH * 60 + fromM + (parseFloat(String(fromDuration)) * 60);
  const toMins = toH * 60 + toM;
  const gapMins = toMins - fromMins;

  // Only show suggestion for gaps > 1.5 hours
  if (gapMins < 90) return null;

  // Suggest category based on time of day
  const midTime = fromMins + gapMins / 2;
  const hour = Math.floor(midTime / 60);

  const getSuggestionType = () => {
    if (hour >= 7 && hour < 10) return { category: 'Cafe', label: 'Coffee?' };
    if (hour >= 11 && hour < 14) return { category: 'Restaurant', label: 'Lunch?' };
    if (hour >= 14 && hour < 17) return { category: 'Culture', label: 'Explore?' };
    if (hour >= 18 && hour < 21) return { category: 'Restaurant', label: 'Dinner?' };
    if (hour >= 21) return { category: 'Bar', label: 'Drinks?' };
    return null;
  };

  const suggestionType = getSuggestionType();
  if (!suggestionType) return null;

  // Fetch AI-powered suggestions when expanded
  const fetchSuggestions = async () => {
    if (suggestions.length > 0 || isLoading) return;
    setIsLoading(true);
    try {
      // Use smart-fill API for intelligent context-aware suggestions
      const response = await fetch('/api/intelligence/smart-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          existingItems: [
            { title: fromItem.title || fromItem.destination?.name, category: fromItem.destination?.category, time: fromTime },
            { title: toItem.title || toItem.destination?.name, category: toItem.destination?.category, time: toTime },
          ],
          tripDays: 1,
          gapContext: {
            afterActivity: fromItem.title || fromItem.destination?.name,
            afterCategory: fromItem.destination?.category || fromItem.parsedNotes?.type,
            beforeActivity: toItem.title || toItem.destination?.name,
            beforeCategory: toItem.destination?.category || toItem.parsedNotes?.type,
            gapMinutes: gapMins,
            timeOfDay: suggestionType.category,
            suggestedTime,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Parse AI suggestions - they come with full destination objects
        const aiSuggestions = (data.suggestions || []).slice(0, 4).map((s: any) => ({
          id: s.destination?.id || s.id,
          slug: s.destination?.slug || s.slug,
          name: s.destination?.name || s.name,
          category: s.destination?.category || s.category,
          image: s.destination?.image || s.destination?.image_thumbnail || s.image,
          reason: s.reason,
        })).filter((s: any) => s.slug && s.name);

        if (aiSuggestions.length > 0) {
          setSuggestions(aiSuggestions);
        } else {
          // Fallback to basic search if AI returns nothing
          const fallbackResponse = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `${suggestionType.category} ${city}` }),
          });
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            setSuggestions((fallbackData.results || []).slice(0, 4).map((d: any) => ({
              id: d.id,
              slug: d.slug,
              name: d.name,
              category: d.category,
              image: d.image,
            })));
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      fetchSuggestions();
    }
  };

  // Calculate suggested time (middle of gap)
  const suggestedTime = (() => {
    const midMins = fromMins + Math.round(gapMins / 3); // 1/3 into the gap
    const h = Math.floor(midMins / 60);
    const m = midMins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  })();

  const addSuggestion = (place: { slug: string; name: string; category?: string; image?: string }) => {
    const destination = {
      slug: place.slug,
      name: place.name,
      city: city,
      category: place.category || 'place',
      image: place.image,
    } as Destination;
    onAddPlace(destination, suggestedTime);
    setIsExpanded(false);
  };

  const gapHours = Math.round(gapMins / 60 * 10) / 10;

  return (
    <div className="py-1">
      <div className="flex justify-center">
        <button
          onClick={handleExpand}
          className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 transition-colors px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-800"
        >
          <Sparkles className="w-3 h-3" />
          <span>{gapHours}h gap · {suggestionType.label}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-2 pb-1 px-2">
              {isLoading ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              ) : suggestions.length > 0 ? (
                <div className="space-y-2">
                  {suggestions.map((place) => (
                    <button
                      key={place.slug}
                      onClick={() => addSuggestion(place)}
                      disabled={isAdding}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors text-left group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex-shrink-0 overflow-hidden">
                        {place.image ? (
                          <Image src={place.image} alt="" width={40} height={40} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--editorial-text-primary)] truncate">{place.name}</p>
                        <p className="text-xs text-[var(--editorial-text-secondary)] truncate">
                          {place.reason || place.category}
                        </p>
                      </div>
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">No suggestions found</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Meal gap suggestions - shows at end of day based on missing meals
 */
function MealGapSuggestions({
  items,
  onAddSuggestion,
}: {
  items: EnrichedItineraryItem[];
  onAddSuggestion?: (type: string) => void;
}) {
  // Analyze what's in the day
  const hasBreakfast = items.some(i =>
    i.parsedNotes?.type === 'hotel' ||
    i.destination?.category?.toLowerCase().includes('cafe') ||
    i.destination?.category?.toLowerCase().includes('breakfast')
  );
  const hasLunch = items.some(i =>
    i.destination?.category?.toLowerCase().includes('restaurant') &&
    i.time && parseInt(i.time.split(':')[0]) >= 11 && parseInt(i.time.split(':')[0]) <= 14
  );
  const hasDinner = items.some(i =>
    i.destination?.category?.toLowerCase().includes('restaurant') &&
    i.time && parseInt(i.time.split(':')[0]) >= 18
  );

  // Build suggestions based on what's missing
  const missingItems = [];
  if (!hasBreakfast && items.length > 0) missingItems.push('breakfast');
  if (!hasLunch && items.length > 0) missingItems.push('lunch');
  if (!hasDinner && items.length > 1) missingItems.push('dinner');

  if (missingItems.length === 0 || items.length === 0) return null;

  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-400">Missing:</span>
      {missingItems.map((item) => (
        <button
          key={item}
          onClick={() => onAddSuggestion?.(item)}
          className="text-xs px-2 py-0.5 rounded-md bg-[var(--editorial-bg-elevated)] text-gray-600 dark:text-gray-400 hover:bg-[var(--editorial-border-subtle)] transition-colors"
        >
          + {item}
        </button>
      ))}
    </div>
  );
}

/**
 * Weather warning for outdoor activities
 */
function WeatherWarning({ item, date }: { item: EnrichedItineraryItem; date?: string }) {
  // Only show for outdoor categories
  const category = item.destination?.category?.toLowerCase() || '';
  const isOutdoor = ['park', 'garden', 'beach', 'outdoor', 'walk', 'hike', 'tour'].some(
    c => category.includes(c)
  );

  if (!isOutdoor) return null;

  // In a real implementation, this would fetch from weather API
  // For now, just show a placeholder for demonstration
  const [weather, setWeather] = useState<{ rain: boolean; temp?: number } | null>(null);

  // Mock weather check (in production, call weather API)
  useEffect(() => {
    // Only show warning sometimes for demo purposes
    if (Math.random() > 0.7) {
      setWeather({ rain: true, temp: 15 });
    }
  }, []);

  if (!weather?.rain) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-500 ml-2">
      <CloudRain className="w-3 h-3" />
      <span>Rain expected</span>
    </span>
  );
}

/**
 * Trip Intelligence - Only critical warnings
 *
 * Philosophy: Silent until needed. Only shows when there's an actual problem.
 * No suggestions, no info, no optimizations - just warnings that need attention.
 */
function TripIntelligence({
  days,
  weatherByDate,
}: {
  days: Array<{ dayNumber: number; date: string | null; items: EnrichedItineraryItem[] }>;
  city: string;
  weatherByDate: Record<string, DayWeather>;
  onOptimizeRoute: (dayNumber: number, items: EnrichedItineraryItem[]) => void;
  compact?: boolean;
}) {
  const warnings = useMemo(() => {
    const result: Array<{ id: string; title: string }> = [];

    days.forEach((day) => {
      const items = day.items;
      if (items.length < 2) return;

      // 1. TIMING CONFLICT - activities overlap
      const sortedItems = [...items].filter(i => i.time).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

      for (let i = 0; i < sortedItems.length - 1; i++) {
        const current = sortedItems[i];
        const next = sortedItems[i + 1];
        if (!current.time || !next.time) continue;

        const [curH, curM] = current.time.split(':').map(Number);
        const [nextH, nextM] = next.time.split(':').map(Number);
        const duration = current.parsedNotes?.duration ? parseFloat(String(current.parsedNotes.duration)) * 60 : 90;

        const currentEndMins = curH * 60 + curM + duration;
        const nextStartMins = nextH * 60 + nextM;

        // Only warn if activities actually overlap (negative time between)
        if (nextStartMins < currentEndMins) {
          result.push({
            id: `timing-${day.dayNumber}-${i}`,
            title: `Day ${day.dayNumber}: Schedule conflict`,
          });
          break; // One warning per day is enough
        }
      }

      // 2. WEATHER WARNING - rain + outdoor activities
      const dayWeather = day.date ? weatherByDate[day.date] : undefined;
      if (dayWeather && dayWeather.precipProbability > 50) {
        const hasOutdoor = items.some(i => {
          const category = (i.destination?.category || '').toLowerCase();
          return ['park', 'garden', 'beach', 'outdoor', 'walk', 'market'].some(c => category.includes(c));
        });

        if (hasOutdoor) {
          result.push({
            id: `weather-${day.dayNumber}`,
            title: `Day ${day.dayNumber}: Rain likely`,
          });
        }
      }
    });

    return result;
  }, [days, weatherByDate]);

  // Nothing to warn about? Show nothing.
  if (warnings.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <span className="text-xs text-amber-700 dark:text-amber-300">
        {warnings.length === 1 ? warnings[0].title : `${warnings.length} issues need attention`}
      </span>
    </div>
  );
}

/**
 * Nearest neighbor algorithm for route optimization
 */
function nearestNeighborOptimize(items: EnrichedItineraryItem[]): EnrichedItineraryItem[] {
  if (items.length <= 2) return items;

  const getCoords = (item: EnrichedItineraryItem) => ({
    lat: item.destination?.latitude || item.parsedNotes?.latitude || 0,
    lng: item.destination?.longitude || item.parsedNotes?.longitude || 0,
  });

  const getDistance = (a: EnrichedItineraryItem, b: EnrichedItineraryItem) => {
    const coordsA = getCoords(a);
    const coordsB = getCoords(b);
    const R = 6371;
    const dLat = (coordsB.lat - coordsA.lat) * Math.PI / 180;
    const dLng = (coordsB.lng - coordsA.lng) * Math.PI / 180;
    const x = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coordsA.lat * Math.PI / 180) * Math.cos(coordsB.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
    return R * c;
  };

  const result: EnrichedItineraryItem[] = [items[0]];
  const remaining = [...items.slice(1)];

  while (remaining.length > 0) {
    const current = result[result.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = getDistance(current, remaining[i]);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    result.push(remaining[nearestIdx]);
    remaining.splice(nearestIdx, 1);
  }

  return result;
}

/**
 * Drop zone between items - Shows when dragging to allow insertion at specific positions
 */
function DropZoneBetweenItems({
  dayNumber,
  insertIndex,
  insertTime,
}: {
  dayNumber: number;
  insertIndex: number;
  insertTime?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop-zone-${dayNumber}-${insertIndex}`,
    data: {
      dayNumber,
      insertIndex,
      insertTime,
      type: 'insertion-point',
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        transition-all duration-200 ease-out
        ${isOver
          ? 'h-12 bg-green-100 dark:bg-green-900/30 border-2 border-dashed border-green-500 rounded-lg my-1 flex items-center justify-center'
          : 'h-1 hover:h-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full mx-8'
        }
      `}
    >
      {isOver && (
        <span className="text-xs font-medium text-green-600 dark:text-green-400">
          Drop here to insert
        </span>
      )}
    </div>
  );
}

/**
 * Sidebar Destination Palette - Drag destinations to add to trip
 */
function SidebarDestinationPalette({
  city,
  selectedDayNumber,
  onAddPlace,
}: {
  city: string;
  selectedDayNumber: number;
  onAddPlace: (destination: Destination, dayNumber: number) => void;
}) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!city) return;

    const fetchDestinations = async () => {
      setIsLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('destinations')
        .select('id, slug, name, city, category, image_thumbnail, image, rating')
        .eq('city', city)
        .order('rating', { ascending: false })
        .limit(12);

      setDestinations((data as Destination[]) || []);
      setIsLoading(false);
    };

    fetchDestinations();
  }, [city]);

  if (!city) return null;

  return (
    <div className="bg-[var(--editorial-bg-elevated)] rounded-xl border border-[var(--editorial-border)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--editorial-border)]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-semibold text-[var(--editorial-text-primary)]">
            Our Curated List in {city}
          </h3>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          Drag to add to your trip
        </p>
      </div>

      {/* Destination list */}
      <div className="p-2 max-h-64 overflow-y-auto space-y-1">
        {isLoading ? (
          <div className="py-6 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
            <p className="text-xs text-gray-400 mt-2">Loading places...</p>
          </div>
        ) : destinations.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400">
            No places found for {city}
          </div>
        ) : (
          destinations.map((destination) => (
            <DraggablePaletteCard
              key={destination.id}
              destination={destination}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Draggable card in the palette - Row layout for sidebar
 */
function DraggablePaletteCard({ destination }: { destination: Destination }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${destination.id}`,
    data: {
      destination,
      source: 'palette',
    },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const hasImage = destination.image_thumbnail || destination.image;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        flex items-center gap-2.5 p-2 rounded-lg
        bg-[var(--editorial-bg-elevated)]
        hover:bg-[var(--editorial-border-subtle)]
        cursor-grab active:cursor-grabbing
        transition-all duration-150
        ${isDragging ? 'shadow-xl ring-2 ring-gray-900/20 dark:ring-white/20 z-50' : ''}
      `}
    >
      {/* Drag handle */}
      <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0" />

      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
        {hasImage ? (
          <Image
            src={destination.image_thumbnail || destination.image || ''}
            alt={destination.name}
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--editorial-text-primary)] truncate">
          {destination.name}
        </p>
        <p className="text-xs text-gray-500 truncate capitalize">
          {destination.category}
        </p>
      </div>
    </div>
  );
}

/**
 * Drag preview card shown during drag
 */
function DragPreviewCard({
  destination,
  isOverTarget,
}: {
  destination: Destination;
  isOverTarget: boolean;
}) {
  const hasImage = destination.image_thumbnail || destination.image;

  return (
    <div
      className={`
        pointer-events-none
        transition-all duration-200 ease-out
        ${isOverTarget ? 'scale-105 rotate-1' : 'scale-100 rotate-0'}
      `}
    >
      <div
        className={`
          flex items-center gap-3 p-3 rounded-xl
          bg-[var(--editorial-bg-elevated)]
          shadow-2xl border-2
          transition-all duration-200
          ${isOverTarget
            ? 'border-green-500 dark:border-green-400 ring-4 ring-green-500/20'
            : 'border-[var(--editorial-border)]'
          }
        `}
        style={{ width: isOverTarget ? 240 : 180 }}
      >
        {/* Thumbnail */}
        <div
          className={`
            rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0
            transition-all duration-200
            ${isOverTarget ? 'w-12 h-12' : 'w-10 h-10'}
          `}
        >
          {hasImage ? (
            <Image
              src={destination.image_thumbnail || destination.image || ''}
              alt={destination.name}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-4 h-4 text-gray-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[var(--editorial-text-primary)] truncate">
            {destination.name}
          </p>
          <p className="text-xs text-gray-500 truncate capitalize">
            {destination.category}
          </p>

          {/* Drop indicator */}
          {isOverTarget && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
              Drop to add to day
            </p>
          )}
        </div>

        {/* Plus indicator */}
        {isOverTarget && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <Plus className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}
