"use client";

import { CloudRain, Umbrella } from "lucide-react";
import { cn } from "@/lib/utils";

interface RainWarningFlagProps {
  activityName: string;
  precipitation: number;
  compact?: boolean;
  className?: string;
}

/**
 * Inline warning flag shown on outdoor activities when rain is forecasted.
 */
export default function RainWarningFlag({
  activityName,
  precipitation,
  compact = false,
  className,
}: RainWarningFlagProps) {
  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
          className
        )}
        title={`${precipitation}% chance of rain - outdoor activity`}
      >
        <Umbrella size={10} />
        Rain risk
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 dark:border-amber-800 dark:bg-amber-900/20",
        className
      )}
    >
      <CloudRain
        size={14}
        className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
      />
      <div className="min-w-0 text-xs">
        <span className="font-medium text-amber-800 dark:text-amber-200">
          Rain forecasted ({precipitation}%)
        </span>
        <span className="text-amber-600 dark:text-amber-400">
          {" "}
          &mdash; {activityName} is outdoors. Consider swapping to a different day.
        </span>
      </div>
    </div>
  );
}
