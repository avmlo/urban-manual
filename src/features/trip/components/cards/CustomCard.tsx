'use client';

import { FileText, Clock, MapPin } from 'lucide-react';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import { formatTimeDisplay, formatDuration } from '@/lib/utils/time-calculations';

interface CustomCardProps {
  item: EnrichedItineraryItem;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * CustomCard - Renders custom/generic itinerary items
 * Used for user-created items that don't fit other categories
 */
export default function CustomCard({
  item,
  isSelected,
  onSelect,
  
}: CustomCardProps) {
  const notes = item.parsedNotes;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`
        cursor-pointer rounded-lg transition-all duration-200
        bg-stone-100 dark:bg-gray-800/50
        ${isSelected ? 'bg-stone-200 dark:bg-gray-700' : 'hover:bg-stone-200/60 dark:hover:bg-gray-700/60'}
      `}
    >
      <div className="px-3 py-2.5 flex items-start gap-2.5">
        {/* Icon - compact */}
        <div className="w-8 h-8 rounded-lg bg-stone-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-stone-500 dark:text-gray-400" />
        </div>

        {/* Content - high-density */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-white leading-tight truncate">
            {item.title}
          </h3>

          {/* Meta row - single dense line */}
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-stone-500 dark:text-gray-400">
            {item.time && (
              <span className="flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {formatTimeDisplay(item.time)}
              </span>
            )}
            {notes?.duration && (
              <>
                {item.time && <span className="text-stone-300 dark:text-gray-600">&middot;</span>}
                <span>{formatDuration(notes.duration)}</span>
              </>
            )}
            {notes?.city && (
              <>
                {(item.time || notes?.duration) && (
                  <span className="text-stone-300 dark:text-gray-600">&middot;</span>
                )}
                <span className="flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" />
                  {notes.city}
                </span>
              </>
            )}
          </div>

          {/* Description or notes - single line */}
          {(item.description || notes?.notes) && (
            <p className="text-[11px] text-stone-400 dark:text-gray-500 mt-1 line-clamp-1 leading-tight">
              {item.description || notes?.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
