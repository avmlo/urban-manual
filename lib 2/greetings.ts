/**
 * Context-Aware Greeting System (Phase 2 & 3)
 * Generates personalized greetings based on user profile, session history, and context
 *
 * Features:
 * - Phase 1: Time-based, returning user, favorite city, seasonal events
 * - Phase 2: AI-generated greetings, budget/vibe continuity, weather integration
 * - Phase 3: Multi-session journey tracking, achievements, trending, conversation history
 */

import { getSeasonalContext } from '@/services/seasonality';
import { UserProfile } from '@/types/personalization';
import { JourneyInsights, getJourneyGreetingMessage } from './greetings/journey-tracker';
import { RecentAchievement, getAchievementGreetingMessage, getProgressGreetingMessage } from './greetings/achievement-helper';
import { GreetingWeatherData, getWeatherGreetingMessage } from './greetings/weather-helper';

export interface GreetingContext {
  userName?: string;
  userProfile?: UserProfile | null;
  lastSession?: {
    id: string;
    last_activity: string;
    context_summary?: {
      city?: string;
      category?: string;
      preferences?: string[];
      lastQuery?: string;
      mood?: string; // Phase 2: vibe continuity
      price_level?: string; // Phase 2: budget continuity
    };
  } | null;
  currentHour?: number;
  currentDay?: number; // 0-6 (Sunday-Saturday)
  // Phase 2 & 3 enhancements
  journey?: JourneyInsights | null; // Phase 3: multi-session tracking
  recentAchievements?: RecentAchievement[]; // Phase 3: achievement system
  nextAchievement?: { name: string; progress: number; target: number; emoji: string } | null;
  weather?: GreetingWeatherData | null; // Phase 2: weather integration
  trendingCity?: string | null; // Phase 3: trending integration
  aiGreeting?: string | null; // Phase 2: AI-generated greeting
  conversationCount?: number; // Phase 3: conversation history awareness
}

export interface GreetingResult {
  greeting: string;
  subtext?: string;
  type: 'basic' | 'returning' | 'favorite_city' | 'seasonal' | 'time_activity' | 'day_of_week'
        | 'ai_generated' | 'weather' | 'achievement' | 'journey' | 'trending' | 'vibe_continuity';
}

/**
 * Get time-based greeting
 */
function getTimeGreeting(hour: number = new Date().getHours()): string {
  if (hour < 12) return 'GOOD MORNING';
  if (hour < 18) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}

/**
 * Get time-appropriate activity suggestion
 */
function getTimeActivity(hour: number): string | null {
  if (hour >= 6 && hour < 11) return 'Looking for breakfast spots?';
  if (hour >= 11 && hour < 14) return 'Lunch plans sorted?';
  if (hour >= 17 && hour < 21) return 'Dinner reservations needed?';
  if (hour >= 21 || hour < 2) return 'Late-night eats or cocktail bars?';
  return null;
}

/**
 * Get day-of-week context
 */
function getDayContext(day: number): string | null {
  switch (day) {
    case 1: return 'New week, new spots to discover!';
    case 0: return 'Lazy Sunday brunch vibes?';
    default: return null;
  }
}

/**
 * Check if session is recent (within 24 hours)
 */
function isRecentSession(lastActivity: string): boolean {
  const lastActivityDate = new Date(lastActivity);
  const now = new Date();
  const diffHours = (now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60);
  return diffHours < 24;
}

/**
 * Format time since last visit
 */
function getTimeSinceVisit(lastActivity: string): string {
  const lastActivityDate = new Date(lastActivity);
  const now = new Date();
  const diffMs = now.getTime() - lastActivityDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return 'a few minutes';
  if (diffHours < 2) return 'an hour';
  if (diffHours < 24) return `${diffHours} hours`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days`;
  if (diffDays < 14) return 'a week';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks`;
  return 'a while';
}

/**
 * Generate context-aware greeting with Phase 2 & 3 enhancements
 */
export function generateContextualGreeting(context: GreetingContext): GreetingResult {
  const hour = context.currentHour ?? new Date().getHours();
  const day = context.currentDay ?? new Date().getDay();
  const baseGreeting = getTimeGreeting(hour);
  const userNamePart = context.userName ? `, ${context.userName}` : '';

  // PHASE 2 & 3: Priority 1 - AI-generated personalized greeting
  if (context.aiGreeting) {
    return {
      greeting: `${baseGreeting}${userNamePart}`,
      subtext: context.aiGreeting,
      type: 'ai_generated',
    };
  }

  // PHASE 3: Priority 2 - Recent achievement (within 48 hours)
  if (context.recentAchievements && context.recentAchievements.length > 0) {
    const achievementMessage = getAchievementGreetingMessage(context.recentAchievements);
    if (achievementMessage) {
      return {
        greeting: `${baseGreeting}${userNamePart}`,
        subtext: achievementMessage,
        type: 'achievement',
      };
    }
  }

  // PHASE 3: Priority 3 - Close to unlocking achievement
  if (context.nextAchievement) {
    const progressMessage = getProgressGreetingMessage(context.nextAchievement);
    if (progressMessage) {
      return {
        greeting: `${baseGreeting}${userNamePart}`,
        subtext: progressMessage,
        type: 'achievement',
      };
    }
  }

  // PHASE 3: Priority 4 - Journey pattern recognition (exploration streaks, patterns)
  if (context.journey) {
    const journeyMessage = getJourneyGreetingMessage(context.journey);
    if (journeyMessage) {
      return {
        greeting: `${baseGreeting}${userNamePart}`,
        subtext: journeyMessage,
        type: 'journey',
      };
    }
  }

  // PHASE 2: Priority 5 - Vibe/mood continuity from last session
  if (context.lastSession && isRecentSession(context.lastSession.last_activity)) {
    const summary = context.lastSession.context_summary;

    // Mood/vibe continuity
    if (summary?.mood && summary.mood !== 'any') {
      const city = summary.city || 'your next destination';
      return {
        greeting: `${baseGreeting}${userNamePart}`,
        subtext: `Still looking for ${summary.mood} vibes in ${city}?`,
        type: 'vibe_continuity',
      };
    }

    // Budget continuity
    if (summary?.price_level && summary.price_level !== '$') {
      const budgetLabels: Record<string, string> = {
        '$$': 'moderate',
        '$$$': 'upscale',
        '$$$$': 'luxury',
      };
      const budgetLabel = budgetLabels[summary.price_level];
      if (budgetLabel) {
        return {
          greeting: `${baseGreeting}${userNamePart}`,
          subtext: `Continuing the ${budgetLabel} search? I have more suggestions!`,
          type: 'vibe_continuity',
        };
      }
    }

    // If there's a specific last query
    if (summary?.lastQuery) {
      return {
        greeting: `${baseGreeting}${userNamePart}`,
        subtext: `Still exploring ${summary.lastQuery.toLowerCase()}?`,
        type: 'returning',
      };
    }

    // If there's a city in context
    if (summary?.city) {
      const category = summary.category ? ` ${summary.category.toLowerCase()}` : '';
      return {
        greeting: `${baseGreeting}${userNamePart}`,
        subtext: `Ready to continue planning your ${summary.city}${category} adventure?`,
        type: 'returning',
      };
    }

    // Generic returning user
    const timeSince = getTimeSinceVisit(context.lastSession.last_activity);
    if (timeSince === 'a few minutes') {
      return {
        greeting: `${baseGreeting}${userNamePart}`,
        subtext: 'Still here! Need more options?',
        type: 'returning',
      };
    }
  }

  // Priority 6: Returning user after days
  if (context.lastSession && !isRecentSession(context.lastSession.last_activity)) {
    const timeSince = getTimeSinceVisit(context.lastSession.last_activity);
    return {
      greeting: `${baseGreeting}${userNamePart}`,
      subtext: `Welcome back! It's been ${timeSince}. Ready for new discoveries?`,
      type: 'returning',
    };
  }

  // PHASE 2: Priority 7 - Weather integration (for favorite city or trending city)
  if (context.weather) {
    const city = context.userProfile?.favorite_cities?.[0] || context.weather.city || 'your city';
    const weatherMessage = getWeatherGreetingMessage(context.weather, city);
    if (weatherMessage) {
      return {
        greeting: `${baseGreeting}${userNamePart}`,
        subtext: weatherMessage,
        type: 'weather',
      };
    }
  }

  // Priority 8: Seasonal event awareness (if user has favorite city)
  if (context.userProfile?.favorite_cities && context.userProfile.favorite_cities.length > 0) {
    const favoriteCity = context.userProfile.favorite_cities[0];
    const seasonalInfo = getSeasonalContext(favoriteCity);

    if (seasonalInfo) {
      // Check if it's an active event or upcoming
      const now = new Date();
      const isActive = now >= seasonalInfo.start && now <= seasonalInfo.end;

      if (isActive) {
        return {
          greeting: `${baseGreeting}${userNamePart}`,
          subtext: `${seasonalInfo.event} is happening now in ${favoriteCity}! Planning a visit?`,
          type: 'seasonal',
        };
      } else {
        // For upcoming events within 60 days
        const daysUntil = Math.ceil((seasonalInfo.start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil > 0 && daysUntil <= 60) {
          return {
            greeting: `${baseGreeting}${userNamePart}`,
            subtext: `${seasonalInfo.event} in ${favoriteCity} is ${daysUntil} days away. Time to plan?`,
            type: 'seasonal',
          };
        }
      }
    }

    // Priority 9: Favorite city greeting (no seasonal event)
    return {
      greeting: `${baseGreeting}${userNamePart}`,
      subtext: `Want to discover more hidden gems in ${favoriteCity}?`,
      type: 'favorite_city',
    };
  }

  // PHASE 3: Priority 10 - Trending city suggestion
  if (context.trendingCity) {
    return {
      greeting: `${baseGreeting}${userNamePart}`,
      subtext: `${context.trendingCity} is trending right now. Curious to explore?`,
      type: 'trending',
    };
  }

  // Priority 11: Time-appropriate activity suggestions
  const timeActivity = getTimeActivity(hour);
  if (timeActivity) {
    return {
      greeting: `${baseGreeting}${userNamePart}`,
      subtext: timeActivity,
      type: 'time_activity',
    };
  }

  // Priority 12: Day-of-week context
  const dayContext = getDayContext(day);
  if (dayContext) {
    return {
      greeting: `${baseGreeting}${userNamePart}`,
      subtext: dayContext,
      type: 'day_of_week',
    };
  }

  // Fallback: Basic greeting with generic prompt
  return {
    greeting: `${baseGreeting}${userNamePart}`,
    subtext: 'What are you craving today?',
    type: 'basic',
  };
}

/**
 * Generate context-aware placeholder text for search input (Phase 2 & 3 enhancements)
 */
export function generateContextualPlaceholder(context: GreetingContext): string {
  const hour = context.currentHour ?? new Date().getHours();

  // PHASE 3: Journey pattern-based placeholder
  if (context.journey?.recentPattern) {
    if (context.journey.recentPattern.startsWith('exploring-')) {
      const city = context.journey.recentPattern.split('-')[1];
      return `More hidden gems in ${city}...`;
    }
    if (context.journey.recentPattern.endsWith('-hunting')) {
      const category = context.journey.recentPattern.split('-')[0];
      return `Best ${category} spots in...`;
    }
    if (context.journey.recentPattern === 'city-hopping') {
      return 'Compare destinations across cities...';
    }
  }

  // PHASE 2: Mood/vibe continuity
  if (context.lastSession?.context_summary?.mood && context.lastSession.context_summary.mood !== 'any') {
    const mood = context.lastSession.context_summary.mood;
    return `${mood} vibes in...`;
  }

  // If returning user with context
  if (context.lastSession?.context_summary) {
    const summary = context.lastSession.context_summary;

    if (summary.city && summary.category) {
      return `More ${summary.category.toLowerCase()} in ${summary.city}...`;
    }

    if (summary.city) {
      return `What else in ${summary.city}?`;
    }

    if (summary.category) {
      return `More ${summary.category.toLowerCase()} spots...`;
    }
  }

  // PHASE 3: Trending city
  if (context.trendingCity) {
    return `Trending now: discover ${context.trendingCity}...`;
  }

  // If user has favorite city
  if (context.userProfile?.favorite_cities && context.userProfile.favorite_cities.length > 0) {
    const favoriteCity = context.userProfile.favorite_cities[0];

    // Check for seasonal events
    const seasonalInfo = getSeasonalContext(favoriteCity);
    if (seasonalInfo) {
      return `${seasonalInfo.event} experiences in ${favoriteCity}...`;
    }

    // PHASE 2: Favorite category + favorite city combo
    if (context.userProfile.favorite_categories && context.userProfile.favorite_categories.length > 0) {
      const favoriteCategory = context.userProfile.favorite_categories[0];
      return `${favoriteCategory} in ${favoriteCity}...`;
    }

    return `Hidden gems in ${favoriteCity}...`;
  }

  // Time-based suggestions
  if (hour >= 6 && hour < 11) {
    return 'Breakfast croissants in...';
  }
  if (hour >= 11 && hour < 14) {
    return 'Best lunch spots in...';
  }
  if (hour >= 17 && hour < 21) {
    return 'Romantic dinner in...';
  }
  if (hour >= 21 || hour < 2) {
    return 'Late-night cocktail bars...';
  }

  // Generic fallback
  return 'Ask me anything about travel';
}
