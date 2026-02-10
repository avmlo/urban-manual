'use client';

/**
 * DaySection - A single day's itinerary with items, search, and add menus
 * Extracted from page.tsx following itskovacs/trip architecture (MIT)
 * https://github.com/itskovacs/trip
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  MapPin, X, Search, Loader2, Globe, Phone,
  Clock, Coffee, Sun, Camera,
  ShoppingBag, Briefcase, BedDouble, Waves, Dumbbell, Shirt,
  Package, Sparkles, Moon,
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import { Menu } from 'primereact/menu';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import type { Destination } from '@/types/destination';
import type { ActivityData, ActivityType } from '@/types/trip';
import type { DayWeather } from '@/lib/hooks/useWeather';
import DayIntelligence from '@/features/trip/components/DayIntelligence';
import { WeatherIcon } from '@/features/trip/components/intelligence/GapSuggestions';
import ItemRow from '@/features/trip/components/items/ItemRow';
import HotelActivityRow from '@/features/trip/components/items/HotelActivityRow';
import TravelTime from '@/features/trip/components/items/TravelTime';
import { DropZoneBetweenItems } from '@/features/trip/components/sidebar/DestinationPalette';
import TransportForm from '@/features/trip/components/day/TransportForm';

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

interface DaySectionProps {
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
  onOpenSidebarAdd?: () => void;
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
}

export default function DaySection({
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
}: DaySectionProps) {
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

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const menuRef = useRef<any>(null);

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

  // Parse as local time to avoid timezone shifts - TRIP-style: "18 May"
  const dateDisplay = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
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
      {/* Day header - TRIP-inspired: item count circle + date + cost + menu */}
      <div className="flex items-center justify-between mb-3 mt-2">
        <div className="flex items-center gap-3">
          {/* Item count circle - neutral gray like TRIP */}
          <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{items.length}</span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--editorial-text-primary)]">
              {dateDisplay || `Day ${dayNumber}`}
            </h3>
          </div>
          {/* Weather badge - compact */}
          {weather && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-full">
              <WeatherIcon code={weather.weatherCode} className="w-3.5 h-3.5 text-[var(--editorial-accent)]" />
              <span className="text-xs text-[var(--editorial-text-secondary)]">
                {weather.tempMax}°
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

        <div className="flex items-center gap-3">
          {/* Day cost total - pill badge like TRIP */}
          {(() => {
            const dayCost = items.reduce((sum, i) => sum + (i.parsedNotes?.costEstimate || 0), 0);
            if (dayCost > 0) {
              const curr = items.find(i => i.parsedNotes?.currency)?.parsedNotes?.currency || '\u20AC';
              return (
                <span className="text-sm font-medium text-[var(--editorial-text-secondary)] tabular-nums px-2.5 py-1 rounded-lg bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)]">
                  {dayCost.toLocaleString()} {curr}
                </span>
              );
            }
            return null;
          })()}

          {/* Three-dot menu - PrimeReact Menu */}
          <div className="relative">
            <Menu
              ref={menuRef}
              model={[
                ...(canOptimize ? [
                  {
                    label: 'Optimize route',
                    icon: 'pi pi-directions',
                    disabled: isOptimizing,
                    command: () => { optimizeRoute(); closeAllMenus(); },
                  },
                  { separator: true },
                ] : []),
                {
                  label: 'From curation',
                  icon: 'pi pi-search',
                  command: () => { setShowSearch(true); setSearchSource('curated'); setShowAddMenu(false); },
                },
                {
                  label: 'From Google',
                  icon: 'pi pi-globe',
                  command: () => { setShowSearch(true); setSearchSource('google'); setShowAddMenu(false); },
                },
                { separator: true },
                {
                  label: 'Flight',
                  icon: 'pi pi-send',
                  command: () => { setShowTransportForm('flight'); setShowAddMenu(false); },
                },
                {
                  label: 'Hotel',
                  icon: 'pi pi-building',
                  command: () => { setShowTransportForm('hotel'); setShowAddMenu(false); },
                },
                {
                  label: 'Train',
                  icon: 'pi pi-car',
                  command: () => { setShowTransportForm('train'); setShowAddMenu(false); },
                },
                { separator: true },
                {
                  label: 'Activity',
                  icon: 'pi pi-clock',
                  command: () => { setShowTransportForm('activity'); setShowAddMenu(false); },
                },
              ] as Array<{ label?: string; icon?: string; disabled?: boolean; command?: () => void; separator?: boolean }>}
              popup
              className="lg:hidden"
            />
            <Button
              icon={showAddMenu || showSearch || showTransportForm ? 'pi pi-times' : 'pi pi-ellipsis-h'}
              rounded
              text
              severity="secondary"
              className="!w-8 !h-8"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
                if (isDesktop && onOpenSidebarAdd) {
                  onOpenSidebarAdd();
                } else if (showAddMenu || showSearch || showTransportForm) {
                  closeAllMenus();
                } else {
                  menuRef.current?.toggle(e as unknown as React.SyntheticEvent);
                  setShowAddMenu(true);
                }
              }}
              aria-label="Day actions"
            />

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

      {/* Items (including hotel activities which are now always part of orderedItems) */}
      {orderedItems.length > 0 ? (
        <Reorder.Group axis="y" values={orderedItems} onReorder={(newOrder) => {
          latestReorderRef.current = newOrder;
          setOrderedItems(newOrder);
        }} className="space-y-1">
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

      {/* Nightly hotel indicator - TRIP-style card with time pill + status */}
      {nightlyHotel && (
        <button
          onClick={() => onSelectItem?.(nightlyHotel)}
          className="w-full mt-1 relative overflow-hidden rounded-xl bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] hover:shadow-sm transition-all text-left"
        >
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-3">
              {/* Time pill */}
              <span className="flex-shrink-0 text-xs font-mono tabular-nums text-[var(--editorial-text-secondary)] bg-[var(--editorial-bg)] border border-[var(--editorial-border)] rounded-lg px-2.5 py-1">
                23:59
              </span>
              {/* Green dot for booked hotel */}
              <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
              {/* Hotel icon + name */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Moon className="w-3.5 h-3.5 text-[var(--editorial-text-tertiary)] flex-shrink-0" />
                <span className="text-sm text-[var(--editorial-text-primary)] truncate">
                  {nightlyHotel.title || 'Hotel'}
                </span>
              </div>
              {/* Cost + status */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {nightlyHotel.parsedNotes?.costEstimate && nightlyHotel.parsedNotes.costEstimate > 0 && (
                  <span className="text-xs font-medium tabular-nums text-[var(--editorial-text-secondary)] bg-[var(--editorial-bg)] border border-[var(--editorial-border)] rounded-lg px-2 py-0.5">
                    {nightlyHotel.parsedNotes.costEstimate} {nightlyHotel.parsedNotes.currency || '\u20AC'}
                  </span>
                )}
                <Tag
                  value="booked"
                  severity="success"
                  rounded
                  className="!text-[11px] !px-2 !py-0.5"
                />
              </div>
            </div>
          </div>
        </button>
      )}
    </div>
  );
}
