'use client';

/**
 * TravelTime - Shows travel time/distance between itinerary items
 * Extracted from page.tsx following itskovacs/trip architecture (MIT)
 * https://github.com/itskovacs/trip
 */
import { useState } from 'react';
import { Car, Footprints, Train as TrainIcon } from 'lucide-react';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import { getAirportCoordinates } from '@/lib/utils/airports';

type TravelModeOption = 'walking' | 'transit' | 'taxi';

interface TravelTimeProps {
  from: EnrichedItineraryItem;
  to: EnrichedItineraryItem;
  onUpdateTravelMode?: (itemId: string, mode: TravelModeOption) => void;
}

/**
 * Auto-detect travel mode based on distance:
 *   <1.5km  → walking
 *   1.5-5km → transit
 *   >5km    → taxi
 */
function autoDetectMode(distanceKm: number): TravelModeOption {
  if (distanceKm < 1.5) return 'walking';
  if (distanceKm <= 5) return 'transit';
  return 'taxi';
}

export default function TravelTime({ from, to, onUpdateTravelMode }: TravelTimeProps) {
  const fromType = from.parsedNotes?.type;
  const toType = to.parsedNotes?.type;

  let fromLat = from.destination?.latitude || from.parsedNotes?.latitude;
  let fromLng = from.destination?.longitude || from.parsedNotes?.longitude;
  let toLat = to.destination?.latitude || to.parsedNotes?.latitude;
  let toLng = to.destination?.longitude || to.parsedNotes?.longitude;

  if (fromType === 'flight' && !fromLat && from.parsedNotes?.to) {
    const airportCoords = getAirportCoordinates(from.parsedNotes.to);
    if (airportCoords) { fromLat = airportCoords.latitude; fromLng = airportCoords.longitude; }
  }
  if (toType === 'flight' && !toLat && to.parsedNotes?.from) {
    const airportCoords = getAirportCoordinates(to.parsedNotes.from);
    if (airportCoords) { toLat = airportCoords.latitude; toLng = airportCoords.longitude; }
  }

  let distanceKm = 0;
  if (fromLat && fromLng && toLat && toLng) {
    const R = 6371;
    const dLat = (toLat - fromLat) * Math.PI / 180;
    const dLng = (toLng - fromLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(fromLat * Math.PI / 180) * Math.cos(toLat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distanceKm = R * c;
  }

  // Determine initial mode: use saved preference or auto-detect from distance
  const savedMode = from.parsedNotes?.travelModeToNext;
  let initialMode: TravelModeOption;
  if (savedMode === 'walking' || savedMode === 'transit' || savedMode === 'taxi') {
    initialMode = savedMode;
  } else if (savedMode === 'driving') {
    initialMode = 'taxi'; // Normalize legacy 'driving' → 'taxi'
  } else {
    initialMode = autoDetectMode(distanceKm);
  }

  const [mode, setMode] = useState<TravelModeOption>(initialMode);

  const getTravelMinutes = (): number | null => {
    if (distanceKm === 0) return null;
    switch (mode) {
      case 'walking': return Math.round(distanceKm * 15);  // 15 min/km (4 km/h, urban factor)
      case 'transit': return Math.round(distanceKm * 5 + 10); // 5 min/km + 10 min wait
      case 'taxi': return Math.round(distanceKm * 3);      // 3 min/km (20 km/h urban)
    }
  };

  const travelMinutes = getTravelMinutes();

  const cycleMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const modes: TravelModeOption[] = ['walking', 'transit', 'taxi'];
    const currentIndex = modes.indexOf(mode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setMode(nextMode);
    onUpdateTravelMode?.(from.id, nextMode);
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'walking': return <Footprints className="w-3 h-3" />;
      case 'taxi': return <Car className="w-3 h-3" />;
      case 'transit': return <TrainIcon className="w-3 h-3" />;
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'walking': return 'walk';
      case 'taxi': return 'taxi';
      case 'transit': return 'transit';
    }
  };

  const getSpecialLabel = () => {
    if (fromType === 'flight') return 'from airport';
    if (fromType === 'train') return 'from station';
    if (toType === 'flight') return 'to airport';
    if (toType === 'train') return 'to station';
    return null;
  };

  const formatDuration = (mins: number | null): string => {
    if (mins === null) return '';
    if (mins <= 0) return '<1 min';
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const formatDistance = (km: number): string => {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    const miles = km * 0.621371;
    return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
  };

  const specialLabel = getSpecialLabel();
  const duration = formatDuration(travelMinutes);
  const distanceDisplay = distanceKm > 0 ? formatDistance(distanceKm) : '';

  if (travelMinutes === null) return null;

  return (
    <div className="flex items-center justify-center py-0.5">
      <button
        onClick={cycleMode}
        className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)] hover:bg-[var(--editorial-border-subtle)] rounded-md transition-all"
        title={`${duration} by ${getModeLabel()} - click to change mode`}
      >
        {getModeIcon()}
        <span className="font-medium tabular-nums">{duration}</span>
        {specialLabel && <span className="text-[var(--editorial-accent)]">{specialLabel}</span>}
      </button>
    </div>
  );
}

/** Backwards-compatible alias */
export function WalkingTime({ from, to }: { from: EnrichedItineraryItem; to: EnrichedItineraryItem }) {
  return <TravelTime from={from} to={to} />;
}
