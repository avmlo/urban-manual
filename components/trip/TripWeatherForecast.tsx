"use client";

import { cn } from "@/lib/utils";
import { DayWeather } from "@/types/trip";
import WeatherIcon from "./WeatherIcon";

interface TripWeatherForecastProps {
  forecast: (DayWeather & { isRainy?: boolean })[];
  className?: string;
}

/**
 * Horizontal strip showing weather for each trip day.
 */
export default function TripWeatherForecast({
  forecast,
  className,
}: TripWeatherForecastProps) {
  if (forecast.length === 0) return null;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {forecast.map((day, i) => {
          const isRainy = day.isRainy || day.precipitation >= 60;
          const date = new Date(day.date + "T00:00:00");
          const dayLabel =
            i === 0
              ? "Today"
              : date.toLocaleDateString("en-US", { weekday: "short" });
          const dateLabel = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });

          return (
            <div
              key={day.date}
              className={cn(
                "flex min-w-[64px] flex-col items-center rounded-lg px-2 py-2 text-center",
                isRainy
                  ? "bg-blue-50 dark:bg-blue-900/20"
                  : "bg-gray-50 dark:bg-gray-800/50"
              )}
            >
              <span className="text-[10px] font-medium uppercase text-gray-500 dark:text-gray-400">
                {dayLabel}
              </span>
              <span className="mb-1 text-[10px] text-gray-400 dark:text-gray-500">
                {dateLabel}
              </span>
              <WeatherIcon icon={day.icon} size={20} />
              <div className="mt-1 text-xs">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {day.tempHigh}&deg;
                </span>
                <span className="text-gray-400 dark:text-gray-500">
                  /{day.tempLow}&deg;
                </span>
              </div>
              {day.precipitation > 0 && (
                <span
                  className={cn(
                    "mt-0.5 text-[10px]",
                    isRainy
                      ? "font-medium text-blue-600 dark:text-blue-400"
                      : "text-gray-400"
                  )}
                >
                  {day.precipitation}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
