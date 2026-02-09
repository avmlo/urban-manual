/**
 * Shared trip utilities
 * Architecture inspired by itskovacs/trip (MIT License)
 * https://github.com/itskovacs/trip
 */
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

/**
 * Format a time string (HH:MM) into a human-readable format (e.g. "9:00 AM")
 */
export function formatTime(time: string): string {
  try {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return time;
  }
}

/**
 * Nearest neighbor algorithm for route optimization.
 * Given a list of items with coordinates, reorder them to minimize total travel distance.
 */
export function nearestNeighborOptimize(
  items: EnrichedItineraryItem[]
): EnrichedItineraryItem[] {
  if (items.length <= 2) return items;

  const getCoords = (item: EnrichedItineraryItem) => ({
    lat: item.destination?.latitude || item.parsedNotes?.latitude || 0,
    lng: item.destination?.longitude || item.parsedNotes?.longitude || 0,
  });

  const getDistance = (a: EnrichedItineraryItem, b: EnrichedItineraryItem) => {
    const coordsA = getCoords(a);
    const coordsB = getCoords(b);
    const R = 6371;
    const dLat = ((coordsB.lat - coordsA.lat) * Math.PI) / 180;
    const dLng = ((coordsB.lng - coordsA.lng) * Math.PI) / 180;
    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coordsA.lat * Math.PI) / 180) *
        Math.cos((coordsB.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
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
    result.push(remaining.splice(nearestIdx, 1)[0]);
  }

  return result;
}

/**
 * Parse item type from parsed notes, falling back to 'place'
 */
export type ItemIconType =
  | 'place'
  | 'flight'
  | 'hotel'
  | 'checkin'
  | 'checkout'
  | 'breakfast'
  | 'train'
  | 'activity';

export function getItemType(item: EnrichedItineraryItem): ItemIconType {
  return (item.parsedNotes?.type as ItemIconType) || 'place';
}

/**
 * Get display data for an itinerary item (title, icon type, extra data)
 */
export function getItemDisplay(item: EnrichedItineraryItem): {
  title: string;
  iconType: ItemIconType;
  extraData: Record<string, unknown>;
} {
  const itemType = getItemType(item);
  const title = item.title || item.destination?.name || 'Untitled';
  const extraData: Record<string, unknown> = {};

  if (itemType === 'activity' && item.parsedNotes?.activityType) {
    extraData.activityType = item.parsedNotes.activityType;
  }

  return { title, iconType: itemType, extraData };
}
