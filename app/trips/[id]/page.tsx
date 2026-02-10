'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, X } from 'lucide-react';
import { Button } from 'primereact/button';
import { motion, AnimatePresence } from 'framer-motion';
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
} from '@dnd-kit/core';
import { useAuth } from '@/contexts/AuthContext';
import { useTripEditor, type EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import { useHotelLogic } from '@/lib/hooks/useHotelLogic';
import { parseDestinations, type ActivityData } from '@/types/trip';
import { calculateDayNumberFromDate } from '@/lib/utils/time-calculations';
import { PageLoader } from '@/components/LoadingStates';
import { createClient } from '@/lib/supabase/client';
import type { Destination } from '@/types/destination';
import TripSettingsBox from '@/features/trip/components/TripSettingsBox';
import DestinationBox from '@/features/trip/components/DestinationBox';
import AddPlacePanel from '@/features/trip/components/AddPlacePanel';
import { UndoProvider } from '@/features/trip/components/UndoToast';
import { SavingFeedback } from '@/features/trip/components/SavingFeedback';
import { TripEditorHeader } from '@/features/trip/components/editor/TripEditorHeader';
import { TripChecklist } from '@/features/trip/components/editor/TripChecklist';
import { type DayWeather } from '@/lib/hooks/useWeather';
// Settings icon now via PrimeIcons (pi pi-cog) in Button component
import TripQuickActions from '@/features/trip/components/TripQuickActions';
import TripInteractiveMap from '@/features/trip/components/TripInteractiveMap';
import { Map as MapIcon } from 'lucide-react';
import PackingListPanel from '@/features/trip/components/PackingList';
// Extracted components - architecture inspired by itskovacs/trip (MIT)
import { TripWarnings } from '@/features/trip/components/intelligence/GapSuggestions';
import { DragPreviewCard } from '@/features/trip/components/sidebar/DestinationPalette';
import DaySection from '@/features/trip/components/day/DaySection';

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

  // Day selection state (for map highlighting - auto-updated by scroll observer)
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);

  // IntersectionObserver to track which day is in view during continuous scroll
  useEffect(() => {
    if (days.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const dayNum = Number(entry.target.getAttribute('data-day-number'));
            if (dayNum && !isNaN(dayNum)) {
              setSelectedDayNumber(dayNum);
            }
          }
        }
      },
      { threshold: 0.3, rootMargin: '-80px 0px -60% 0px' }
    );
    // Observe all day sections
    const dayElements = document.querySelectorAll('[data-day-number]');
    dayElements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [days.length]);

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

            {/* Section tabs - TRIP-style pill tabs */}
            <div className="mt-4 flex items-center justify-between">
              {/* Pill tabs: Plans / Notes / Lists */}
              <div className="flex items-center gap-1.5">
                {(['plans', 'notes', 'lists'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setLeftPanelTab(tab)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                      leftPanelTab === tab
                        ? 'bg-[var(--editorial-text-primary)] text-[var(--editorial-bg)]'
                        : 'text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)] hover:bg-[var(--editorial-border-subtle)]'
                    }`}
                  >
                    {tab === 'plans' ? 'Plans' : tab === 'notes' ? 'Notes' : 'Lists'}
                  </button>
                ))}
              </div>

              {/* Toolbar icons moved to Plans header */}
            </div>

            {/* Separator */}
            <div className="h-px bg-[var(--editorial-border)] mt-2" />
          </div>
          {/* END STICKY HEADER */}

          {/* SCROLLABLE CONTENT - Tab-based */}
          <div className="flex-1 lg:overflow-y-auto px-4 sm:px-6 pb-24 sm:pb-20">

          {/* === PLANS TAB - Continuous day scroll (TRIP-style) === */}
          {leftPanelTab === 'plans' && (
            <>
            {/* "Plans / Your itinerary" header with toolbar - TRIP-style */}
            <div className="flex items-center justify-between pt-4 pb-2">
              <div>
                <h2 className="text-lg font-bold text-[var(--editorial-text-primary)]">Plans</h2>
                <p className="text-xs text-[var(--editorial-text-tertiary)]">Your itinerary</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  icon={isEditMode ? 'pi pi-check' : 'pi pi-pencil'}
                  rounded
                  text
                  severity={isEditMode ? 'danger' : 'secondary'}
                  className="!w-8 !h-8"
                  onClick={() => setIsEditMode(!isEditMode)}
                  tooltip={isEditMode ? 'Done editing' : 'Edit mode'}
                  tooltipOptions={{ position: 'bottom' }}
                />
                <Button
                  icon="pi pi-cog"
                  rounded
                  text
                  severity="secondary"
                  className="!w-8 !h-8"
                  onClick={() => { setShowTripSettings(true); setSelectedItem(null); }}
                  tooltip="Settings"
                  tooltipOptions={{ position: 'bottom' }}
                />
              </div>
            </div>

        {/* All days - continuous scroll */}
        <div className="space-y-6">
          {days.map((day) => {
            const dayDate = day.date;
            const weather = dayDate ? weatherByDate[dayDate] : undefined;
            const nightlyHotel = nightlyHotelByDay[day.dayNumber] || null;
            const checkoutHotel = checkoutHotelByDay[day.dayNumber] || null;
            const checkInHotel = checkInHotelByDay[day.dayNumber] || null;
            const breakfastHotel = breakfastHotelByDay[day.dayNumber] || null;
            return (
              <div key={day.dayNumber} data-day-number={day.dayNumber}>
              <DaySection
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
              </div>
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
