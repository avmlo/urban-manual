/**
 * Weather Helper for Greetings
 * Integrates weather data into greeting context
 */

import { getWeatherEmoji } from '@/lib/enrichment/weather';

export interface GreetingWeatherData {
  city: string;
  temperature: number;
  weatherCode: number;
  description: string;
  emoji: string;
}

// City coordinates for weather lookups
export const CITY_COORDINATES: Record<string, { lat: number; lon: number }> = {
  'tokyo': { lat: 35.6762, lon: 139.6503 },
  'kyoto': { lat: 35.0116, lon: 135.7681 },
  'osaka': { lat: 34.6937, lon: 135.5023 },
  'paris': { lat: 48.8566, lon: 2.3522 },
  'london': { lat: 51.5074, lon: -0.1278 },
  'copenhagen': { lat: 55.6761, lon: 12.5683 },
  'barcelona': { lat: 41.3851, lon: 2.1734 },
  'new york': { lat: 40.7128, lon: -74.0060 },
  'new-york': { lat: 40.7128, lon: -74.0060 },
  'los angeles': { lat: 34.0522, lon: -118.2437 },
  'los-angeles': { lat: 34.0522, lon: -118.2437 },
  'san francisco': { lat: 37.7749, lon: -122.4194 },
  'san-francisco': { lat: 37.7749, lon: -122.4194 },
  'rome': { lat: 41.9028, lon: 12.4964 },
  'amsterdam': { lat: 52.3676, lon: 4.9041 },
  'berlin': { lat: 52.5200, lon: 13.4050 },
  'vienna': { lat: 48.2082, lon: 16.3738 },
  'prague': { lat: 50.0755, lon: 14.4378 },
  'lisbon': { lat: 38.7223, lon: -9.1393 },
  'madrid': { lat: 40.4168, lon: -3.7038 },
  'singapore': { lat: 1.3521, lon: 103.8198 },
  'hong kong': { lat: 22.3193, lon: 114.1694 },
  'hong-kong': { lat: 22.3193, lon: 114.1694 },
  'seoul': { lat: 37.5665, lon: 126.9780 },
  'bangkok': { lat: 13.7563, lon: 100.5018 },
  'sydney': { lat: -33.8688, lon: 151.2093 },
  'melbourne': { lat: -37.8136, lon: 144.9631 },
};

/**
 * Normalize city name
 */
export function normalizeCityName(city: string): string {
  return city
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * Get coordinates for a city
 */
export function getCityCoordinates(city: string): { lat: number; lon: number } | null {
  const normalized = normalizeCityName(city);
  return CITY_COORDINATES[normalized] || null;
}

/**
 * Get weather context message for greeting
 */
export function getWeatherGreetingMessage(
  weather: GreetingWeatherData,
  city: string
): string | null {
  const temp = weather.temperature;
  const code = weather.weatherCode;
  const emoji = weather.emoji;

  // Extreme cold
  if (temp < 0) {
    return `${emoji} Bundle up! It's freezing in ${city} (${Math.round(temp)}°C)`;
  }

  // Cold weather
  if (temp < 10) {
    return `${emoji} Chilly in ${city} (${Math.round(temp)}°C). Perfect for cozy cafes!`;
  }

  // Hot weather
  if (temp > 30) {
    return `${emoji} Hot in ${city} (${Math.round(temp)}°C)! Time for gelato?`;
  }

  // Rain
  if (code >= 51 && code <= 65) {
    return `${emoji} Rainy in ${city}. Perfect weather for museums!`;
  }

  // Snow
  if (code >= 71 && code <= 77) {
    return `${emoji} Snowy in ${city}! Hot chocolate time?`;
  }

  // Thunderstorm
  if (code >= 95) {
    return `${emoji} Stormy in ${city}. Stay cozy indoors!`;
  }

  // Perfect weather
  if (code <= 1 && temp >= 15 && temp <= 25) {
    return `${emoji} Perfect ${Math.round(temp)}°C in ${city}! Great day to explore`;
  }

  // No special message needed
  return null;
}
