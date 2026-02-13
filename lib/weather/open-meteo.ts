/**
 * Open-Meteo Weather Service
 *
 * Fetches 7-day weather forecasts using the free Open-Meteo API.
 * No API key required. Documentation: https://open-meteo.com/en/docs
 */

import { DayWeather } from "@/types/trip";

// WMO Weather interpretation codes
// https://open-meteo.com/en/docs#weathervariables
const WMO_CODES: Record<number, { condition: string; icon: string }> = {
  0: { condition: "Clear sky", icon: "sunny" },
  1: { condition: "Mainly clear", icon: "sunny" },
  2: { condition: "Partly cloudy", icon: "partly_cloudy" },
  3: { condition: "Overcast", icon: "cloudy" },
  45: { condition: "Fog", icon: "fog" },
  48: { condition: "Depositing rime fog", icon: "fog" },
  51: { condition: "Light drizzle", icon: "drizzle" },
  53: { condition: "Moderate drizzle", icon: "drizzle" },
  55: { condition: "Dense drizzle", icon: "rain" },
  56: { condition: "Light freezing drizzle", icon: "sleet" },
  57: { condition: "Dense freezing drizzle", icon: "sleet" },
  61: { condition: "Slight rain", icon: "rain" },
  63: { condition: "Moderate rain", icon: "rain" },
  65: { condition: "Heavy rain", icon: "heavy_rain" },
  66: { condition: "Light freezing rain", icon: "sleet" },
  67: { condition: "Heavy freezing rain", icon: "sleet" },
  71: { condition: "Slight snow", icon: "snow" },
  73: { condition: "Moderate snow", icon: "snow" },
  75: { condition: "Heavy snow", icon: "heavy_snow" },
  77: { condition: "Snow grains", icon: "snow" },
  80: { condition: "Slight rain showers", icon: "rain" },
  81: { condition: "Moderate rain showers", icon: "rain" },
  82: { condition: "Violent rain showers", icon: "heavy_rain" },
  85: { condition: "Slight snow showers", icon: "snow" },
  86: { condition: "Heavy snow showers", icon: "heavy_snow" },
  95: { condition: "Thunderstorm", icon: "thunderstorm" },
  96: { condition: "Thunderstorm with slight hail", icon: "thunderstorm" },
  99: { condition: "Thunderstorm with heavy hail", icon: "thunderstorm" },
};

// Icons that represent rainy/wet conditions
const RAINY_ICONS = new Set([
  "drizzle",
  "rain",
  "heavy_rain",
  "sleet",
  "thunderstorm",
]);

interface OpenMeteoDaily {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  precipitation_probability_max: number[];
}

interface OpenMeteoResponse {
  daily: OpenMeteoDaily;
}

/**
 * Geocode a city name to coordinates using Open-Meteo's geocoding API.
 */
export async function geocodeCity(
  city: string
): Promise<{ latitude: number; longitude: number; name: string } | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;

  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  if (!data.results || data.results.length === 0) return null;

  const result = data.results[0];
  return {
    latitude: result.latitude,
    longitude: result.longitude,
    name: result.name,
  };
}

/**
 * Fetch a 7-day weather forecast from Open-Meteo.
 *
 * @param latitude - Location latitude
 * @param longitude - Location longitude
 * @param tempUnit - Temperature unit: 'C' for Celsius, 'F' for Fahrenheit
 * @param startDate - Optional start date (ISO format). If provided with endDate, filters results.
 * @param endDate - Optional end date (ISO format).
 */
export async function fetchWeatherForecast(
  latitude: number,
  longitude: number,
  tempUnit: "C" | "F" = "C",
  startDate?: string,
  endDate?: string
): Promise<DayWeather[]> {
  const temperatureUnit =
    tempUnit === "F" ? "fahrenheit" : "celsius";

  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
    temperature_unit: temperatureUnit,
    timezone: "auto",
    forecast_days: "16",
  });

  // If specific dates requested, use start_date/end_date params
  if (startDate && endDate) {
    params.set("start_date", startDate);
    params.set("end_date", endDate);
  }

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

  const response = await fetch(url, { next: { revalidate: 1800 } }); // Cache 30 min
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }

  const data: OpenMeteoResponse = await response.json();

  return data.daily.time.map((date, i) => {
    const code = data.daily.weather_code[i];
    const weather = WMO_CODES[code] || {
      condition: "Unknown",
      icon: "cloudy",
    };

    return {
      date,
      tempHigh: Math.round(data.daily.temperature_2m_max[i]),
      tempLow: Math.round(data.daily.temperature_2m_min[i]),
      condition: weather.condition,
      icon: weather.icon,
      precipitation: data.daily.precipitation_probability_max[i] ?? 0,
    };
  });
}

/**
 * Check if a weather icon represents rainy conditions.
 */
export function isRainyWeather(icon: string): boolean {
  return RAINY_ICONS.has(icon);
}

/**
 * Check if weather conditions are unfavorable for outdoor activities.
 * Returns true for rain, heavy snow, thunderstorms, or high precipitation probability.
 */
export function isWeatherUnfavorable(weather: DayWeather): boolean {
  return isRainyWeather(weather.icon) || weather.precipitation >= 60;
}
