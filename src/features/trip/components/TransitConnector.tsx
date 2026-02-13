'use client';

import { useState, useEffect, useMemo } from 'react';
import { Car, Footprints, Train } from 'lucide-react';
import { formatDuration } from '@/lib/utils/time-calculations';

export type TransitMode = 'walking' | 'driving' | 'transit' | 'taxi';

interface Location {
  latitude?: number | null;
  longitude?: number | null;
}

interface TransitConnectorProps {
  from?: Location | null;
  to?: Location | null;
  durationMinutes?: number;
  distanceKm?: number;
  mode?: TransitMode;
  itemId?: string; // ID of the "from" item for saving travel mode
  onModeChange?: (itemId: string, mode: TransitMode) => void;
  className?: string;
}

const modeIcons: Record<TransitMode, typeof Car> = {
  walking: Footprints,
  driving: Car,
  transit: Train,
  taxi: Car,
};

const modeLabels: Record<TransitMode, string> = {
  walking: 'Walk',
  driving: 'Drive',
  transit: 'Transit',
  taxi: 'Taxi',
};

/**
 * Calculate distance between two points using Haversine formula
 */
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
 * Estimate travel time based on distance and mode.
 * Uses realistic urban estimates:
 *   walking: 15 min/km (4 km/h, urban factor)
 *   transit: 5 min/km + 10 min wait
 *   taxi/driving: 3 min/km (20 km/h urban)
 */
function estimateTravelTime(distanceKm: number, mode: TransitMode): number {
  switch (mode) {
    case 'walking':
      return Math.round(distanceKm * 15);
    case 'transit':
      return Math.round(distanceKm * 5 + 10);
    case 'taxi':
    case 'driving':
      return Math.round(distanceKm * 3);
  }
}

/**
 * TransitConnector - Travel time connector between timeline items
 * Shows travel time estimates between locations using local calculation + API
 */
export default function TransitConnector({
  from,
  to,
  durationMinutes: propDuration,
  mode = 'walking',
  itemId,
  onModeChange,
  className = '',
}: TransitConnectorProps) {
  const [selectedMode, setSelectedMode] = useState<TransitMode>(mode);

  // Update selectedMode when mode prop changes
  useEffect(() => {
    setSelectedMode(mode);
  }, [mode]);

  // Handle mode change and notify parent
  const handleModeChange = (newMode: TransitMode) => {
    setSelectedMode(newMode);
    if (onModeChange && itemId) {
      onModeChange(itemId, newMode);
    }
  };
  const [apiDurations, setApiDurations] = useState<Record<TransitMode, number | null>>({
    walking: null,
    driving: null,
    transit: null,
    taxi: null,
  });
  const [loading, setLoading] = useState(false);

  // Check if we have valid coordinates
  const hasValidCoords = Boolean(
    from?.latitude && from?.longitude && to?.latitude && to?.longitude
  );

  // Calculate local estimates using Haversine (instant, no API call)
  const localEstimates = useMemo(() => {
    if (!hasValidCoords) return null;

    const distance = haversineDistance(
      from!.latitude!,
      from!.longitude!,
      to!.latitude!,
      to!.longitude!
    );

    return {
      walking: estimateTravelTime(distance, 'walking'),
      transit: estimateTravelTime(distance, 'transit'),
      driving: estimateTravelTime(distance, 'driving'),
      taxi: estimateTravelTime(distance, 'taxi'),
      distance,
    };
  }, [from?.latitude, from?.longitude, to?.latitude, to?.longitude, hasValidCoords]);

  // Fetch from Distance API for more accurate times
  useEffect(() => {
    async function fetchTravelTimes() {
      if (!hasValidCoords) return;

      setLoading(true);
      try {
        const modes: TransitMode[] = ['walking', 'transit', 'taxi'];
        const results = await Promise.all(
          modes.map(async (m) => {
            try {
              const response = await fetch('/api/distance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  origins: [{ lat: from!.latitude, lng: from!.longitude, name: 'From' }],
                  destinations: [{ lat: to!.latitude, lng: to!.longitude, name: 'To' }],
                  mode: m,
                }),
              });
              const data = await response.json();
              if (data.results?.[0]?.duration) {
                return { mode: m, minutes: Math.round(data.results[0].duration / 60) };
              }
              return { mode: m, minutes: null };
            } catch {
              return { mode: m, minutes: null };
            }
          })
        );

        const newDurations: Record<TransitMode, number | null> = { walking: null, driving: null, transit: null, taxi: null };
        results.forEach((r) => {
          newDurations[r.mode] = r.minutes;
        });
        setApiDurations(newDurations);
      } catch (err) {
        console.error('Error fetching travel times:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTravelTimes();
  }, [from?.latitude, from?.longitude, to?.latitude, to?.longitude, hasValidCoords]);

  // Use API durations if available, otherwise local estimates
  const getDuration = (m: TransitMode): number | null => {
    if (apiDurations[m] !== null) return apiDurations[m];
    if (localEstimates) return localEstimates[m];
    return null;
  };

  // Format distance for display
  const formatDistance = (km: number): string => {
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    }
    return `${km.toFixed(1)}km`;
  };

  const distance = localEstimates?.distance;

  return (
    <div className={`relative flex items-center justify-end py-1 gap-2 ${className}`}>
      {/* Mode Selector Pills */}
      <div className="flex items-center gap-0.5 p-0.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-lg backdrop-blur-sm">
        {(['walking', 'transit', 'taxi'] as TransitMode[]).map((m) => {
          const ModeIcon = modeIcons[m];
          const duration = getDuration(m);
          const isSelected = selectedMode === m;

          return (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`
                flex items-center gap-1 px-2.5 py-1 rounded-md transition-all text-xs font-medium
                ${isSelected
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }
              `}
            >
              <ModeIcon className="w-3 h-3" strokeWidth={1.5} />
              {duration !== null ? (
                <span className="tabular-nums">{formatDuration(duration)}</span>
              ) : loading ? (
                <span className="w-6 h-2 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
              ) : (
                <span className="text-gray-400 dark:text-gray-500">--</span>
              )}
            </button>
          );
        })}
      </div>
      {/* Distance indicator - inline */}
      {distance !== undefined && distance > 0 && (
        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
          {formatDistance(distance)}
        </span>
      )}
    </div>
  );
}
