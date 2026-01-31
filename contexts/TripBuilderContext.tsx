'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { Destination } from '@/types/destination';
import { useAuth } from './AuthContext';
import {
  getEstimatedDuration,
  calculateTravelTime,
  analyzeDayItinerary,
  predictCrowdLevel,
  isOutdoorCategory,
  formatDuration,
} from '@/lib/trip-intelligence';
import { isClosedOnDay, getHoursForDay } from '@/lib/utils/opening-hours';

// ============================================
// TYPES
// ============================================

export interface TripItem {
  id: string;
  destination: Destination;
  day: number;
  orderIndex: number;
  timeSlot?: string; // "09:00"
  duration: number; // minutes
  notes?: string;
  // Computed
  travelTimeFromPrev?: number;
  crowdLevel?: number;
  crowdLabel?: string;
  isOutdoor?: boolean;
}

export interface DayInsight {
  type: 'warning' | 'tip' | 'success';
  icon: 'clock' | 'route' | 'crowd' | 'weather' | 'food' | 'category';
  message: string;
  action?: string;
}

export interface TripHealth {
  score: number; // 0-100
  label: string;
  insights: DayInsight[];
  categoryBalance: Record<string, number>;
  totalWalkingTime: number;
  hasTimeConflicts: boolean;
  missingMeals: number[];
}

export interface TripDay {
  dayNumber: number;
  date?: string; // ISO date
  items: TripItem[];
  // Computed
  totalTime: number;
  totalTravel: number;
  isOverstuffed: boolean;
  weather?: {
    condition: string;
    temp: number;
    isRainy: boolean;
  };
}

export interface ActiveTrip {
  id?: string; // Supabase ID if saved
  title: string;
  city: string;
  startDate?: string;
  endDate?: string;
  days: TripDay[];
  travelers: number;
  // State
  isModified: boolean;
  lastSaved?: string;
}

export interface SavedTripSummary {
  id: string;
  title: string;
  destination: string;
  start_date?: string;
  end_date?: string;
  status: string;
  cover_image?: string;
  itemCount: number;
  updated_at: string;
}

export interface TripBuilderContextType {
  // State
  activeTrip: ActiveTrip | null;
  savedTrips: SavedTripSummary[];
  isPanelOpen: boolean;
  isBuilding: boolean;
  isLoadingTrips: boolean;
  isSuggestingNext: boolean;

  // Actions
  startTrip: (city: string, days?: number, startDate?: string) => void;
  addToTrip: (destination: Destination, day?: number, timeSlot?: string) => void;
  removeFromTrip: (itemId: string) => void;
  moveItem: (itemId: string, toDay: number, toIndex: number) => void;
  updateItemTime: (itemId: string, timeSlot: string) => void;
  updateItemNotes: (itemId: string, notes: string) => void;
  addDay: () => void;
  removeDay: (dayNumber: number) => void;
  updateTripDetails: (updates: { title?: string; startDate?: string; travelers?: number }) => void;
  clearTrip: () => void;
  saveTrip: () => Promise<string | null>;
  loadTrip: (tripId: string) => Promise<void>;
  refreshSavedTrips: () => Promise<void>;
  switchToTrip: (tripId: string) => Promise<void>;
  reorderItems: (dayNumber: number, fromIndex: number, toIndex: number) => void;

  // Panel
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;

  // AI Actions
  generateItinerary: (city: string, days: number, preferences?: {
    categories?: string[];
    style?: string;
    mustVisit?: string[];
  }) => Promise<void>;
  optimizeDay: (dayNumber: number) => void;
  suggestNextItem: (dayNumber: number) => Promise<Destination | null>;
  moveItemToDay: (itemId: string, fromDay: number, toDay: number) => void;
  autoScheduleDay: (dayNumber: number) => void;
  getDayInsights: (dayNumber: number) => DayInsight[];
  getTripHealth: () => TripHealth;

  // Computed
  totalItems: number;
  tripDuration: number;
  canAddMore: (day: number) => boolean;
}

const TripBuilderContext = createContext<TripBuilderContextType | null>(null);

// ============================================
// UTILITIES
// ============================================

const generateId = () => `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const DEFAULT_TIME_SLOTS: Record<string, string> = {
  'breakfast': '09:00',
  'brunch': '10:30',
  'cafe': '10:00',
  'coffee': '09:30',
  'lunch': '12:30',
  'restaurant': '19:00',
  'fine dining': '19:30',
  'bar': '21:00',
  'cocktail bar': '21:30',
  'museum': '10:00',
  'gallery': '14:00',
  'park': '11:00',
  'temple': '09:00',
  'shrine': '09:00',
  'shopping': '14:00',
  'hotel': '15:00',
  'default': '14:00',
};

function getDefaultTimeSlot(category?: string | null): string {
  if (!category) return DEFAULT_TIME_SLOTS.default;
  const normalized = category.toLowerCase();

  for (const [key, time] of Object.entries(DEFAULT_TIME_SLOTS)) {
    if (normalized.includes(key)) return time;
  }
  return DEFAULT_TIME_SLOTS.default;
}

function sortItemsByTime(items: TripItem[]): TripItem[] {
  return [...items].sort((a, b) => {
    if (!a.timeSlot && !b.timeSlot) return a.orderIndex - b.orderIndex;
    if (!a.timeSlot) return 1;
    if (!b.timeSlot) return -1;
    return a.timeSlot.localeCompare(b.timeSlot);
  }).map((item, idx) => ({ ...item, orderIndex: idx }));
}

function calculateTripMetrics(days: TripDay[]): TripDay[] {
  return days.map(day => {
    const analysis = analyzeDayItinerary(
      day.items.map(item => ({
        id: item.id,
        title: item.destination.name,
        time: item.timeSlot,
        category: item.destination.category,
        latitude: item.destination.latitude,
        longitude: item.destination.longitude,
        customDuration: item.duration,
      }))
    );

    // Add travel times and crowd levels to items
    const itemsWithMetrics = day.items.map((item, idx) => {
      const crowd = predictCrowdLevel(
        item.destination.category,
        item.timeSlot,
        day.date ? new Date(day.date).getDay() : undefined
      );

      return {
        ...item,
        travelTimeFromPrev: analysis.timeSlots[idx]?.travelTimeFromPrev,
        crowdLevel: crowd.level,
        crowdLabel: crowd.label,
        isOutdoor: isOutdoorCategory(item.destination.category),
      };
    });

    return {
      ...day,
      items: itemsWithMetrics,
      totalTime: analysis.totalTime,
      totalTravel: analysis.totalTravelTime,
      isOverstuffed: analysis.isOverstuffed,
    };
  });
}

// ============================================
// PROVIDER
// ============================================

export function TripBuilderProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [savedTrips, setSavedTrips] = useState<SavedTripSummary[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [userDismissedPanel, setUserDismissedPanel] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  const [isSuggestingNext, setIsSuggestingNext] = useState(false);

  // Fetch saved trips from server
  const refreshSavedTrips = useCallback(async () => {
    if (!user) {
      setSavedTrips([]);
      return;
    }

    setIsLoadingTrips(true);
    try {
      const response = await fetch('/api/trips?limit=10');
      if (response.ok) {
        const data = await response.json();
        setSavedTrips(data.trips || []);
      }
    } catch (error) {
      console.error('Error fetching saved trips:', error);
    } finally {
      setIsLoadingTrips(false);
    }
  }, [user]);

  // Fetch saved trips when user changes
  useEffect(() => {
    refreshSavedTrips();
  }, [user, refreshSavedTrips]);

  // Load trip and dismissal state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('urban-manual-active-trip');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setActiveTrip(parsed);
      } catch (e) {
        console.error('Failed to load saved trip:', e);
      }
    }
    // Restore panel dismissal state
    const dismissed = localStorage.getItem('urban-manual-panel-dismissed');
    if (dismissed === 'true') {
      setUserDismissedPanel(true);
    }
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    if (activeTrip) {
      localStorage.setItem('urban-manual-active-trip', JSON.stringify(activeTrip));
    } else {
      localStorage.removeItem('urban-manual-active-trip');
      // Clear dismissal state when trip is cleared
      localStorage.removeItem('urban-manual-panel-dismissed');
      setUserDismissedPanel(false);
    }
  }, [activeTrip]);

  // Persist panel dismissal state
  useEffect(() => {
    if (userDismissedPanel) {
      localStorage.setItem('urban-manual-panel-dismissed', 'true');
    } else {
      localStorage.removeItem('urban-manual-panel-dismissed');
    }
  }, [userDismissedPanel]);

  // Auto-open panel when trip has items (only if user hasn't dismissed it)
  useEffect(() => {
    if (activeTrip && activeTrip.days.some(d => d.items.length > 0) && !isPanelOpen && !userDismissedPanel) {
      setIsPanelOpen(true);
    }
  }, [activeTrip?.days, userDismissedPanel]);

  // Start a new trip
  const startTrip = useCallback((city: string, days: number = 1, startDate?: string) => {
    const tripDays: TripDay[] = Array.from({ length: days }, (_, i) => ({
      dayNumber: i + 1,
      date: startDate ? new Date(new Date(startDate).getTime() + i * 86400000).toISOString().split('T')[0] : undefined,
      items: [],
      totalTime: 0,
      totalTravel: 0,
      isOverstuffed: false,
    }));

    setActiveTrip({
      title: `${city} Trip`,
      city,
      startDate,
      endDate: startDate && days > 1
        ? new Date(new Date(startDate).getTime() + (days - 1) * 86400000).toISOString().split('T')[0]
        : startDate,
      days: tripDays,
      travelers: 1,
      isModified: false,
    });
    setIsPanelOpen(true);
    setUserDismissedPanel(false);
  }, []);

  // Add destination to trip
  const addToTrip = useCallback((destination: Destination, day?: number, timeSlot?: string) => {
    setActiveTrip(prev => {
      // If no active trip, start one
      if (!prev) {
        const newTrip: ActiveTrip = {
          title: `${destination.city || 'My'} Trip`,
          city: destination.city || '',
          days: [{
            dayNumber: 1,
            items: [],
            totalTime: 0,
            totalTravel: 0,
            isOverstuffed: false,
          }],
          travelers: 1,
          isModified: true,
        };
        prev = newTrip;
      }

      const targetDay = day || 1;
      const duration = getEstimatedDuration(destination.category);
      const slot = timeSlot || getDefaultTimeSlot(destination.category);

      // Ensure we have enough days
      const days = [...prev.days];
      while (days.length < targetDay) {
        days.push({
          dayNumber: days.length + 1,
          items: [],
          totalTime: 0,
          totalTravel: 0,
          isOverstuffed: false,
        });
      }

      // Add item to day
      const dayIndex = targetDay - 1;
      const newItem: TripItem = {
        id: generateId(),
        destination,
        day: targetDay,
        orderIndex: days[dayIndex].items.length,
        timeSlot: slot,
        duration,
        isOutdoor: isOutdoorCategory(destination.category),
      };

      days[dayIndex] = {
        ...days[dayIndex],
        items: sortItemsByTime([...days[dayIndex].items, newItem]),
      };

      // Recalculate metrics
      const updatedDays = calculateTripMetrics(days);

      return {
        ...prev,
        days: updatedDays,
        isModified: true,
      };
    });

    // Open panel when adding and reset dismissal state
    setIsPanelOpen(true);
    setUserDismissedPanel(false);
  }, []);

  // Remove item from trip
  const removeFromTrip = useCallback((itemId: string) => {
    setActiveTrip(prev => {
      if (!prev) return null;

      const days = prev.days.map(day => ({
        ...day,
        items: day.items
          .filter(item => item.id !== itemId)
          .map((item, idx) => ({ ...item, orderIndex: idx })),
      }));

      const updatedDays = calculateTripMetrics(days);

      return {
        ...prev,
        days: updatedDays,
        isModified: true,
      };
    });
  }, []);

  // Move item to different day/position
  const moveItem = useCallback((itemId: string, toDay: number, toIndex: number) => {
    setActiveTrip(prev => {
      if (!prev) return null;

      // Find the item
      let movedItem: TripItem | null = null;
      const days = prev.days.map(day => {
        const item = day.items.find(i => i.id === itemId);
        if (item) {
          movedItem = { ...item, day: toDay };
        }
        return {
          ...day,
          items: day.items.filter(i => i.id !== itemId),
        };
      });

      if (!movedItem) return prev;

      // Ensure target day exists
      while (days.length < toDay) {
        days.push({
          dayNumber: days.length + 1,
          items: [],
          totalTime: 0,
          totalTravel: 0,
          isOverstuffed: false,
        });
      }

      // Insert at new position
      const dayIndex = toDay - 1;
      const items = [...days[dayIndex].items];
      items.splice(toIndex, 0, movedItem);

      days[dayIndex] = {
        ...days[dayIndex],
        items: items.map((item, idx) => ({ ...item, orderIndex: idx })),
      };

      const updatedDays = calculateTripMetrics(days);

      return {
        ...prev,
        days: updatedDays,
        isModified: true,
      };
    });
  }, []);

  // Update item time
  const updateItemTime = useCallback((itemId: string, timeSlot: string) => {
    setActiveTrip(prev => {
      if (!prev) return null;

      const days = prev.days.map(day => ({
        ...day,
        items: sortItemsByTime(
          day.items.map(item =>
            item.id === itemId ? { ...item, timeSlot } : item
          )
        ),
      }));

      const updatedDays = calculateTripMetrics(days);

      return {
        ...prev,
        days: updatedDays,
        isModified: true,
      };
    });
  }, []);

  // Update item notes
  const updateItemNotes = useCallback((itemId: string, notes: string) => {
    setActiveTrip(prev => {
      if (!prev) return null;

      const days = prev.days.map(day => ({
        ...day,
        items: day.items.map(item =>
          item.id === itemId ? { ...item, notes } : item
        ),
      }));

      return {
        ...prev,
        days,
        isModified: true,
      };
    });
  }, []);

  // Add a new day to the trip
  const addDay = useCallback(() => {
    setActiveTrip(prev => {
      if (!prev) return null;

      const newDayNumber = prev.days.length + 1;
      const lastDate = prev.days[prev.days.length - 1]?.date;
      const newDate = lastDate
        ? new Date(new Date(lastDate).getTime() + 86400000).toISOString().split('T')[0]
        : undefined;

      const newDay: TripDay = {
        dayNumber: newDayNumber,
        date: newDate,
        items: [],
        totalTime: 0,
        totalTravel: 0,
        isOverstuffed: false,
      };

      return {
        ...prev,
        days: [...prev.days, newDay],
        endDate: newDate || prev.endDate,
        isModified: true,
      };
    });
  }, []);

  // Remove a day from the trip
  const removeDay = useCallback((dayNumber: number) => {
    setActiveTrip(prev => {
      if (!prev || prev.days.length <= 1) return prev;

      const days = prev.days
        .filter(d => d.dayNumber !== dayNumber)
        .map((d, idx) => ({
          ...d,
          dayNumber: idx + 1,
          items: d.items.map(item => ({ ...item, day: idx + 1 })),
        }));

      const lastDate = days[days.length - 1]?.date;

      return {
        ...prev,
        days: calculateTripMetrics(days),
        endDate: lastDate || prev.endDate,
        isModified: true,
      };
    });
  }, []);

  // Update trip details
  const updateTripDetails = useCallback((updates: { title?: string; startDate?: string; travelers?: number }) => {
    setActiveTrip(prev => {
      if (!prev) return null;

      let newDays = prev.days;

      // If startDate changed, recalculate all day dates
      if (updates.startDate && updates.startDate !== prev.startDate) {
        const start = new Date(updates.startDate);
        newDays = prev.days.map((day, idx) => ({
          ...day,
          date: new Date(start.getTime() + idx * 86400000).toISOString().split('T')[0],
        }));
      }

      return {
        ...prev,
        title: updates.title ?? prev.title,
        startDate: updates.startDate ?? prev.startDate,
        endDate: updates.startDate
          ? new Date(new Date(updates.startDate).getTime() + (prev.days.length - 1) * 86400000).toISOString().split('T')[0]
          : prev.endDate,
        travelers: updates.travelers ?? prev.travelers,
        days: newDays,
        isModified: true,
      };
    });
  }, []);

  // Reorder items within a day (for drag-and-drop)
  const reorderItems = useCallback((dayNumber: number, fromIndex: number, toIndex: number) => {
    setActiveTrip(prev => {
      if (!prev) return null;

      const dayIndex = dayNumber - 1;
      if (dayIndex >= prev.days.length) return prev;

      const day = prev.days[dayIndex];
      const items = [...day.items];

      // Move item
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);

      // Recalculate order indexes and time slots based on position
      const timeSlots = ['09:00', '10:30', '12:00', '14:00', '16:00', '18:00', '20:00', '21:30'];
      const reordered = items.map((item, idx) => ({
        ...item,
        orderIndex: idx,
        timeSlot: timeSlots[idx] || timeSlots[timeSlots.length - 1],
      }));

      const days = [...prev.days];
      days[dayIndex] = { ...days[dayIndex], items: reordered };

      return {
        ...prev,
        days: calculateTripMetrics(days),
        isModified: true,
      };
    });
  }, []);

  // Clear trip
  const clearTrip = useCallback(() => {
    setActiveTrip(null);
    setIsPanelOpen(false);
    localStorage.removeItem('urban-manual-active-trip');
  }, []);

  // Save trip to Supabase
  const saveTrip = useCallback(async (): Promise<string | null> => {
    if (!activeTrip || !user) return null;

    try {
      const response = await fetch('/api/trips', {
        method: activeTrip.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeTrip.id,
          title: activeTrip.title,
          destination: activeTrip.city,
          start_date: activeTrip.startDate,
          end_date: activeTrip.endDate,
          items: activeTrip.days.flatMap(day =>
            day.items.map(item => ({
              destination_slug: item.destination.slug,
              day: item.day,
              order_index: item.orderIndex,
              time: item.timeSlot,
              title: item.destination.name,
              notes: JSON.stringify({
                duration: item.duration,
                category: item.destination.category,
                image: item.destination.image,
                city: item.destination.city,
              }),
            }))
          ),
        }),
      });

      if (!response.ok) throw new Error('Failed to save trip');

      const data = await response.json();

      setActiveTrip(prev => prev ? {
        ...prev,
        id: data.id,
        isModified: false,
        lastSaved: new Date().toISOString(),
      } : null);

      return data.id;
    } catch (error) {
      console.error('Error saving trip:', error);
      return null;
    }
  }, [activeTrip, user]);

  // Load trip from Supabase
  const loadTrip = useCallback(async (tripId: string) => {
    try {
      const response = await fetch(`/api/trips/${tripId}`);
      if (!response.ok) throw new Error('Failed to load trip');

      const data = await response.json();

      // Convert to ActiveTrip format
      const daysMap = new Map<number, TripItem[]>();

      for (const item of data.items || []) {
        const day = item.day || 1;
        if (!daysMap.has(day)) daysMap.set(day, []);

        // Parse notes for additional metadata
        let notes: Record<string, any> = {};
        try {
          notes = item.notes ? JSON.parse(item.notes) : {};
        } catch {
          notes = {};
        }

        // Use enriched destination data from API, fallback to notes if needed
        const destination = item.destination || {
          slug: item.destination_slug,
          name: item.title,
          category: notes.category,
          city: notes.city || data.destination,
          image: notes.image,
        };

        daysMap.get(day)!.push({
          id: item.id,
          destination: destination as Destination,
          day,
          orderIndex: item.order_index,
          timeSlot: item.time,
          duration: notes.duration || getEstimatedDuration(destination.category),
          notes: notes.raw || undefined,
          isOutdoor: isOutdoorCategory(destination.category),
        });
      }

      // Calculate number of days from trip dates or items
      const startDate = data.start_date ? new Date(data.start_date) : null;
      const endDate = data.end_date ? new Date(data.end_date) : null;
      let numDays = 1;

      if (startDate && endDate) {
        numDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
      }

      // Ensure we have at least as many days as items require
      const maxItemDay = Math.max(...Array.from(daysMap.keys()), 0);
      numDays = Math.max(numDays, maxItemDay);

      const days: TripDay[] = Array.from({ length: numDays }, (_, i) => {
        const dayNumber = i + 1;
        const dayDate = startDate
          ? new Date(startDate.getTime() + i * 86400000).toISOString().split('T')[0]
          : undefined;

        return {
          dayNumber,
          date: dayDate,
          items: sortItemsByTime(daysMap.get(dayNumber) || []),
          totalTime: 0,
          totalTravel: 0,
          isOverstuffed: false,
        };
      });

      setActiveTrip({
        id: data.id,
        title: data.title,
        city: data.destination,
        startDate: data.start_date,
        endDate: data.end_date,
        days: calculateTripMetrics(days),
        travelers: 1,
        isModified: false,
        lastSaved: data.updated_at,
      });

      setIsPanelOpen(true);
      setUserDismissedPanel(false);
    } catch (error) {
      console.error('Error loading trip:', error);
    }
  }, []);

  // Generate full itinerary with AI
  const generateItinerary = useCallback(async (
    city: string,
    days: number,
    preferences?: { categories?: string[]; style?: string; mustVisit?: string[] }
  ) => {
    setIsBuilding(true);

    try {
      const response = await fetch('/api/intelligence/itinerary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, days, preferences }),
      });

      if (!response.ok) throw new Error('Failed to generate itinerary');

      const data = await response.json();

      // Convert to ActiveTrip format
      const tripDays: TripDay[] = Array.from({ length: days }, (_, i) => ({
        dayNumber: i + 1,
        items: [],
        totalTime: 0,
        totalTravel: 0,
        isOverstuffed: false,
      }));

      for (const item of data.items || []) {
        const dayIndex = (item.day || 1) - 1;
        if (dayIndex >= tripDays.length) continue;

        tripDays[dayIndex].items.push({
          id: generateId(),
          destination: item.destination,
          day: item.day,
          orderIndex: tripDays[dayIndex].items.length,
          timeSlot: item.time_of_day === 'morning' ? '10:00'
            : item.time_of_day === 'afternoon' ? '14:00'
            : item.time_of_day === 'evening' ? '19:00' : '12:00',
          duration: item.duration_minutes || 90,
        });
      }

      setActiveTrip({
        title: `${city} Trip`,
        city,
        days: calculateTripMetrics(tripDays),
        travelers: 1,
        isModified: true,
      });

      setIsPanelOpen(true);
      setUserDismissedPanel(false);
    } catch (error) {
      console.error('Error generating itinerary:', error);
    } finally {
      setIsBuilding(false);
    }
  }, []);

  // Optimize a single day's routing
  const optimizeDay = useCallback((dayNumber: number) => {
    setActiveTrip(prev => {
      if (!prev) return null;

      const dayIndex = dayNumber - 1;
      if (dayIndex >= prev.days.length) return prev;

      const day = prev.days[dayIndex];
      if (day.items.length <= 1) return prev;

      // TSP-lite: sort by nearest neighbor
      const items = [...day.items];
      const optimized: TripItem[] = [];

      // Start with first item
      let current = items.shift()!;
      optimized.push(current);

      while (items.length > 0) {
        let nearestIdx = 0;
        let nearestDist = Infinity;

        for (let i = 0; i < items.length; i++) {
          const travel = calculateTravelTime(
            current.destination.latitude,
            current.destination.longitude,
            items[i].destination.latitude,
            items[i].destination.longitude
          );
          const dist = travel?.distance || Infinity;
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIdx = i;
          }
        }

        current = items.splice(nearestIdx, 1)[0];
        optimized.push(current);
      }

      // Reassign order indexes and time slots
      const timeSlots = ['09:30', '11:30', '13:30', '15:30', '18:00', '20:00'];
      const reordered = optimized.map((item, idx) => ({
        ...item,
        orderIndex: idx,
        timeSlot: timeSlots[idx] || timeSlots[timeSlots.length - 1],
      }));

      const days = [...prev.days];
      days[dayIndex] = { ...days[dayIndex], items: reordered };

      return {
        ...prev,
        days: calculateTripMetrics(days),
        isModified: true,
      };
    });
  }, []);

  // Suggest next item for a day
  const suggestNextItem = useCallback(async (dayNumber: number): Promise<Destination | null> => {
    if (!activeTrip) return null;

    const day = activeTrip.days[dayNumber - 1];
    if (!day) return null;

    setIsSuggestingNext(true);
    try {
      const response = await fetch('/api/intelligence/suggest-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: activeTrip.city,
          currentItems: day.items.map(i => i.destination.slug),
          timeOfDay: day.items.length < 2 ? 'morning' : day.items.length < 4 ? 'afternoon' : 'evening',
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.destination || null;
    } catch {
      return null;
    } finally {
      setIsSuggestingNext(false);
    }
  }, [activeTrip]);

  // Move item to a different day
  const moveItemToDay = useCallback((itemId: string, fromDay: number, toDay: number) => {
    if (fromDay === toDay) return;

    setActiveTrip(prev => {
      if (!prev) return null;

      // Find and remove item from source day
      let movedItem: TripItem | null = null;
      const days = prev.days.map(day => {
        if (day.dayNumber === fromDay) {
          const item = day.items.find(i => i.id === itemId);
          if (item) {
            movedItem = { ...item, day: toDay };
          }
          return {
            ...day,
            items: day.items.filter(i => i.id !== itemId),
          };
        }
        return day;
      });

      if (!movedItem) return prev;

      // Add to target day
      const targetIdx = toDay - 1;
      if (targetIdx >= 0 && targetIdx < days.length) {
        days[targetIdx] = {
          ...days[targetIdx],
          items: [...days[targetIdx].items, movedItem],
        };
      }

      return {
        ...prev,
        days: calculateTripMetrics(days),
        isModified: true,
      };
    });
  }, []);

  // Auto-schedule a day with optimal times
  const autoScheduleDay = useCallback((dayNumber: number) => {
    setActiveTrip(prev => {
      if (!prev) return null;

      const dayIndex = dayNumber - 1;
      if (dayIndex >= prev.days.length) return prev;

      const day = prev.days[dayIndex];
      if (day.items.length === 0) return prev;

      // Smart time assignment based on category
      const scheduled = day.items.map((item, idx) => {
        const cat = (item.destination.category || '').toLowerCase();
        let baseTime: string;

        // Category-based scheduling
        if (cat.includes('coffee') || cat.includes('breakfast') || cat.includes('bakery')) {
          baseTime = '09:00';
        } else if (cat.includes('brunch')) {
          baseTime = '10:30';
        } else if (cat.includes('museum') || cat.includes('gallery') || cat.includes('temple')) {
          baseTime = idx === 0 ? '10:00' : '14:00';
        } else if (cat.includes('lunch') || (cat.includes('restaurant') && idx < day.items.length / 2)) {
          baseTime = '12:30';
        } else if (cat.includes('park') || cat.includes('garden')) {
          baseTime = '15:00';
        } else if (cat.includes('bar') || cat.includes('cocktail')) {
          baseTime = '19:00';
        } else if (cat.includes('restaurant') || cat.includes('dining')) {
          baseTime = '19:30';
        } else if (cat.includes('club') || cat.includes('nightlife')) {
          baseTime = '22:00';
        } else {
          // Default progressive times
          const defaultTimes = ['10:00', '12:00', '14:30', '16:30', '18:30', '20:00'];
          baseTime = defaultTimes[idx] || '14:00';
        }

        return { ...item, timeSlot: baseTime };
      });

      // Sort by time
      scheduled.sort((a, b) => (a.timeSlot || '').localeCompare(b.timeSlot || ''));

      // Reassign order indexes
      const reordered = scheduled.map((item, idx) => ({ ...item, orderIndex: idx }));

      const days = [...prev.days];
      days[dayIndex] = { ...days[dayIndex], items: reordered };

      return {
        ...prev,
        days: calculateTripMetrics(days),
        isModified: true,
      };
    });
  }, []);

  // Get insights for a specific day
  const getDayInsights = useCallback((dayNumber: number): DayInsight[] => {
    if (!activeTrip) return [];

    const day = activeTrip.days[dayNumber - 1];
    if (!day) return [];

    const insights: DayInsight[] = [];

    // Check for closure days using actual opening hours data
    if (day.date) {
      const dayDate = new Date(day.date);
      const dayOfWeek = dayDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      day.items.forEach(item => {
        const openingHours = item.destination.opening_hours_json;
        if (openingHours) {
          const closureCheck = isClosedOnDay(openingHours, dayOfWeek);
          if (closureCheck.isClosed) {
            const hoursText = getHoursForDay(openingHours, dayOfWeek);
            insights.push({
              type: 'warning',
              icon: 'clock',
              message: `${item.destination.name} is closed on ${dayNames[dayOfWeek]}s`,
              action: hoursText ? `Hours: ${hoursText}` : 'Move to another day',
            });
          }
        }
      });
    }

    // Check for time conflicts
    const times = day.items.filter(i => i.timeSlot).map(i => i.timeSlot!);
    const uniqueTimes = new Set(times);
    if (times.length > uniqueTimes.size) {
      insights.push({
        type: 'warning',
        icon: 'clock',
        message: 'Some activities have overlapping times',
        action: 'Auto-schedule',
      });
    }

    // Check if day is overstuffed
    if (day.isOverstuffed) {
      insights.push({
        type: 'warning',
        icon: 'clock',
        message: `Day is too packed (${formatDuration(day.totalTime)})`,
        action: 'Move items',
      });
    }

    // Check for long travel gaps
    const longTravel = day.items.find(i => i.travelTimeFromPrev && i.travelTimeFromPrev > 45);
    if (longTravel) {
      insights.push({
        type: 'tip',
        icon: 'route',
        message: `Long travel to ${longTravel.destination.name}`,
        action: 'Optimize route',
      });
    }

    // Check for meal gaps
    const hasMorningFood = day.items.some(i => {
      const cat = (i.destination.category || '').toLowerCase();
      const time = parseInt(i.timeSlot?.split(':')[0] || '0');
      return (cat.includes('cafe') || cat.includes('breakfast') || cat.includes('bakery')) && time < 11;
    });
    const hasLunch = day.items.some(i => {
      const cat = (i.destination.category || '').toLowerCase();
      const time = parseInt(i.timeSlot?.split(':')[0] || '0');
      return (cat.includes('restaurant') || cat.includes('lunch')) && time >= 11 && time <= 14;
    });
    const hasDinner = day.items.some(i => {
      const cat = (i.destination.category || '').toLowerCase();
      const time = parseInt(i.timeSlot?.split(':')[0] || '0');
      return cat.includes('restaurant') && time >= 18;
    });

    if (day.items.length >= 3 && !hasLunch) {
      insights.push({
        type: 'tip',
        icon: 'food',
        message: 'No lunch spot planned',
        action: 'Add restaurant',
      });
    }
    if (day.items.length >= 4 && !hasDinner) {
      insights.push({
        type: 'tip',
        icon: 'food',
        message: 'No dinner reservation',
        action: 'Add restaurant',
      });
    }

    // Check for outdoor activities on rainy day
    if (day.weather?.isRainy) {
      const outdoorItems = day.items.filter(i => i.isOutdoor);
      if (outdoorItems.length > 0) {
        insights.push({
          type: 'warning',
          icon: 'weather',
          message: `Rain expected - ${outdoorItems.length} outdoor activit${outdoorItems.length > 1 ? 'ies' : 'y'}`,
          action: 'Swap days',
        });
      }
    }

    // Good insights
    if (day.items.length >= 3 && day.totalTravel < 60 && !day.isOverstuffed) {
      insights.push({
        type: 'success',
        icon: 'route',
        message: 'Well-optimized route!',
      });
    }

    return insights;
  }, [activeTrip]);

  // Get overall trip health score
  const getTripHealth = useCallback((): TripHealth => {
    if (!activeTrip) {
      return {
        score: 0,
        label: 'No trip',
        insights: [],
        categoryBalance: {},
        totalWalkingTime: 0,
        hasTimeConflicts: false,
        missingMeals: [],
      };
    }

    let score = 100;
    const insights: DayInsight[] = [];
    const categoryBalance: Record<string, number> = {};
    let totalWalkingTime = 0;
    let hasTimeConflicts = false;
    const missingMeals: number[] = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Analyze each day
    activeTrip.days.forEach(day => {
      // Check for closure days using actual opening hours
      if (day.date) {
        const dayDate = new Date(day.date);
        const dayOfWeek = dayDate.getDay();

        day.items.forEach(item => {
          const openingHours = item.destination.opening_hours_json;
          if (openingHours) {
            const closureCheck = isClosedOnDay(openingHours, dayOfWeek);
            if (closureCheck.isClosed) {
              score -= 15; // Significant penalty for scheduling on closure days
              insights.push({
                type: 'warning',
                icon: 'clock',
                message: `${item.destination.name} is closed on ${dayNames[dayOfWeek]}s (Day ${day.dayNumber})`,
                action: 'Reschedule',
              });
            }
          }
        });
      }

      // Count categories
      day.items.forEach(item => {
        const cat = item.destination.category || 'other';
        categoryBalance[cat] = (categoryBalance[cat] || 0) + 1;
      });

      // Sum travel time
      totalWalkingTime += day.totalTravel;

      // Check for issues
      if (day.isOverstuffed) {
        score -= 10;
      }

      // Check time conflicts
      const times = day.items.filter(i => i.timeSlot).map(i => i.timeSlot!);
      if (times.length !== new Set(times).size) {
        hasTimeConflicts = true;
        score -= 5;
      }

      // Check meal coverage
      const dayHasLunch = day.items.some(i => {
        const cat = (i.destination.category || '').toLowerCase();
        const time = parseInt(i.timeSlot?.split(':')[0] || '0');
        return cat.includes('restaurant') && time >= 11 && time <= 14;
      });
      if (day.items.length >= 3 && !dayHasLunch) {
        missingMeals.push(day.dayNumber);
        score -= 3;
      }
    });

    // Category diversity bonus/penalty
    const categoryCount = Object.keys(categoryBalance).length;
    if (categoryCount >= 4) score += 5;
    if (categoryCount <= 2 && activeTrip.days.some(d => d.items.length >= 4)) {
      insights.push({
        type: 'tip',
        icon: 'category',
        message: 'Try adding variety - all similar activities',
      });
      score -= 5;
    }

    // Travel time efficiency
    const avgTravelPerDay = totalWalkingTime / activeTrip.days.length;
    if (avgTravelPerDay > 90) {
      insights.push({
        type: 'tip',
        icon: 'route',
        message: 'High travel time - group nearby places',
      });
      score -= 5;
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    // Generate label
    let label: string;
    if (score >= 90) label = 'Excellent';
    else if (score >= 75) label = 'Good';
    else if (score >= 60) label = 'Fair';
    else if (score >= 40) label = 'Needs work';
    else label = 'Poor';

    return {
      score,
      label,
      insights,
      categoryBalance,
      totalWalkingTime,
      hasTimeConflicts,
      missingMeals,
    };
  }, [activeTrip]);

  // Switch to an existing saved trip
  const switchToTrip = useCallback(async (tripId: string) => {
    // If there's an unsaved active trip, prompt to save
    if (activeTrip?.isModified && activeTrip.id !== tripId) {
      // For now, just clear - in future could prompt to save
      localStorage.removeItem('urban-manual-active-trip');
    }

    // Load the new trip
    await loadTrip(tripId);
  }, [activeTrip, loadTrip]);

  // Panel controls
  const openPanel = useCallback(() => {
    setIsPanelOpen(true);
    setUserDismissedPanel(false);
  }, []);
  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
    setUserDismissedPanel(true);
  }, []);
  const togglePanel = useCallback(() => {
    setIsPanelOpen((p: boolean) => {
      const newState = !p;
      // If closing the panel, mark as dismissed
      if (!newState) {
        setUserDismissedPanel(true);
      } else {
        setUserDismissedPanel(false);
      }
      return newState;
    });
  }, []);

  // Computed values
  const totalItems = useMemo(() =>
    activeTrip?.days.reduce((sum, day) => sum + day.items.length, 0) || 0
  , [activeTrip]);

  const tripDuration = useMemo(() =>
    activeTrip?.days.length || 0
  , [activeTrip]);

  const canAddMore = useCallback((day: number) => {
    if (!activeTrip) return true;
    const dayData = activeTrip.days[day - 1];
    if (!dayData) return true;
    return !dayData.isOverstuffed && dayData.items.length < 8;
  }, [activeTrip]);

  const value: TripBuilderContextType = useMemo(() => ({
    activeTrip,
    savedTrips,
    isPanelOpen,
    isBuilding,
    isLoadingTrips,
    isSuggestingNext,
    startTrip,
    addToTrip,
    removeFromTrip,
    moveItem,
    updateItemTime,
    updateItemNotes,
    addDay,
    removeDay,
    updateTripDetails,
    clearTrip,
    saveTrip,
    loadTrip,
    refreshSavedTrips,
    switchToTrip,
    reorderItems,
    openPanel,
    closePanel,
    togglePanel,
    generateItinerary,
    optimizeDay,
    suggestNextItem,
    moveItemToDay,
    autoScheduleDay,
    getDayInsights,
    getTripHealth,
    totalItems,
    tripDuration,
    canAddMore,
  }), [
    activeTrip, savedTrips, isPanelOpen, isBuilding, isLoadingTrips, isSuggestingNext,
    startTrip, addToTrip, removeFromTrip, moveItem, updateItemTime, updateItemNotes,
    addDay, removeDay, updateTripDetails, clearTrip, saveTrip, loadTrip,
    refreshSavedTrips, switchToTrip, reorderItems, openPanel, closePanel, togglePanel,
    generateItinerary, optimizeDay, suggestNextItem, moveItemToDay, autoScheduleDay,
    getDayInsights, getTripHealth, totalItems, tripDuration, canAddMore,
  ]);

  return (
    <TripBuilderContext.Provider value={value}>
      {children}
    </TripBuilderContext.Provider>
  );
}

export function useTripBuilder() {
  const context = useContext(TripBuilderContext);
  if (!context) {
    throw new Error('useTripBuilder must be used within a TripBuilderProvider');
  }
  return context;
}
