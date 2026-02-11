'use client';

import { useMemo } from 'react';
import { Route, Users, Calendar } from 'lucide-react';
import type { TripDay } from '@/lib/hooks/useTripEditor';

interface TripDesktopHeaderProps {
  days: TripDay[];
  tripTitle?: string;
  startDate?: string;
  endDate?: string;
  travelerCount?: number;
}

/**
 * TripDesktopHeader - Persistent utility header for the itinerary pane.
 * Displays trip-wide metadata: total budget used, total distance, and active members.
 * Hidden on mobile; fixed at top of the itinerary scroll region on desktop.
 */
export default function TripDesktopHeader({
  days,
  tripTitle,
  startDate,
  endDate,
  travelerCount,
}: TripDesktopHeaderProps) {
  // Compute total distance across all days (sum of travel distances between items)
  const totalDistanceKm = useMemo(() => {
    let total = 0;
    for (const day of days) {
      for (const item of day.items) {
        const dist = item.parsedNotes?.travelDistanceToNext;
        if (dist && dist > 0) {
          total += dist;
        }
      }
    }
    return Math.round(total * 10) / 10;
  }, [days]);

  // Count total items
  const totalItems = useMemo(() => {
    return days.reduce((sum, day) => sum + day.items.length, 0);
  }, [days]);

  // Format date range
  const dateRange = useMemo(() => {
    if (!startDate) return null;
    const fmt = (d: string) => {
      try {
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } catch {
        return d;
      }
    };
    if (endDate) {
      return `${fmt(startDate)} – ${fmt(endDate)}`;
    }
    return fmt(startDate);
  }, [startDate, endDate]);

  return (
    <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-[var(--editorial-bg-elevated)] border-b border-[var(--editorial-border)] flex-shrink-0">
      {/* Date range */}
      {dateRange && (
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--editorial-text-tertiary)]">
          <Calendar className="w-3 h-3" />
          <span>{dateRange}</span>
          <span className="text-[var(--editorial-border)]">&middot;</span>
          <span>{days.length}d</span>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Metrics row */}
      <div className="flex items-center gap-2.5">
        {/* Distance */}
        {totalDistanceKm > 0 && (
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-[11px] font-medium tabular-nums"
            title={`Total distance: ${totalDistanceKm} km`}
          >
            <Route className="w-3 h-3" />
            <span>
              {totalDistanceKm >= 100
                ? `${Math.round(totalDistanceKm)} km`
                : `${totalDistanceKm} km`}
            </span>
          </div>
        )}

        {/* Members / travelers */}
        {travelerCount != null && travelerCount > 0 && (
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 text-[11px] font-medium"
            title={`${travelerCount} traveler${travelerCount !== 1 ? 's' : ''}`}
          >
            <Users className="w-3 h-3" />
            <span>{travelerCount}</span>
          </div>
        )}

        {/* Items count (always show as a baseline metric) */}
        <div className="text-[11px] text-[var(--editorial-text-tertiary)] tabular-nums">
          {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </div>
      </div>
    </div>
  );
}
