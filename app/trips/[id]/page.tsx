'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
} from '@dnd-kit/core';
import { useAuth } from '@/contexts/AuthContext';
import { useTripEditor, type EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import { useHotelLogic } from '@/lib/hooks/useHotelLogic';
import { parseDestinations, stringifyDestinations, parseTripNotes, stringifyTripNotes, type TripNoteItem, type ActivityData, type ActivityType } from '@/types/trip';
import { calculateDayNumberFromDate } from '@/lib/utils/time-calculations';
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
import TripInteractiveMap from '@/features/trip/components/TripInteractiveMap';
import { Map as MapIcon, ChevronLeft as PanelLeftClose, Download, Filter } from 'lucide-react';
import PackingListPanel from '@/features/trip/components/PackingList';
import { parsePackingList, stringifyPackingList } from '@/types/trip';
// Extracted components - architecture inspired by itskovacs/trip (MIT)
import { formatTime, nearestNeighborOptimize } from '@/features/trip/lib/utils';
import ItemRow from '@/features/trip/components/items/ItemRow';
import HotelActivityRow from '@/features/trip/components/items/HotelActivityRow';
import TravelTime from '@/features/trip/components/items/TravelTime';
import { GapSuggestion, MealGapSuggestions, TripWarnings, WeatherIcon } from '@/features/trip/components/intelligence/GapSuggestions';
import SidebarDestinationPalette, { DropZoneBetweenItems, DragPreviewCard } from '@/features/trip/components/sidebar/DestinationPalette';

/**
 * TripPage - Split-panel layout inspired by itskovacs/trip
 *
 * Desktop: Itinerary panel (left) + Interactive map (right)
 * Mobile: Single column with map toggle
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

  // Map states
  const [showMobileMap, setShowMobileMap] = useState(false);
  const [showPackingList, setShowPackingList] = useState(false);
  const [leftPanelTab, setLeftPanelTab] = useState<'plans' | 'notes' | 'lists'>('plans');

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

  // Compute map markers from all items with coordinates
  const mapMarkers = useMemo(() => {
    return days.flatMap(day =>
      day.items
        .filter(item => {
          const lat = item.destination?.latitude || item.parsedNotes?.latitude;
          const lng = item.destination?.longitude || item.parsedNotes?.longitude;
          return lat && lng;
        })
        .map(item => ({
          id: item.id,
          name: item.title || item.destination?.name || 'Place',
          latitude: (item.destination?.latitude || item.parsedNotes?.latitude)!,
          longitude: (item.destination?.longitude || item.parsedNotes?.longitude)!,
          category: item.destination?.category || item.parsedNotes?.category || 'place',
          day: day.dayNumber,
          image: item.destination?.image_thumbnail || item.destination?.image || item.parsedNotes?.image,
          slug: item.destination_slug,
        }))
    );
  }, [days]);

  // Markers for the selected day only (highlighted on map)
  const selectedDayMarkers = useMemo(() => {
    return mapMarkers.filter(m => m.day === selectedDayNumber);
  }, [mapMarkers, selectedDayNumber]);

  // Compute total trip cost from item notes
  const tripCostSummary = useMemo(() => {
    let total = 0;
    let currency = 'EUR';
    const dayCosts: Record<number, number> = {};
    for (const day of days) {
      let dayTotal = 0;
      for (const item of day.items) {
        const cost = item.parsedNotes?.costEstimate;
        if (cost && cost > 0) {
          dayTotal += cost;
          if (item.parsedNotes?.currency) currency = item.parsedNotes.currency;
        }
      }
      dayCosts[day.dayNumber] = dayTotal;
      total += dayTotal;
    }
    return { total, currency, dayCosts };
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
    <main className="w-full min-h-screen bg-[var(--editorial-bg)]">
      {/* Split-panel layout: itinerary (left) + map (right) on desktop */}
      <div className="lg:flex lg:h-screen">
        {/* LEFT PANEL - Itinerary */}
        <div className="lg:w-[380px] xl:w-[400px] lg:flex-shrink-0 lg:flex lg:flex-col lg:border-r border-[var(--editorial-border)] relative">
          {/* STICKY HEADER - Back + title, stats, toolbar, day tabs */}
          <div className="flex-shrink-0 px-4 sm:px-6 pt-16 sm:pt-6 pb-0 bg-[var(--editorial-bg)] lg:border-b border-[var(--editorial-border)]">
            {/* Top row: Back + Title + Menu */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3 min-w-0">
                <Link
                  href="/trips"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--editorial-border-subtle)] text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] transition-colors flex-shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <div className="min-w-0 flex-1">
                  <TripEditorHeader
                    trip={trip}
                    primaryCity={primaryCity}
                    totalItems={totalItems}
                    userId={user?.id}
                    days={days}
                    onUpdate={updateTrip}
                    onDelete={handleDelete}
                  />
                </div>
              </div>
              <TripQuickActions
                tripId={tripId}
                tripTitle={trip.title || 'My Trip'}
                startDate={trip.start_date}
                endDate={trip.end_date}
                destination={primaryCity}
                onScrollToChecklist={() => { setLeftPanelTab('lists'); }}
                onScrollToPackingList={() => { setLeftPanelTab('lists'); }}
                onOpenNotes={() => { setLeftPanelTab('notes'); }}
                onEdit={() => { setShowTripSettings(true); setSelectedItem(null); }}
                onDelete={handleDelete}
              />
            </div>

            {/* Section tabs + toolbar row */}
            <div className="mt-4 flex items-center justify-between">
              {/* Tabs: Plans / Notes / Lists */}
              <div className="flex items-center gap-0">
                {(['plans', 'notes', 'lists'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setLeftPanelTab(tab)}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors relative ${
                      leftPanelTab === tab
                        ? 'text-[var(--editorial-text-primary)]'
                        : 'text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)]'
                    }`}
                  >
                    {tab === 'plans' ? 'Plans' : tab === 'notes' ? 'Notes' : 'Lists'}
                    {leftPanelTab === tab && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[var(--editorial-text-primary)] rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* Toolbar icons - only show on Plans tab */}
              {leftPanelTab === 'plans' && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                      isEditMode
                        ? 'bg-[var(--editorial-accent)] text-white'
                        : 'hover:bg-[var(--editorial-border-subtle)] text-[var(--editorial-text-secondary)]'
                    }`}
                    title={isEditMode ? 'Done editing' : 'Edit mode'}
                  >
                    {isEditMode ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => { setShowTripSettings(true); setSelectedItem(null); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--editorial-border-subtle)] text-[var(--editorial-text-secondary)] transition-colors"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Tab underline border */}
            <div className="h-px bg-[var(--editorial-border)] mt-1" />
          </div>
          {/* END STICKY HEADER */}

          {/* SCROLLABLE CONTENT - Tab-based */}
          <div className="flex-1 lg:overflow-y-auto px-4 sm:px-6 pb-24 sm:pb-20">

          {/* === PLANS TAB === */}
          {leftPanelTab === 'plans' && (
            <>
            {/* Day date pills - moved below tabs */}
            {days.length > 0 && (
              <div className="py-3">
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
        <div className="mt-1">
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

          {/* Intelligence - bottom of Plans tab */}
          <div className="mt-6">
            <div className="bg-[var(--editorial-bg-elevated)] rounded-xl border border-[var(--editorial-border)] overflow-hidden">
              <TripWarnings
                days={days}
                city={primaryCity}
                weatherByDate={weatherByDate}
                onOptimizeRoute={(dayNumber: number, optimizedItems: EnrichedItineraryItem[]) => reorderItems(dayNumber, optimizedItems)}
                compact
              />
            </div>
          </div>
            </>
          )}

          {/* === NOTES TAB === */}
          {leftPanelTab === 'notes' && (
            <div className="mt-4 space-y-4">
              <div className="bg-[var(--editorial-bg-elevated)] rounded-xl border border-[var(--editorial-border)] p-4">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Trip Notes</h3>
                <TripChecklist
                  notes={tripNotes}
                  onSave={(notes) => updateTrip({ notes })}
                />
              </div>
            </div>
          )}

          {/* === LISTS TAB === */}
          {leftPanelTab === 'lists' && (
            <div className="mt-4 space-y-4">
              <div id="trip-checklist-section" className="bg-[var(--editorial-bg-elevated)] rounded-xl border border-[var(--editorial-border)] p-4">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Checklist</h3>
                <TripChecklist
                  notes={tripNotes}
                  onSave={(notes) => updateTrip({ notes })}
                />
              </div>

              <div id="trip-packing-section" className="bg-[var(--editorial-bg-elevated)] rounded-xl border border-[var(--editorial-border)] p-4">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Packing List</h3>
                <PackingListPanel
                  packingList={trip.packing_list || null}
                  onSave={(json) => updateTrip({ packing_list: json })}
                />
              </div>
            </div>
          )}

          </div>
          {/* END SCROLLABLE CONTENT */}
        </div>
        {/* END LEFT PANEL */}

        {/* DETAIL PANEL - Opens as second panel when clicking a card (desktop only) */}
        <AnimatePresence>
          {(selectedItem || showTripSettings || sidebarAddDay !== null) && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="hidden lg:flex lg:flex-col lg:flex-shrink-0 lg:border-r border-[var(--editorial-border)] bg-[var(--editorial-bg)] overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-4">
                {sidebarAddDay !== null ? (
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
                ) : selectedItem ? (
                  <DestinationBox
                    item={selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onTimeChange={updateItemTime}
                    onNotesChange={updateItemNotes}
                    onItemUpdate={(id, updates) => updateItem(id, updates)}
                    onRemove={removeItem}
                  />
                ) : showTripSettings ? (
                  <TripSettingsBox
                    trip={trip}
                    onUpdate={updateTrip}
                    onDelete={handleDelete}
                    onClose={() => setShowTripSettings(false)}
                  />
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RIGHT PANEL - Interactive Map */}
        <div className="hidden lg:flex lg:flex-1 lg:flex-col">
          {/* Map stats bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--editorial-border)] bg-[var(--editorial-bg)]">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5 text-sm text-[var(--editorial-text-secondary)]">
                <MapIcon className="w-4 h-4" />
                <span className="font-medium">{primaryCity || 'Map'}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-[var(--editorial-text-tertiary)]">
              <span>Days <strong className="text-[var(--editorial-text-primary)] ml-1">{days.length}</strong></span>
              <span>Places <strong className="text-[var(--editorial-text-primary)] ml-1">{totalItems}</strong></span>
              {tripCostSummary.total > 0 && (
                <span>Budget <strong className="text-[var(--editorial-text-primary)] ml-1">{tripCostSummary.total.toLocaleString()} {tripCostSummary.currency}</strong></span>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 relative">
            <TripInteractiveMap
              days={days}
              selectedDayNumber={selectedDayNumber}
              tripDestination={primaryCity}
              onMarkerClick={(itemId) => {
                const item = days.flatMap(d => d.items).find(i => i.id === itemId);
                if (item) handleSelectItem(item);
              }}
              onAddPlace={(place, dayNum) => {
                if (place.slug) addPlace(place as any, dayNum);
              }}
              hasHeader
            />
          </div>
        </div>

        {/* Mobile map toggle button */}
        <button
          onClick={() => setShowMobileMap(!showMobileMap)}
          className="lg:hidden fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-[var(--editorial-text-primary)] text-[var(--editorial-bg)] shadow-lg flex items-center justify-center"
        >
          <MapIcon className="w-5 h-5" />
        </button>

        {/* Mobile fullscreen map overlay */}
        <AnimatePresence>
          {showMobileMap && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-50 bg-[var(--editorial-bg)]"
            >
              <div className="absolute top-4 left-4 z-10">
                <button
                  onClick={() => setShowMobileMap(false)}
                  className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <TripInteractiveMap
                days={days}
                selectedDayNumber={selectedDayNumber}
                tripDestination={primaryCity}
                onMarkerClick={(itemId) => {
                  const item = days.flatMap(d => d.items).find(i => i.id === itemId);
                  if (item) {
                    handleSelectItem(item);
                    setShowMobileMap(false);
                  }
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* End split panel layout */}

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
      {/* Day header - TRIP-inspired: item count circle + title + cost + menu */}
      <div className="flex items-center justify-between mb-3 mt-2">
        <div className="flex items-center gap-3">
          {/* Item count circle - accent blue like TRIP */}
          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{items.length}</span>
          </div>
          <h3 className="text-[15px] font-semibold text-[var(--editorial-text-primary)]">
            Day {dayNumber}{longDateDisplay ? ` \u2013 ${longDateDisplay}` : ''}
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
          {/* Day cost total */}
          {(() => {
            const dayCost = items.reduce((sum, i) => sum + (i.parsedNotes?.costEstimate || 0), 0);
            if (dayCost > 0) {
              const curr = items.find(i => i.parsedNotes?.currency)?.parsedNotes?.currency || '\u20AC';
              return (
                <span className="text-sm font-medium text-[var(--editorial-text-secondary)] tabular-nums mr-1">
                  {dayCost.toLocaleString()} {curr}
                </span>
              );
            }
            return null;
          })()}

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
                    onSelect={onSelectItem ? () => onSelectItem(item) : undefined}
                    onDragEnd={handleReorderComplete}
                  />
                ) : (
                  <ItemRow
                    item={item}
                    isExpanded={expandedItemId === item.id}
                    isEditMode={isEditMode}
                    onToggle={() => onToggleItem(item.id)}
                    onRemove={() => onRemove(item.id)}
                    onUpdateItem={onUpdateItem}
                    onUpdateTime={onUpdateTime}
                    onDragEnd={handleReorderComplete}
                    onSelect={onSelectItem ? () => onSelectItem(item) : undefined}
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

// All inline components (HotelActivityRow, ItemRow, ItemDetails, TravelTime,
// GapSuggestion, MealGapSuggestions, WeatherWarning, TripIntelligence,
// nearestNeighborOptimize, DropZoneBetweenItems, SidebarDestinationPalette,
// DraggablePaletteCard, DragPreviewCard) have been extracted to separate files.
// See src/features/trip/components/items/ and src/features/trip/components/intelligence/
// Architecture inspired by itskovacs/trip (MIT License)
// https://github.com/itskovacs/trip

// Re-export WalkingTime as backwards-compatible alias
function WalkingTime({ from, to }: { from: EnrichedItineraryItem; to: EnrichedItineraryItem }) {
  return <TravelTime from={from} to={to} />;
}
