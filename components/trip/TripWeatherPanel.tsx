"use client";

import { CloudOff, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWeather } from "@/hooks/useWeather";
import TripWeatherForecast from "./TripWeatherForecast";
import WeatherSwapBanner from "./WeatherSwapBanner";

interface TripWeatherPanelProps {
  className?: string;
}

/**
 * Complete weather panel for the trip builder sidebar.
 * Shows the 7-day forecast strip and weather swap suggestions.
 */
export default function TripWeatherPanel({
  className,
}: TripWeatherPanelProps) {
  const {
    weatherForecast,
    weatherSwapSuggestions,
    isLoadingWeather,
    weatherError,
    hasWeatherData,
    hasSwapSuggestions,
    fetchWeather,
    applyWeatherSwap,
    dismissWeatherSwaps,
  } = useWeather();

  if (isLoadingWeather) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400",
          className
        )}
      >
        <Loader2 size={14} className="animate-spin" />
        Loading weather forecast...
      </div>
    );
  }

  if (weatherError) {
    return (
      <div
        className={cn(
          "flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800",
          className
        )}
      >
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <CloudOff size={14} />
          <span>Weather unavailable</span>
        </div>
        <button
          onClick={fetchWeather}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          title="Retry"
        >
          <RefreshCw size={12} />
        </button>
      </div>
    );
  }

  if (!hasWeatherData) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Weather Forecast
        </h3>
        <button
          onClick={fetchWeather}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          title="Refresh weather"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      <TripWeatherForecast forecast={weatherForecast} />

      {hasSwapSuggestions && (
        <WeatherSwapBanner
          suggestions={weatherSwapSuggestions}
          onApplySwap={applyWeatherSwap}
          onDismiss={dismissWeatherSwaps}
        />
      )}
    </div>
  );
}
