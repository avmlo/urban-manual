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

interface TravelTimeProps {
  from: EnrichedItineraryItem;
  to: EnrichedItineraryItem;
  onUpdateTravelMode?: (itemId: string, mode: 'walking' | 'driving' | 'transit') => void;
}

export default function TravelTime({ from, to, onUpdateTravelMode }: TravelTimeProps) {
  const [mode, setMode] = useState<'walking' | 'driving' | 'transit'>(
    (from.parsedNotes?.travelModeToNext as 'walking' | 'driving' | 'transit') || 'driving'
  );

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

  const getTravelMinutes = (): number | null => {
    if (distanceKm === 0) return null;
    switch (mode) {
      case 'walking': return Math.round(distanceKm * 12);
      case 'driving': return Math.round(distanceKm * 2);
      case 'transit': return Math.round(distanceKm * 3);
      default: return Math.round(distanceKm * 12);
    }
  };

  const travelMinutes = getTravelMinutes();

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
      case 'transit': return <TrainIcon className="w-3 h-3" />;
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'walking': return 'walk';
      case 'driving': return 'drive';
      case 'transit': return 'subway';
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
    <div className="trip-connector flex items-center justify-center py-0.5">
      <button
        onClick={cycleMode}
        className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)] hover:bg-[var(--editorial-border-subtle)] rounded-md trip-transition-fast group"
        title={`${duration} by ${getModeLabel()} - click to change mode`}
      >
        <span className="transition-transform duration-150 group-hover:scale-110 group-active:rotate-12">
          {getModeIcon()}
        </span>
        <span className="font-medium tabular-nums">{duration}</span>
        {distanceDisplay && <span className="text-[var(--editorial-text-tertiary)] opacity-60">{distanceDisplay}</span>}
        {specialLabel && <span className="text-[var(--editorial-accent)]">{specialLabel}</span>}
      </button>
    </div>
  );
}

/** Backwards-compatible alias */
export function WalkingTime({ from, to }: { from: EnrichedItineraryItem; to: EnrichedItineraryItem }) {
  return <TravelTime from={from} to={to} />;
}
