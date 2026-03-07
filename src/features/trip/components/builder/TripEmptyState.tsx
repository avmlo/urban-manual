'use client';

import { memo } from 'react';
import { Sparkles, Wand2, Map, Loader2 } from 'lucide-react';
import { TripEmptyStateProps } from './types';

/**
 * TripEmptyState - Shown when a trip has no items
 *
 * Provides clear onboarding with options to:
 * - Get AI suggestions
 * - Browse destinations manually
 *
 * Design emphasizes the intelligent features of the trip builder.
 */
const TripEmptyState = memo(function TripEmptyState({
  city,
  isLoading,
  onSuggest,
  onBrowse,
}: TripEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      {/* Icon */}
      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 dark:from-white/10 dark:to-white/5 flex items-center justify-center mb-5 shadow-sm">
        <Sparkles className="w-7 h-7 text-gray-400" />
      </div>

      {/* Heading */}
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
        Ready to explore {city}?
      </h3>

      {/* Description */}
      <p className="text-sm text-gray-500 mb-6 max-w-[260px] leading-relaxed">
        Add places from the homepage or let our AI curate the perfect itinerary for you
      </p>

      {/* Actions */}
      <div className="flex flex-col gap-2.5 w-full max-w-[220px]">
        {/* Primary: AI Suggestions */}
        <button
          onClick={onSuggest}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4" />
          )}
          Get AI suggestions
        </button>

        {/* Secondary: Browse */}
        <button
          onClick={onBrowse}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 rounded-xl hover:bg-gray-200 dark:hover:bg-white/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Map className="w-4 h-4" />
          Browse destinations
        </button>
      </div>

      {/* Tip */}
      <p className="mt-6 text-xs text-gray-400 max-w-[220px]">
        Tip: Click the + button on any destination card to add it to your trip
      </p>
    </div>
  );
});

export default TripEmptyState;
