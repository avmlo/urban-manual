"use client";

import { useState } from "react";
import { CloudRain, ArrowLeftRight, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WeatherSwapSuggestion } from "@/lib/trip-intelligence";

interface WeatherSwapBannerProps {
  suggestions: WeatherSwapSuggestion[];
  onApplySwap: (suggestion: WeatherSwapSuggestion) => void;
  onDismiss: () => void;
  className?: string;
}

/**
 * Banner that appears when rain is forecasted on days with outdoor activities.
 * Suggests swapping outdoor items on rainy days with indoor items on clear days.
 */
export default function WeatherSwapBanner({
  suggestions,
  onApplySwap,
  onDismiss,
  className,
}: WeatherSwapBannerProps) {
  const [appliedSwaps, setAppliedSwaps] = useState<Set<number>>(new Set());

  if (suggestions.length === 0) return null;

  const handleApply = (suggestion: WeatherSwapSuggestion, index: number) => {
    onApplySwap(suggestion);
    setAppliedSwaps((prev) => new Set(prev).add(index));
  };

  const allApplied = appliedSwaps.size === suggestions.length;

  return (
    <div
      className={cn(
        "rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20",
        className
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudRain size={16} className="text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Rain forecast detected
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="rounded p-1 text-blue-400 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-800"
        >
          <X size={14} />
        </button>
      </div>

      <p className="mb-3 text-xs text-blue-700 dark:text-blue-300">
        {suggestions.length === 1
          ? "We found an outdoor activity on a rainy day that could be swapped:"
          : `We found ${suggestions.length} outdoor activities on rainy days that could be reshuffled:`}
      </p>

      <div className="space-y-2">
        {suggestions.map((suggestion, i) => {
          const isApplied = appliedSwaps.has(i);

          return (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2 rounded-md border p-2 text-xs",
                isApplied
                  ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                  : "border-blue-100 bg-white dark:border-blue-700 dark:bg-gray-900"
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-800 dark:text-blue-300">
                  Day {suggestion.affectedDay}
                </span>
                <span className="truncate font-medium text-gray-900 dark:text-gray-100">
                  {suggestion.affectedItem.name}
                </span>
                <ArrowLeftRight
                  size={12}
                  className="shrink-0 text-gray-400"
                />
                <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-800 dark:text-amber-300">
                  Day {suggestion.targetDay}
                </span>
                <span className="truncate font-medium text-gray-900 dark:text-gray-100">
                  {suggestion.targetItem.name}
                </span>
              </div>

              {isApplied ? (
                <span className="flex shrink-0 items-center gap-1 text-green-600 dark:text-green-400">
                  <Check size={12} />
                  Swapped
                </span>
              ) : (
                <button
                  onClick={() => handleApply(suggestion, i)}
                  className="shrink-0 rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Swap
                </button>
              )}
            </div>
          );
        })}
      </div>

      {suggestions.length > 1 && !allApplied && (
        <button
          onClick={() => {
            suggestions.forEach((s, i) => {
              if (!appliedSwaps.has(i)) {
                handleApply(s, i);
              }
            });
          }}
          className="mt-2 w-full rounded-md bg-blue-600 py-1.5 text-xs font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Apply all swaps
        </button>
      )}
    </div>
  );
}
