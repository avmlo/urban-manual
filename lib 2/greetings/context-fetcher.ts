/**
 * Greeting Context Fetcher
 * Server-side utility to fetch all greeting context data
 */

import { analyzeUserJourney } from './journey-tracker';
import { getRecentAchievements, getNextAchievementProgress } from './achievement-helper';
import { fetchWeather } from '@/lib/enrichment/weather';
import { getCityCoordinates } from './weather-helper';

export interface EnrichedGreetingContext {
  journey?: any;
  recentAchievements?: any[];
  nextAchievement?: any;
  weather?: any;
  trendingCity?: string;
  aiGreeting?: string;
}

/**
 * Fetch all enriched greeting context for a user
 * This is called server-side from the homepage
 */
export async function fetchGreetingContext(
  userId: string,
  favoriteCity?: string
): Promise<EnrichedGreetingContext> {
  const context: EnrichedGreetingContext = {};

  try {
    // Fetch all data in parallel for performance
    const [journey, achievements, nextAchievement, weather, trending] = await Promise.all([
      // Phase 3: Journey insights
      analyzeUserJourney(userId).catch(err => {
        console.error('Error fetching journey:', err);
        return null;
      }),

      // Phase 3: Recent achievements
      getRecentAchievements(userId).catch(err => {
        console.error('Error fetching achievements:', err);
        return [];
      }),

      // Phase 3: Next achievement progress
      getNextAchievementProgress(userId).catch(err => {
        console.error('Error fetching next achievement:', err);
        return null;
      }),

      // Phase 2: Weather for favorite city
      favoriteCity
        ? (async () => {
            const coords = getCityCoordinates(favoriteCity);
            if (!coords) return null;
            const weatherData = await fetchWeather(coords.lat, coords.lon);
            if (!weatherData) return null;
            return {
              city: favoriteCity,
              temperature: weatherData.current.temperature,
              weatherCode: weatherData.current.weatherCode,
              description: weatherData.current.weatherDescription,
              emoji: getWeatherEmoji(weatherData.current.weatherCode),
            };
          })().catch(err => {
            console.error('Error fetching weather:', err);
            return null;
          })
        : null,

      // Phase 3: Trending city (fetch top trending city)
      fetchTrendingCity().catch(err => {
        console.error('Error fetching trending:', err);
        return null;
      }),
    ]);

    context.journey = journey;
    context.recentAchievements = achievements;
    context.nextAchievement = nextAchievement;
    context.weather = weather;
    context.trendingCity = trending ?? undefined; // Convert null to undefined

    return context;
  } catch (error) {
    console.error('Error fetching greeting context:', error);
    return context;
  }
}

/**
 * Get weather emoji (imported from enrichment/weather)
 */
function getWeatherEmoji(code: number): string {
  const emojiMap: Record<number, string> = {
    0: '☀️',
    1: '🌤️',
    2: '⛅',
    3: '☁️',
    45: '🌫️',
    48: '🌫️',
    51: '🌦️',
    53: '🌦️',
    55: '🌧️',
    61: '🌧️',
    63: '🌧️',
    65: '⛈️',
    71: '🌨️',
    73: '🌨️',
    75: '❄️',
    77: '❄️',
    80: '🌦️',
    81: '🌧️',
    82: '⛈️',
    85: '🌨️',
    86: '❄️',
    95: '⛈️',
    96: '⛈️',
    99: '⛈️',
  };
  return emojiMap[code] || '🌤️';
}

/**
 * Fetch top trending city
 */
async function fetchTrendingCity(): Promise<string | null> {
  try {
    // Fetch from trending API
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/trending?limit=1`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.trending && data.trending.length > 0) {
      return data.trending[0].city;
    }

    return null;
  } catch (error) {
    console.error('Error fetching trending city:', error);
    return null;
  }
}
