'use client';

import React from 'react';
import { Plus, MapPin, GripVertical } from 'lucide-react';
import type { TripDay, EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import type { ActivityType, ItineraryItemNotes } from '@/types/trip';
import { getAirportCoordinates } from '@/lib/utils/airports';

// DnD Kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Import new itinerary components
import ItineraryCard from './ItineraryCard';
import ItineraryMinimalRow, { BreakfastRow, CheckoutRow, CheckInRow, NightStayRow } from './ItineraryMinimalRow';
import TravelConnector, { InteractiveTravelConnector } from './TravelConnector';
import GapSuggestion, { CompactGapIndicator } from './GapSuggestion';
import DayHeader, { DayNavigation } from './DayHeader';
import TripDesktopHeader from './TripDesktopHeader';

interface ItineraryViewRedesignProps {
  days: TripDay[];
  selectedDayNumber: number;
  onSelectDay: (dayNumber: number) => void;
  onEditItem?: (item: EnrichedItineraryItem) => void;
  onAddItem?: (dayNumber: number) => void;
  onAddActivity?: (dayNumber: number, activityType: ActivityType) => void;
  onOptimizeDay?: (dayNumber: number) => void;
  onUpdateTravelMode?: (itemId: string, mode: 'walking' | 'driving' | 'transit') => void;
  onRemoveItem?: (itemId: string) => void;
  onReorderItems?: (dayNumber: number, items: EnrichedItineraryItem[]) => void;
  isOptimizing?: boolean;
  isEditMode?: boolean;
  activeItemId?: string | null;
  allHotels?: EnrichedItineraryItem[];
  showDayNavigation?: boolean;
  /** Trip metadata for desktop header */
  tripTitle?: string;
  startDate?: string;
  endDate?: string;
  travelerCount?: number;
  className?: string;
}

// Item types that should use full cards vs minimal rows
const CARD_TYPES = ['flight', 'hotel', 'place', 'event', 'restaurant', 'bar', 'attraction'];
const MINIMAL_TYPES = ['activity', 'breakfast', 'custom'];

/**
 * ItineraryViewRedesign - Hybrid card + minimal design itinerary view
 *
 * Features:
 * - Editorial-style day headers
 * - Full visual cards for major items (flights, hotels, restaurants)
 * - Minimal text rows for lightweight items (breakfast, activities)
 * - Clean travel connectors with time estimates
 * - Smart gap suggestions for free time > 2 hours
 */
// Sortable Item Wrapper Component
interface SortableItemProps {
  item: EnrichedItineraryItem;
  isEditMode: boolean;
  isActive: boolean;
  isCard: boolean;
  onEditItem?: (item: EnrichedItineraryItem) => void;
  onRemoveItem?: (itemId: string) => void;
}

function SortableItineraryItem({
  item,
  isEditMode,
  isActive,
  isCard,
  onEditItem,
  onRemoveItem,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative group transition-all duration-200
        ${isDragging ? 'scale-[1.03] shadow-xl ring-2 ring-stone-900/10 dark:ring-white/20 rounded-lg bg-white dark:bg-gray-800' : ''}
      `}
    >
      {/* Drag Handle (edit mode only) */}
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute -left-7 top-1/2 -translate-y-1/2 w-6 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing text-stone-300 dark:text-gray-600 hover:text-stone-500 dark:hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Delete button (edit mode) */}
      {isEditMode && onRemoveItem && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemoveItem(item.id);
          }}
          className="absolute -right-2 top-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 transition-colors z-20 opacity-0 group-hover:opacity-100"
        >
          ×
        </button>
      )}

      {/* Render card or minimal row based on item type */}
      {item.parsedNotes?.type === 'hotel' ? (
        <CheckInRow
          hotelName={item.title || 'Hotel'}
          time={item.parsedNotes?.checkInTime || item.time || undefined}
          onClick={() => onEditItem?.(item)}
        />
      ) : isCard ? (
        <ItineraryCard
          item={item}
          isActive={isActive}
          onClick={() => onEditItem?.(item)}
        />
      ) : (
        <ItineraryMinimalRow
          item={item}
          isActive={isActive}
          onClick={() => onEditItem?.(item)}
        />
      )}
    </div>
  );
}

export default function ItineraryViewRedesign({
  days,
  selectedDayNumber,
  onSelectDay,
  onEditItem,
  onAddItem,
  onAddActivity,
  onOptimizeDay,
  onUpdateTravelMode,
  onRemoveItem,
  onReorderItems,
  isOptimizing = false,
  isEditMode = false,
  activeItemId,
  allHotels = [],
  showDayNavigation = true,
  tripTitle,
  startDate,
  endDate,
  travelerCount,
  className = '',
}: ItineraryViewRedesignProps) {
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const selectedDay = days.find((d) => d.dayNumber === selectedDayNumber);

  // Handle drag end - reorder items
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !selectedDay || !onReorderItems) {
      return;
    }

    const oldIndex = selectedDay.items.findIndex((item) => item.id === active.id);
    const newIndex = selectedDay.items.findIndex((item) => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newItems = arrayMove(selectedDay.items, oldIndex, newIndex);
      onReorderItems(selectedDayNumber, newItems);
    }
  };

  if (!selectedDay) return null;

  // Find hotel-related items for this day
  const checkoutHotel = allHotels.find((hotel) => {
    const checkOutDate = hotel.parsedNotes?.checkOutDate;
    return checkOutDate && selectedDay.date && checkOutDate === selectedDay.date;
  });

  const breakfastHotel = allHotels.find((hotel) => {
    const checkInDate = hotel.parsedNotes?.checkInDate;
    const checkOutDate = hotel.parsedNotes?.checkOutDate;
    const hasBreakfast = hotel.parsedNotes?.breakfastIncluded;
    if (!hasBreakfast || !selectedDay.date) return false;
    if (checkInDate && checkOutDate) {
      return selectedDay.date > checkInDate && selectedDay.date <= checkOutDate;
    }
    if (checkInDate) {
      const prevDay = days.find((d) => d.dayNumber === selectedDayNumber - 1);
      return prevDay?.date === checkInDate;
    }
    return false;
  });

  const nightStayHotel = selectedDay.items.find((item) => item.parsedNotes?.type === 'hotel');

  // Sort items by time
  const sortedItems = [...selectedDay.items].sort((a, b) => {
    const timeA = getEffectiveTime(a);
    const timeB = getEffectiveTime(b);
    if (!timeA && !timeB) return 0;
    if (!timeA) return 1;
    if (!timeB) return -1;
    return timeToMinutes(timeA) - timeToMinutes(timeB);
  });

  // Calculate map index for items with coordinates (matching map markers)
  // Only regular places get numbered markers - hotels and flights get special icons
  let mapMarkerIndex = 0;
  const itemMapIndices = new Map<string, number>();

  sortedItems.forEach((item) => {
    const itemType = item.parsedNotes?.type;
    // Skip flights and hotels - they show icons instead of numbers
    if (itemType === 'flight' || itemType === 'hotel') return;

    // Check if item has coordinates
    const lat = item.parsedNotes?.latitude ?? item.destination?.latitude;
    const lng = item.parsedNotes?.longitude ?? item.destination?.longitude;

    if (lat && lng) {
      mapMarkerIndex++;
      itemMapIndices.set(item.id, mapMarkerIndex);
    }
  });

  // Calculate gaps and travel times between items
  const itemsWithMeta = sortedItems.map((item, index) => {
    const nextItem = sortedItems[index + 1];
    const travelTime = calculateTravelTime(item, nextItem);
    const gap = nextItem ? calculateGap(item, nextItem, travelTime?.durationMinutes) : null;
    const mapIndex = itemMapIndices.get(item.id);

    return {
      item,
      travelTime,
      gap,
      isCard: shouldUseCard(item),
      mapIndex,
    };
  });

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Persistent Desktop Header - trip-wide metrics */}
      {(startDate || endDate || travelerCount) && (
        <TripDesktopHeader
          days={days}
          tripTitle={tripTitle}
          startDate={startDate}
          endDate={endDate}
          travelerCount={travelerCount}
        />
      )}

      {/* Day Navigation */}
      {showDayNavigation && days.length > 1 && (
        <DayNavigation
          days={days.map((d) => ({ dayNumber: d.dayNumber, date: d.date }))}
          selectedDay={selectedDayNumber}
          onSelectDay={onSelectDay}
          className="mb-6"
        />
      )}

      {/* Day Header */}
      <DayHeader
        dayNumber={selectedDay.dayNumber}
        date={selectedDay.date}
        itemCount={selectedDay.items.length}
        onOptimize={onOptimizeDay ? () => onOptimizeDay(selectedDay.dayNumber) : undefined}
        isOptimizing={isOptimizing}
      />

      {/* Morning Items (Breakfast & Checkout) */}
      {(checkoutHotel || breakfastHotel) && (
        <div className="space-y-1 pt-4">
          {breakfastHotel && (
            <BreakfastRow
              hotelName={breakfastHotel.title || 'Hotel'}
              time="7:00 - 10:00 AM"
              onClick={() => onEditItem?.(breakfastHotel)}
            />
          )}
          {checkoutHotel && (
            <CheckoutRow
              hotelName={checkoutHotel.title || 'Hotel'}
              time={checkoutHotel.parsedNotes?.checkOutTime || '11:00'}
              onClick={() => onEditItem?.(checkoutHotel)}
            />
          )}
        </div>
      )}

      {/* Main Itinerary */}
      {sortedItems.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedItems.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-0 pt-4">
          {itemsWithMeta.map(({ item, travelTime, gap, isCard, mapIndex }, index) => (
            <React.Fragment key={item.id}>
              {/* Item Row/Card */}
              <div className="relative group">
                {/* Delete button (edit mode) */}
                {isEditMode && onRemoveItem && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveItem(item.id);
                    }}
                    className="absolute -left-2 top-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 transition-colors z-20 opacity-0 group-hover:opacity-100"
                  >
                    ×
                  </button>
                )}

                {/* Render card or minimal row based on item type */}
                {item.parsedNotes?.type === 'hotel' ? (
                  <CheckInRow
                    hotelName={item.title || 'Hotel'}
                    time={item.parsedNotes?.checkInTime || item.time || undefined}
                    onClick={() => onEditItem?.(item)}
                  />
                ) : isCard ? (
                  <ItineraryCard
                    item={item}
                    isActive={item.id === activeItemId}
                    onClick={() => onEditItem?.(item)}
                    mapIndex={mapIndex}
                  />
                ) : (
                  <ItineraryMinimalRow
                    item={item}
                    isActive={item.id === activeItemId}
                    onClick={() => onEditItem?.(item)}
                    mapIndex={mapIndex}
                  />
                )}
              </div>

              {/* Gap Suggestion (for gaps > 2 hours) */}
              {gap && gap >= 120 && (
                <GapSuggestion
                  gapMinutes={gap}
                  hotelName={nightStayHotel?.title}
                  hotelHasPool={nightStayHotel?.parsedNotes?.tags?.includes('pool')}
                  hotelHasSpa={nightStayHotel?.parsedNotes?.tags?.includes('spa')}
                  hotelHasGym={nightStayHotel?.parsedNotes?.tags?.includes('gym')}
                  onAddActivity={
                    onAddActivity
                      ? (type) => onAddActivity(selectedDay.dayNumber, type)
                      : undefined
                  }
                  onAddCustom={
                    onAddItem
                      ? () => onAddItem(selectedDay.dayNumber)
                      : undefined
                  }
                />
              )}

              {/* Compact gap indicator (for 30min - 2h gaps) */}
              {gap && gap >= 30 && gap < 120 && (
                <CompactGapIndicator
                  gapMinutes={gap}
                  onClick={onAddItem ? () => onAddItem(selectedDay.dayNumber) : undefined}
                />
              )}

              {/* Travel Connector */}
              {travelTime && index < sortedItems.length - 1 && (
                <InteractiveTravelConnector
                  durationMinutes={travelTime.durationMinutes}
                  distanceKm={travelTime.distanceKm}
                  mode={travelTime.mode}
                  onModeChange={
                    onUpdateTravelMode
                      ? (mode) => onUpdateTravelMode(item.id, mode)
                      : undefined
                  }
                />
              )}
            </React.Fragment>
              ))}

              {/* Add Stop Button */}
              {onAddItem && (
                <div className="pt-4">
                  <button
                    onClick={() => onAddItem(selectedDay.dayNumber)}
                    className="w-full py-3 border border-dashed border-stone-200 dark:border-gray-700 rounded-xl text-xs text-stone-400 dark:text-gray-500 hover:text-stone-900 dark:hover:text-white hover:border-stone-300 dark:hover:border-gray-600 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add stop
                  </button>
                </div>
              )}

              {/* Night Stay Indicator */}
              {nightStayHotel && (
                <div className="pt-6">
                  <NightStayRow
                    hotelName={nightStayHotel.title || 'Hotel'}
                    hasBreakfast={nightStayHotel.parsedNotes?.breakfastIncluded}
                    onClick={() => onEditItem?.(nightStayHotel)}
                  />
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        /* Empty State */
        <div className="py-16 text-center">
          <MapPin className="w-8 h-8 mx-auto text-stone-300 dark:text-gray-700 mb-4" />
          <p className="text-sm text-stone-400 dark:text-gray-500 mb-6">
            No stops planned yet
          </p>
          {onAddItem && (
            <button
              onClick={() => onAddItem(selectedDay.dayNumber)}
              className="px-5 py-2.5 bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              Add your first stop
            </button>
          )}

          {/* Night Stay (even for empty days) */}
          {nightStayHotel && (
            <div className="mt-8">
              <NightStayRow
                hotelName={nightStayHotel.title || 'Hotel'}
                hasBreakfast={nightStayHotel.parsedNotes?.breakfastIncluded}
                onClick={() => onEditItem?.(nightStayHotel)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get effective time for an item (handles special cases like hotels, flights)
 */
function getEffectiveTime(item: EnrichedItineraryItem): string | null {
  const notes = item.parsedNotes;
  if (notes?.type === 'hotel' && notes?.checkInTime) {
    return notes.checkInTime;
  }
  if (notes?.type === 'flight' && notes?.departureTime) {
    return notes.departureTime;
  }
  return item.time || null;
}

/**
 * Convert time string to minutes for sorting
 */
function timeToMinutes(timeStr: string): number {
  // Handle 24-hour format
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
  // Handle 12-hour format
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3]?.toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  return 0;
}

/**
 * Determine if item should use full card or minimal row
 */
function shouldUseCard(item: EnrichedItineraryItem): boolean {
  const itemType = item.parsedNotes?.type || 'place';

  // Activities and custom items use minimal rows
  if (MINIMAL_TYPES.includes(itemType)) {
    return false;
  }

  // Items with destination data (places) use cards
  if (item.destination?.slug || item.destination_slug) {
    return true;
  }

  // Flights and hotels always use cards
  if (['flight', 'hotel', 'event'].includes(itemType)) {
    return true;
  }

  // Default: use card if has image, otherwise minimal
  return !!(item.destination?.image || item.parsedNotes?.image);
}

/**
 * Calculate travel time between two items
 */
function calculateTravelTime(
  from: EnrichedItineraryItem,
  to?: EnrichedItineraryItem
): { durationMinutes: number; distanceKm: number; mode: 'walking' | 'driving' | 'transit' } | null {
  if (!to) return null;

  // Get coordinates
  const fromCoords = getItemCoordinates(from);
  const toCoords = getItemCoordinates(to);

  if (!fromCoords || !toCoords) return null;

  // Calculate haversine distance
  const R = 6371; // Earth's radius in km
  const dLat = ((toCoords.lat - fromCoords.lat) * Math.PI) / 180;
  const dLon = ((toCoords.lng - fromCoords.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((fromCoords.lat * Math.PI) / 180) *
      Math.cos((toCoords.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Determine default mode based on distance
  let mode: 'walking' | 'driving' | 'transit' = 'walking';
  if (distance > 3) mode = 'transit';
  if (distance > 10) mode = 'driving';

  // Use saved mode if available (excluding 'flight' which isn't a travel mode for this calculation)
  const savedMode = from.parsedNotes?.travelModeToNext;
  if (savedMode && savedMode !== 'flight') mode = savedMode;

  // Estimate duration
  const speeds = { walking: 5, transit: 25, driving: 40 };
  const durationMinutes = Math.round((distance / speeds[mode]) * 60);

  return {
    durationMinutes,
    distanceKm: Math.round(distance * 10) / 10,
    mode,
  };
}

/**
 * Get coordinates for an item
 */
function getItemCoordinates(item: EnrichedItineraryItem): { lat: number; lng: number } | null {
  const notes = item.parsedNotes;

  // For flights, use airport coordinates
  if (notes?.type === 'flight') {
    const airport = notes.to; // Use arrival airport for "from" location
    if (airport) {
      const coords = getAirportCoordinates(airport);
      if (coords) {
        return { lat: coords.latitude, lng: coords.longitude };
      }
    }
  }

  // Use destination coordinates
  const lat = item.destination?.latitude ?? notes?.latitude;
  const lng = item.destination?.longitude ?? notes?.longitude;

  if (lat && lng) {
    return { lat, lng };
  }

  return null;
}

/**
 * Calculate gap between two items (in minutes)
 */
function calculateGap(
  from: EnrichedItineraryItem,
  to: EnrichedItineraryItem,
  travelMinutes?: number
): number | null {
  const fromTime = getEffectiveTime(from);
  const toTime = getEffectiveTime(to);

  if (!fromTime || !toTime) return null;

  const fromMinutes = timeToMinutes(fromTime);
  const toMinutes = timeToMinutes(toTime);

  // Estimate duration at first location
  const duration = from.parsedNotes?.duration || 60;

  // Calculate available gap
  const gap = toMinutes - fromMinutes - duration - (travelMinutes || 0);

  return gap > 0 ? gap : null;
}
