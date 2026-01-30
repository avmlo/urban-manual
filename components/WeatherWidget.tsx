'use client';

import { useEffect, useState } from 'react';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudRain,
  CloudSnow,
  CloudDrizzle,
  CloudLightning,
  Thermometer,
  Wind,
  Droplets
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WeatherData } from '@/lib/enrichment/weather';

interface WeatherWidgetProps {
  latitude?: number | null;
  longitude?: number | null;
  className?: string;
}

export function WeatherWidget({ latitude, longitude, className }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchWeather() {
      if (!latitude || !longitude) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        if (mounted) setLoading(true);
        const response = await fetch(
          `/api/weather?lat=${latitude}&lng=${longitude}`,
          { signal: AbortSignal.timeout(5000) }
        );

        if (response.ok) {
          const data = await response.json();
          if (mounted) {
            setWeather(data);
            setError(false);
          }
        } else {
          if (mounted) setError(true);
        }
      } catch (err) {
        console.warn('Weather fetch failed:', err);
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchWeather();

    return () => {
      mounted = false;
    };
  }, [latitude, longitude]);

  if (!latitude || !longitude || error) return null;

  if (loading) {
    return (
      <div className={cn("bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl p-5 animate-pulse", className)}>
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-4"></div>
        <div className="flex justify-between items-center">
          <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800 rounded"></div>
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const getWeatherIcon = (code: number) => {
    // WMO Weather interpretation codes (WW)
    if (code === 0) return <Sun className="w-5 h-5 text-yellow-500" />;
    if (code >= 1 && code <= 3) return <CloudSun className="w-5 h-5 text-gray-500" />;
    if (code >= 45 && code <= 48) return <CloudFog className="w-5 h-5 text-gray-400" />;
    if (code >= 51 && code <= 55) return <CloudDrizzle className="w-5 h-5 text-blue-400" />;
    if (code >= 61 && code <= 65) return <CloudRain className="w-5 h-5 text-blue-500" />;
    if (code >= 71 && code <= 77) return <CloudSnow className="w-5 h-5 text-sky-200" />;
    if (code >= 80 && code <= 82) return <CloudRain className="w-5 h-5 text-blue-600" />;
    if (code >= 85 && code <= 86) return <CloudSnow className="w-5 h-5 text-sky-300" />;
    if (code >= 95) return <CloudLightning className="w-5 h-5 text-purple-500" />;
    return <Cloud className="w-5 h-5 text-gray-400" />;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  return (
    <div className={cn("bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl p-5", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Sun className="h-4 w-4 text-gray-500 dark:text-[#8b949e]" />
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Current Weather
        </h3>
      </div>

      {/* Current Weather */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-semibold text-gray-900 dark:text-white">
              {Math.round(weather.current.temperature)}°
            </span>
            <span className="text-sm text-gray-500 dark:text-[#8b949e]">
              {weather.current.weatherDescription}
            </span>
          </div>
          <div className="flex gap-3 mt-1 text-xs text-gray-500 dark:text-[#8b949e]">
            <span className="flex items-center gap-1">
              <Wind className="w-3 h-3" />
              {Math.round(weather.current.windSpeed)} km/h
            </span>
            <span className="flex items-center gap-1">
              <Droplets className="w-3 h-3" />
              {weather.current.humidity}%
            </span>
          </div>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-[#0d1117] rounded-full border border-gray-100 dark:border-[#30363d]">
          {getWeatherIcon(weather.current.weatherCode)}
        </div>
      </div>

      {/* 3-Day Forecast */}
      <div className="grid grid-cols-3 gap-2 border-t border-gray-100 dark:border-[#30363d] pt-4">
        {weather.forecast.slice(0, 3).map((day, idx) => (
          <div key={idx} className="text-center">
            <p className="text-xs font-medium text-gray-500 dark:text-[#8b949e] mb-1">
              {idx === 0 ? 'Today' : formatDate(day.date)}
            </p>
            <div className="flex justify-center mb-1">
              {getWeatherIcon(day.weatherCode)}
            </div>
            <p className="text-xs font-medium text-gray-900 dark:text-white">
              {Math.round(day.temperatureMax)}° <span className="text-gray-400">/ {Math.round(day.temperatureMin)}°</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
