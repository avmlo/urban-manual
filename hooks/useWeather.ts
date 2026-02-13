/**
 * Hook for accessing weather data from the trip builder context.
 * Provides weather forecast, rain flags, and swap suggestions for the active trip.
 */

import { useMemo } from "react";
import { useTripBuilder } from "@/contexts/TripBuilderContext";
import { DayWeather } from "@/types/trip";

export interface DayWeatherInfo {
  dayNumber: number;
  date?: string;
  weather: (DayWeather & { isRainy?: boolean }) | null;
  outdoorActivityCount: number;
  rainAffectedActivities: string[];
}

export function useWeather() {
  const {
    activeTrip,
    weatherForecast,
    weatherSwapSuggestions,
    isLoadingWeather,
    weatherError,
    fetchWeather,
    applyWeatherSwap,
    dismissWeatherSwaps,
  } = useTripBuilder();

  // Build per-day weather info with rain-affected activity details
  const dayWeatherInfo: DayWeatherInfo[] = useMemo(() => {
    if (!activeTrip) return [];

    return activeTrip.days.map((day) => {
      const forecast = weatherForecast.find((f) => f.date === day.date) || null;
      const isRainy =
        forecast?.isRainy || (forecast?.precipitation ?? 0) >= 60;

      const outdoorItems = day.items.filter((item) => item.isOutdoor);
      const rainAffected = isRainy
        ? outdoorItems.map((item) => item.destination.name)
        : [];

      return {
        dayNumber: day.dayNumber,
        date: day.date,
        weather: forecast,
        outdoorActivityCount: outdoorItems.length,
        rainAffectedActivities: rainAffected,
      };
    });
  }, [activeTrip, weatherForecast]);

  // Count of days with rain warnings
  const rainyDayCount = useMemo(
    () => dayWeatherInfo.filter((d) => d.rainAffectedActivities.length > 0).length,
    [dayWeatherInfo]
  );

  // Whether weather data is available
  const hasWeatherData = weatherForecast.length > 0;

  // Whether there are actionable swap suggestions
  const hasSwapSuggestions = weatherSwapSuggestions.length > 0;

  return {
    // Data
    weatherForecast,
    dayWeatherInfo,
    weatherSwapSuggestions,
    rainyDayCount,
    hasWeatherData,
    hasSwapSuggestions,

    // State
    isLoadingWeather,
    weatherError,

    // Actions
    fetchWeather,
    applyWeatherSwap,
    dismissWeatherSwaps,
  };
}
