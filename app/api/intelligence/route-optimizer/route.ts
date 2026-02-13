import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, createValidationError, createUnauthorizedError } from '@/lib/errors';
import { createServerClient } from '@/lib/supabase/server';
import { parseItineraryNotes } from '@/types/trip';
import {
  suggestTravelMode,
  estimateRealisticTravelMinutes,
  type RealisticTravelMode,
} from '@/lib/trip-intelligence';

interface RouteItem {
  id: string;
  title: string;
  latitude?: number | null;
  longitude?: number | null;
  time?: string | null;
  category?: string | null;
}

interface RouteLeg {
  fromId: string;
  toId: string;
  distanceKm: number;
  durationMinutes: number;
  mode: RealisticTravelMode;
}

// Calculate distance between two points using Haversine formula
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate realistic travel time (in minutes) between two items,
 * using distance-based mode selection.
 */
function travelTimeBetween(a: RouteItem, b: RouteItem): number {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) {
    return 0;
  }
  const dist = haversineDistance(a.latitude!, a.longitude!, b.latitude!, b.longitude!);
  const mode = suggestTravelMode(dist);
  return estimateRealisticTravelMinutes(dist, mode);
}

/**
 * Calculate the total travel time for a route (sum of consecutive legs).
 */
function routeTravelTime(route: RouteItem[]): number {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += travelTimeBetween(route[i], route[i + 1]);
  }
  return total;
}

// ============================================================
// Time-window constraints
// ============================================================

/** Categories that should be scheduled in the morning (before 10:00) */
const BREAKFAST_CATEGORIES = new Set([
  'breakfast', 'bakery', 'brunch', 'coffee shop', 'cafe',
]);

/** Categories that should be scheduled in the evening (19:00+) */
const DINNER_CATEGORIES = new Set([
  'fine dining', 'dinner',
]);

/** Categories that should be visited during daytime (10:00-17:00) */
const DAYTIME_CATEGORIES = new Set([
  'museum', 'art museum', 'history museum', 'science museum',
  'gallery', 'exhibition', 'zoo', 'aquarium', 'botanical garden',
]);

type TimeWindow = { earliest: number; latest: number }; // hours (0-24)

function getTimeWindow(category?: string | null): TimeWindow | null {
  if (!category) return null;
  const cat = category.toLowerCase().trim();

  for (const breakfast of BREAKFAST_CATEGORIES) {
    if (cat.includes(breakfast)) return { earliest: 7, latest: 10 };
  }
  for (const dinner of DINNER_CATEGORIES) {
    if (cat.includes(dinner)) return { earliest: 19, latest: 22 };
  }
  for (const daytime of DAYTIME_CATEGORIES) {
    if (cat.includes(daytime)) return { earliest: 9, latest: 17 };
  }

  // Restaurants default to lunch or dinner windows — don't constrain tightly
  if (cat.includes('restaurant')) return { earliest: 11, latest: 22 };
  if (cat.includes('bar') || cat.includes('cocktail') || cat.includes('pub')) {
    return { earliest: 17, latest: 24 };
  }

  return null;
}

/**
 * Assign a sort priority based on time-window constraints.
 * Items with earlier windows come first.
 */
function timeWindowPriority(item: RouteItem): number {
  const tw = getTimeWindow(item.category);
  if (!tw) return 12; // noon default for unconstrained items
  return tw.earliest;
}

// ============================================================
// 2-opt improvement heuristic
// ============================================================

/**
 * Apply 2-opt local search to improve a route.
 * Iteratively reverses segments to reduce total travel time.
 * Respects pinned items (those with explicit time-window constraints)
 * by only swapping among freely-ordered items.
 *
 * O(n²) per pass, runs until no improvement found.
 */
function twoOptImprove(route: RouteItem[], maxPasses: number = 10): RouteItem[] {
  if (route.length < 4) return route;

  let best = [...route];
  let bestCost = routeTravelTime(best);
  let improved = true;
  let passes = 0;

  while (improved && passes < maxPasses) {
    improved = false;
    passes++;

    for (let i = 1; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        // Reverse the segment between i and j
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1),
        ];

        const candidateCost = routeTravelTime(candidate);
        if (candidateCost < bestCost - 0.01) {
          best = candidate;
          bestCost = candidateCost;
          improved = true;
        }
      }
    }
  }

  return best;
}

// ============================================================
// Main optimize function
// ============================================================

interface OptimizeResult {
  order: string[];
  legs: RouteLeg[];
  timeSlots: Record<string, string>; // itemId -> suggested time "HH:MM"
}

/**
 * Optimize route with 2-opt heuristic and time-window constraints.
 *
 * Strategy:
 * 1. Separate items into time-constrained groups (breakfast/daytime/dinner/unconstrained)
 * 2. Within each group, run nearest-neighbor + 2-opt
 * 3. Stitch groups in chronological order
 * 4. Assign suggested time slots
 */
function optimizeRoute(items: RouteItem[]): OptimizeResult {
  const validItems = items.filter(
    item => item.latitude != null && item.longitude != null
  );
  const invalidItems = items.filter(
    item => item.latitude == null || item.longitude == null
  );

  if (validItems.length < 2) {
    const order = items.map(i => i.id);
    return { order, legs: [], timeSlots: {} };
  }

  // Group items by time-window priority
  const groups: { priority: number; items: RouteItem[] }[] = [];
  const groupMap = new Map<number, RouteItem[]>();

  for (const item of validItems) {
    const priority = timeWindowPriority(item);
    if (!groupMap.has(priority)) {
      groupMap.set(priority, []);
    }
    groupMap.get(priority)!.push(item);
  }

  for (const [priority, groupItems] of groupMap) {
    groups.push({ priority, items: groupItems });
  }

  // Sort groups by earliest time
  groups.sort((a, b) => a.priority - b.priority);

  // Optimize within each group using nearest-neighbor + 2-opt
  const orderedItems: RouteItem[] = [];
  for (const group of groups) {
    if (group.items.length <= 1) {
      orderedItems.push(...group.items);
      continue;
    }

    // Nearest-neighbor initial tour within the group
    const nn = nearestNeighborTour(group.items, orderedItems[orderedItems.length - 1] || null);
    // 2-opt improvement
    const improved = twoOptImprove(nn);
    orderedItems.push(...improved);
  }

  // Build legs with transit mode info
  const legs: RouteLeg[] = [];
  for (let i = 0; i < orderedItems.length - 1; i++) {
    const from = orderedItems[i];
    const to = orderedItems[i + 1];
    if (from.latitude != null && from.longitude != null && to.latitude != null && to.longitude != null) {
      const dist = haversineDistance(from.latitude!, from.longitude!, to.latitude!, to.longitude!);
      const mode = suggestTravelMode(dist);
      const duration = estimateRealisticTravelMinutes(dist, mode);
      legs.push({
        fromId: from.id,
        toId: to.id,
        distanceKm: Math.round(dist * 100) / 100,
        durationMinutes: duration,
        mode,
      });
    }
  }

  // Assign time slots respecting time windows
  const timeSlots: Record<string, string> = {};
  let currentMinute = 9 * 60; // Start at 09:00

  for (let i = 0; i < orderedItems.length; i++) {
    const item = orderedItems[i];
    const tw = getTimeWindow(item.category);

    // Ensure we respect the time window
    if (tw) {
      const earliest = tw.earliest * 60;
      if (currentMinute < earliest) {
        currentMinute = earliest;
      }
    }

    const hours = Math.floor(currentMinute / 60);
    const mins = currentMinute % 60;
    timeSlots[item.id] = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    // Advance by estimated visit duration (default 90 min) + travel to next
    const visitDuration = 90; // Could be enhanced with category durations
    let travelToNext = 0;
    if (i < orderedItems.length - 1) {
      travelToNext = travelTimeBetween(orderedItems[i], orderedItems[i + 1]);
    }
    currentMinute += visitDuration + travelToNext;
  }

  const order = [...orderedItems.map(i => i.id), ...invalidItems.map(i => i.id)];
  return { order, legs, timeSlots };
}

/**
 * Nearest-neighbor tour starting from the closest item to `startFrom`
 * (or the first item if startFrom is null).
 */
function nearestNeighborTour(items: RouteItem[], startFrom: RouteItem | null): RouteItem[] {
  const remaining = [...items];
  const result: RouteItem[] = [];

  // Pick starting item: closest to startFrom if provided
  let startIdx = 0;
  if (startFrom && startFrom.latitude != null && startFrom.longitude != null) {
    let minDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].latitude == null || remaining[i].longitude == null) continue;
      const d = haversineDistance(
        startFrom.latitude!, startFrom.longitude!,
        remaining[i].latitude!, remaining[i].longitude!
      );
      if (d < minDist) {
        minDist = d;
        startIdx = i;
      }
    }
  }

  let current = remaining.splice(startIdx, 1)[0];
  result.push(current);

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestTime = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const t = travelTimeBetween(current, remaining[i]);
      if (t < nearestTime) {
        nearestTime = t;
        nearestIdx = i;
      }
    }

    current = remaining.splice(nearestIdx, 1)[0];
    result.push(current);
  }

  return result;
}

/**
 * POST /api/intelligence/route-optimizer
 * Optimizes the order of items to minimize travel distance
 *
 * Security: Requires authentication and verifies data ownership
 * - Client sends tripId and itemIds (not full item objects)
 * - Server fetches items from database and verifies trip ownership
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // 1. Authenticate user
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError('Authentication required');
  }

  // 2. Parse and validate request body
  const body = await request.json();
  const { tripId, itemIds } = body;

  if (!tripId || typeof tripId !== 'string') {
    throw createValidationError('tripId is required');
  }

  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
    throw createValidationError('itemIds array is required');
  }

  // Validate all itemIds are strings
  if (!itemIds.every((id: unknown) => typeof id === 'string')) {
    throw createValidationError('All itemIds must be strings');
  }

  // 3. Verify trip ownership
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id')
    .eq('id', tripId)
    .eq('user_id', user.id)
    .single();

  if (tripError || !trip) {
    return NextResponse.json(
      { error: 'Trip not found or access denied' },
      { status: 404 }
    );
  }

  // 4. Fetch items from database with ownership verification
  // Only fetch items that belong to the verified trip
  const { data: dbItems, error: itemsError } = await supabase
    .from('itinerary_items')
    .select('id, title, time, notes')
    .eq('trip_id', tripId)
    .in('id', itemIds);

  if (itemsError) {
    throw itemsError;
  }

  // Verify all requested items were found (prevents ID enumeration)
  if (!dbItems || dbItems.length !== itemIds.length) {
    const foundIds = new Set(dbItems?.map(i => i.id) || []);
    const missingIds = itemIds.filter((id: string) => !foundIds.has(id));
    return NextResponse.json(
      { error: `Some items not found or do not belong to this trip: ${missingIds.join(', ')}` },
      { status: 403 }
    );
  }

  // 5. Transform database items to RouteItem format
  const items: RouteItem[] = dbItems.map(item => {
    const parsedNotes = parseItineraryNotes(item.notes);
    return {
      id: item.id,
      title: item.title,
      latitude: parsedNotes?.latitude ?? null,
      longitude: parsedNotes?.longitude ?? null,
      time: item.time ?? null,
      category: parsedNotes?.category ?? null,
    };
  });

  // 6. Handle edge cases
  if (items.length < 2) {
    return NextResponse.json({
      optimizedOrder: items.map(i => i.id),
      legs: [],
      timeSlots: {},
      message: 'Not enough items to optimize',
    });
  }

  // 7. Optimize the route with 2-opt + time-window constraints
  const originalTravelTime = routeTravelTime(items);
  const result = optimizeRoute(items);
  const optimizedItems = result.order
    .map(id => items.find(i => i.id === id))
    .filter(Boolean) as RouteItem[];
  const optimizedTravelTime = routeTravelTime(optimizedItems);

  // Calculate distance savings
  const originalDistance = calculateTotalDistance(items);
  const optimizedDistance = calculateTotalDistance(optimizedItems);
  const savedDistance = Math.max(0, originalDistance - optimizedDistance);
  const savedMinutes = Math.max(0, originalTravelTime - optimizedTravelTime);

  return NextResponse.json({
    optimizedOrder: result.order,
    legs: result.legs,
    timeSlots: result.timeSlots,
    originalDistance: Math.round(originalDistance * 10) / 10,
    optimizedDistance: Math.round(optimizedDistance * 10) / 10,
    savedDistance: Math.round(savedDistance * 10) / 10,
    originalTravelMinutes: Math.round(originalTravelTime),
    optimizedTravelMinutes: Math.round(optimizedTravelTime),
    savedMinutes: Math.round(savedMinutes),
    message: savedMinutes > 1
      ? `Route optimized — saves ${Math.round(savedMinutes)} min travel time`
      : 'Route is already well optimized',
  });
});

function calculateTotalDistance(items: RouteItem[]): number {
  let total = 0;
  const validItems = items.filter(
    i => i.latitude != null && i.longitude != null
  );

  for (let i = 0; i < validItems.length - 1; i++) {
    total += haversineDistance(
      validItems[i].latitude!,
      validItems[i].longitude!,
      validItems[i + 1].latitude!,
      validItems[i + 1].longitude!
    );
  }
  return total;
}
