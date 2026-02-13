'use client';

import React from 'react';
import { Footprints, Car, Train, ArrowDown } from 'lucide-react';

export type TravelMode = 'walking' | 'driving' | 'transit' | 'taxi';

interface TravelConnectorProps {
  durationMinutes?: number;
  distanceKm?: number;
  mode?: TravelMode;
  className?: string;
}

const modeIcons: Record<TravelMode, typeof Car> = {
  walking: Footprints,
  driving: Car,
  transit: Train,
  taxi: Car,
};

const modeLabels: Record<TravelMode, string> = {
  walking: 'Walk',
  driving: 'Drive',
  transit: 'Transit',
  taxi: 'Taxi',
};

/**
 * Suggest the best travel mode based on straight-line distance.
 *   <1.5km  → walking
 *   1.5-5km → transit
 *   >5km    → taxi
 */
function autoDetectMode(distanceKm?: number): TravelMode {
  if (!distanceKm) return 'walking';
  if (distanceKm < 1.5) return 'walking';
  if (distanceKm <= 5) return 'transit';
  return 'taxi';
}

/**
 * TravelConnector - Clean connector showing travel time between items
 * Auto-detects transit mode from distance when no explicit mode is provided.
 * Shows: "↓ Walk · 25 min · 1.6 km" style
 */
export default function TravelConnector({
  durationMinutes,
  distanceKm,
  mode,
  className = '',
}: TravelConnectorProps) {
  // Auto-detect mode from distance if not explicitly provided
  const resolvedMode = mode || autoDetectMode(distanceKm);

  // Format duration
  const formatDuration = (mins?: number): string => {
    if (!mins) return '--';
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // Format distance
  const formatDistance = (km?: number): string => {
    if (!km) return '';
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)} km`;
  };

  const ModeIcon = modeIcons[resolvedMode];
  const durationText = formatDuration(durationMinutes);
  const distanceText = formatDistance(distanceKm);

  return (
    <div className={`flex items-center justify-end py-2 ${className}`}>
      <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-gray-500">
        {/* Arrow */}
        <ArrowDown className="w-3 h-3" />

        {/* Mode Icon */}
        <ModeIcon className="w-3 h-3" />

        {/* Mode Label */}
        <span className="font-medium">{modeLabels[resolvedMode]}</span>

        {/* Duration */}
        <span className="tabular-nums">{durationText}</span>

        {/* Distance (if available) */}
        {distanceText && (
          <>
            <span className="text-stone-300 dark:text-gray-600">·</span>
            <span className="tabular-nums">{distanceText}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Interactive Travel Connector (with mode selector)
// ============================================================================

interface InteractiveTravelConnectorProps {
  durationMinutes?: number;
  distanceKm?: number;
  mode?: TravelMode;
  onModeChange?: (mode: TravelMode) => void;
  durations?: Partial<Record<TravelMode, number>>;
  className?: string;
}

/**
 * InteractiveTravelConnector - Connector with mode selector
 * Allows switching between walking, transit, and taxi.
 * Auto-selects the recommended mode based on distance.
 */
export function InteractiveTravelConnector({
  durationMinutes,
  distanceKm,
  mode,
  onModeChange,
  durations,
  className = '',
}: InteractiveTravelConnectorProps) {
  const recommendedMode = autoDetectMode(distanceKm);
  const [selectedMode, setSelectedMode] = React.useState<TravelMode>(mode || recommendedMode);

  const handleModeChange = (newMode: TravelMode) => {
    setSelectedMode(newMode);
    onModeChange?.(newMode);
  };

  // Format duration
  const formatDuration = (mins?: number): string => {
    if (!mins && mins !== 0) return '--';
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h${m}m` : `${h}h`;
  };

  // Format distance
  const formatDistance = (km?: number): string => {
    if (!km) return '';
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  const distanceText = formatDistance(distanceKm);
  const selectableModes: TravelMode[] = ['walking', 'transit', 'taxi'];

  return (
    <div className={`flex items-center justify-end py-2 ${className}`}>
      <div className="flex items-center gap-3">
        {/* Arrow indicator */}
        <ArrowDown className="w-3 h-3 text-stone-300 dark:text-gray-600" />

        {/* Mode selector pills */}
        <div className="flex items-center gap-0.5 p-0.5 bg-stone-100 dark:bg-gray-800 rounded-full">
          {selectableModes.map((m) => {
            const ModeIcon = modeIcons[m];
            const duration = durations?.[m] ?? (m === selectedMode ? durationMinutes : undefined);
            const isSelected = selectedMode === m;
            const isRecommended = m === recommendedMode;

            return (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`
                  flex items-center gap-1 px-2 py-1 rounded-full transition-all text-xs font-medium
                  ${isSelected
                    ? 'bg-white dark:bg-gray-700 text-stone-900 dark:text-white shadow-sm'
                    : 'text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
                  }
                  ${isRecommended && !isSelected ? 'ring-1 ring-stone-300 dark:ring-gray-600' : ''}
                `}
              >
                <ModeIcon className="w-3 h-3" strokeWidth={1.5} />
                <span className="tabular-nums">
                  {duration !== undefined ? formatDuration(duration) : '--'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Distance */}
        {distanceText && (
          <span className="text-xs text-stone-400 dark:text-gray-500 tabular-nums">
            {distanceText}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Compact Travel Connector (inline style)
// ============================================================================

interface CompactTravelConnectorProps {
  durationMinutes?: number;
  mode?: TravelMode;
  className?: string;
}

/**
 * CompactTravelConnector - Very minimal inline connector
 * Shows just: "↓ 15m walk"
 */
export function CompactTravelConnector({
  durationMinutes,
  mode = 'walking',
  className = '',
}: CompactTravelConnectorProps) {
  const modeLabels: Record<TravelMode, string> = {
    walking: 'walk',
    driving: 'drive',
    transit: 'transit',
    taxi: 'taxi',
  };

  const formatDuration = (mins?: number): string => {
    if (!mins) return '--';
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className={`flex items-center justify-end py-1.5 ${className}`}>
      <span className="text-xs text-stone-400 dark:text-gray-500">
        ↓ {formatDuration(durationMinutes)} {modeLabels[mode]}
      </span>
    </div>
  );
}
