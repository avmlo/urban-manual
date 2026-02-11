'use client';

import Image from 'next/image';
import { MapPin, Clock, Star, ExternalLink } from 'lucide-react';
import { CrowdBadge } from '@/features/trip/components/CrowdIndicator';

interface PlaceCardProps {
  name: string;
  category?: string;
  neighborhood?: string;
  time?: string;
  duration?: number;
  rating?: number;
  image?: string;
  url?: string;
  notes?: string;
  compact?: boolean;
}

/**
 * PlaceCard - Compact place/destination card with cohesive design
 * Layout: Place header (name + location) → Time/details → Rating/actions
 * Matches FlightStatusCard and LodgingCard design pattern
 */
export default function PlaceCard({
  name,
  category,
  neighborhood,
  time,
  duration,
  rating,
  image,
  url,
  notes,
  compact = true,
}: PlaceCardProps) {
  // Format time for display
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    return timeStr;
  };

  // Format duration
  const formatDuration = (mins?: number) => {
    if (!mins) return null;
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  };

  return (
    <div className="px-3 py-2.5 rounded-lg bg-stone-100 dark:bg-gray-800/50 flex gap-3">
      {/* Thumbnail - tighter sizing */}
      {image && (
        <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-stone-200 dark:bg-gray-700">
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover"
            sizes="48px"
            unoptimized={image.startsWith('/api/')}
          />
        </div>
      )}

      {/* Content - high-density layout */}
      <div className="flex-1 min-w-0">
        {/* Row 1: Name + Rating inline */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-white leading-tight truncate">
            {name}
          </h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {rating ? (
              <div className="flex items-center gap-0.5">
                <img src="/google-logo.svg" alt="Google" className="w-2.5 h-2.5" />
                <span className="text-[11px] font-medium text-stone-600 dark:text-gray-300 tabular-nums">
                  {rating.toFixed(1)}
                </span>
              </div>
            ) : null}
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-0.5 text-stone-400 hover:text-stone-600 dark:hover:text-gray-300 transition-colors"
                title="View details"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Row 2: Location + Category + Time + Duration - single dense line */}
        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-stone-500 dark:text-gray-400">
          {neighborhood && (
            <span className="flex items-center gap-0.5 truncate">
              <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">{neighborhood}</span>
            </span>
          )}
          {neighborhood && category && (
            <span className="text-stone-300 dark:text-gray-600">&middot;</span>
          )}
          {category && (
            <span className="capitalize flex-shrink-0">{category}</span>
          )}
          {(neighborhood || category) && time && (
            <span className="text-stone-300 dark:text-gray-600">&middot;</span>
          )}
          {time && (
            <span className="flex items-center gap-0.5 flex-shrink-0">
              <Clock className="w-2.5 h-2.5" />
              {formatTime(time)}
              <CrowdBadge category={category} time={time} />
            </span>
          )}
          {time && duration && (
            <span className="text-stone-300 dark:text-gray-600">&middot;</span>
          )}
          {duration && (
            <span className="flex-shrink-0">{formatDuration(duration)}</span>
          )}
        </div>

        {/* Row 3: Notes - compact single line */}
        {notes && (
          <p className="text-[11px] text-stone-400 dark:text-gray-500 mt-1 line-clamp-1 leading-tight">
            {notes}
          </p>
        )}
      </div>
    </div>
  );
}
