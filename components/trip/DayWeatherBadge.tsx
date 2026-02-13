"use client";

import { cn } from "@/lib/utils";
import { DayWeather } from "@/types/trip";
import WeatherIcon from "./WeatherIcon";

interface DayWeatherBadgeProps {
  weather: DayWeather & { isRainy?: boolean };
  tempUnit?: "C" | "F";
  compact?: boolean;
  className?: string;
}

/**
 * Compact weather badge for a single day in the trip itinerary.
 * Shows icon, high/low temps, and precipitation chance.
 */
export default function DayWeatherBadge({
  weather,
  tempUnit = "C",
  compact = false,
  className,
}: DayWeatherBadgeProps) {
  const deg = tempUnit === "F" ? "F" : "C";
  const isRainy = weather.isRainy || weather.precipitation >= 60;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
          isRainy
            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            : "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
          className
        )}
        title={`${weather.condition} - ${weather.tempHigh}/${weather.tempLow}${deg}`}
      >
        <WeatherIcon icon={weather.icon} size={14} />
        <span>
          {weather.tempHigh}/{weather.tempLow}
        </span>
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2",
        isRainy
          ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
          : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800",
        className
      )}
    >
      <WeatherIcon icon={weather.icon} size={22} />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {weather.condition}
        </span>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>
            {weather.tempHigh}/{weather.tempLow}&deg;{deg}
          </span>
          {weather.precipitation > 0 && (
            <span
              className={cn(
                isRainy ? "font-medium text-blue-600 dark:text-blue-400" : ""
              )}
            >
              {weather.precipitation}% rain
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
