/**
 * Multi-Session Journey Tracking for Greetings
 * Analyzes user exploration patterns across sessions
 */

import { createClient } from '@supabase/supabase-js';

// Get Supabase service role client (for admin operations)
// Note: This should ideally be in an API route, but kept here for backward compatibility
function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = 
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';
  
  if (!url || !key) {
    return createClient('https://placeholder.supabase.co', 'placeholder-key');
  }
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export interface JourneyInsights {
  totalSessions: number;
  totalSearches: number;
  citiesExplored: string[];
  categoriesExplored: string[];
  dominantMood?: string; // Most frequently searched mood/vibe
  dominantBudget?: string; // Price level preference
  recentPattern?: string; // "exploring-tokyo" | "michelin-hunting" | "budget-cafes"
  explorationStreak?: number; // Days with activity
  lastActiveDate?: Date;
}

/**
 * Analyze user's journey across sessions
 */
export async function analyzeUserJourney(userId: string): Promise<JourneyInsights | null> {
  const supabase = getServiceRoleClient();
  if (!supabase) return null;

  try {
    // Fetch recent conversation sessions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: sessions, error: sessionsError } = await supabase
      .from('conversation_sessions')
      .select('id, context, created_at, last_activity, messages')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (sessionsError || !sessions) {
      console.error('Error fetching sessions:', sessionsError);
      return null;
    }

    // Fetch conversation messages for search counting
    const { data: messages, error: messagesError } = await supabase
      .from('conversation_messages')
      .select('role, intent_data')
      .in('session_id', sessions.map(s => s.id))
      .eq('role', 'user');

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
    }

    // Analyze patterns
    const citiesSet = new Set<string>();
    const categoriesSet = new Set<string>();
    const moods: string[] = [];
    const budgets: string[] = [];

    // Extract insights from contexts
    sessions.forEach(session => {
      const context = session.context as any;
      if (context) {
        if (context.city) citiesSet.add(context.city);
        if (context.category) categoriesSet.add(context.category);
        if (context.mood) moods.push(context.mood);
        if (context.price_level) budgets.push(context.price_level);
      }
    });

    // Extract insights from intent data
    if (messages) {
      messages.forEach(msg => {
        if (msg.intent_data) {
          const intent = msg.intent_data as any;
          if (intent.city) citiesSet.add(intent.city);
          if (intent.category) categoriesSet.add(intent.category);
          if (intent.mood) moods.push(intent.mood);
          if (intent.priceLevel) budgets.push(intent.priceLevel);
        }
      });
    }

    // Calculate dominant mood and budget
    const dominantMood = getMostFrequent(moods);
    const dominantBudget = getMostFrequent(budgets);

    // Detect recent pattern
    const recentPattern = detectRecentPattern(sessions, citiesSet, categoriesSet);

    // Calculate exploration streak
    const explorationStreak = calculateStreak(sessions);

    return {
      totalSessions: sessions.length,
      totalSearches: messages?.length || 0,
      citiesExplored: Array.from(citiesSet),
      categoriesExplored: Array.from(categoriesSet),
      dominantMood,
      dominantBudget,
      recentPattern,
      explorationStreak,
      lastActiveDate: sessions[0] ? new Date(sessions[0].last_activity) : undefined,
    };
  } catch (error) {
    console.error('Error analyzing user journey:', error);
    return null;
  }
}

/**
 * Get most frequent item in array
 */
function getMostFrequent(items: string[]): string | undefined {
  if (items.length === 0) return undefined;

  const frequency: Record<string, number> = {};
  items.forEach(item => {
    frequency[item] = (frequency[item] || 0) + 1;
  });

  let maxCount = 0;
  let mostFrequent: string | undefined;
  Object.entries(frequency).forEach(([item, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostFrequent = item;
    }
  });

  return mostFrequent;
}

/**
 * Detect recent exploration pattern
 */
function detectRecentPattern(
  sessions: any[],
  cities: Set<string>,
  categories: Set<string>
): string | undefined {
  if (sessions.length === 0) return undefined;

  // Look at last 3 sessions
  const recentSessions = sessions.slice(0, 3);
  const recentCities = new Set<string>();
  const recentCategories = new Set<string>();

  recentSessions.forEach(session => {
    const context = session.context as any;
    if (context?.city) recentCities.add(context.city);
    if (context?.category) recentCategories.add(context.category);
  });

  // Single city focus
  if (recentCities.size === 1) {
    const city = Array.from(recentCities)[0];
    return `exploring-${city}`;
  }

  // Category focus
  if (recentCategories.size === 1 && sessions.length >= 2) {
    const category = Array.from(recentCategories)[0];
    return `${category.toLowerCase()}-hunting`;
  }

  // Multiple cities
  if (recentCities.size >= 2) {
    return 'city-hopping';
  }

  return undefined;
}

/**
 * Calculate consecutive days with activity
 */
function calculateStreak(sessions: any[]): number {
  if (sessions.length === 0) return 0;

  const dates = sessions
    .map(s => new Date(s.last_activity))
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if last activity was today or yesterday
  const lastDate = new Date(dates[0]);
  lastDate.setHours(0, 0, 0, 0);
  const daysSinceLastActivity = Math.floor(
    (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceLastActivity > 1) return 0; // Streak broken

  // Count consecutive days
  for (let i = 1; i < dates.length; i++) {
    const currentDate = new Date(dates[i]);
    currentDate.setHours(0, 0, 0, 0);
    const prevDate = new Date(dates[i - 1]);
    prevDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor(
      (prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff === 1) {
      streak++;
    } else if (daysDiff > 1) {
      break; // Gap in streak
    }
  }

  return streak;
}

/**
 * Get greeting message based on journey insights
 */
export function getJourneyGreetingMessage(journey: JourneyInsights): string | null {
  // Exploration streak
  if (journey.explorationStreak && journey.explorationStreak >= 3) {
    return `${journey.explorationStreak} days exploring! You're on a roll 🔥`;
  }

  // Recent pattern
  if (journey.recentPattern) {
    if (journey.recentPattern.startsWith('exploring-')) {
      const city = journey.recentPattern.split('-')[1];
      return `Deep diving into ${city}? What else can I find for you?`;
    }
    if (journey.recentPattern.endsWith('-hunting')) {
      const category = journey.recentPattern.split('-')[0];
      return `On a ${category} adventure! Want to expand to other cities?`;
    }
    if (journey.recentPattern === 'city-hopping') {
      return `Planning a multi-city trip? I can help compare!`;
    }
  }

  // Multiple cities explored
  if (journey.citiesExplored.length >= 3) {
    return `${journey.citiesExplored.length} cities explored! Where to next?`;
  }

  // Dominant mood
  if (journey.dominantMood && journey.totalSearches >= 3) {
    const moodMessages: Record<string, string> = {
      'romantic': 'Still looking for romantic spots? I have more!',
      'cozy': 'Cozy vibes again? Let me find more hideaways',
      'buzzy': 'Love the energy! More buzzy spots coming up',
      'quiet': 'Peaceful spots are your thing. More serene locations?',
    };
    return moodMessages[journey.dominantMood.toLowerCase()];
  }

  return null;
}
