/**
 * Achievement Integration for Greetings
 * Provides achievement-based greeting messages
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

export interface RecentAchievement {
  id: string;
  name: string;
  description: string;
  icon_emoji: string;
  tier: string;
  unlocked_at: string;
}

/**
 * Get recently unlocked achievements (within 7 days)
 */
export async function getRecentAchievements(userId: string): Promise<RecentAchievement[]> {
  const supabase = getServiceRoleClient();
  if (!supabase) return [];

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        id,
        unlocked_at,
        achievement:achievements(
          id,
          name,
          description,
          icon_emoji,
          tier
        )
      `)
      .eq('user_id', userId)
      .gte('unlocked_at', sevenDaysAgo.toISOString())
      .order('unlocked_at', { ascending: false })
      .limit(3);

    if (error || !data) {
      console.error('Error fetching recent achievements:', error);
      return [];
    }

    return data.map((ua: any) => ({
      id: ua.id,
      name: ua.achievement.name,
      description: ua.achievement.description,
      icon_emoji: ua.achievement.icon_emoji,
      tier: ua.achievement.tier,
      unlocked_at: ua.unlocked_at,
    }));
  } catch (error) {
    console.error('Error in getRecentAchievements:', error);
    return [];
  }
}

/**
 * Get achievement progress for next unlockable
 */
export async function getNextAchievementProgress(
  userId: string
): Promise<{ name: string; progress: number; target: number; emoji: string } | null> {
  const supabase = getServiceRoleClient();
  if (!supabase) return null;

  try {
    // Get user stats
    const { data: visitedPlaces } = await supabase
      .from('visited_places')
      .select('destination_slug')
      .eq('user_id', userId);

    const placesVisited = visitedPlaces?.length || 0;

    // Get all achievements
    const { data: achievements } = await supabase
      .from('achievements')
      .select('*')
      .eq('requirement_type', 'destinations_visited')
      .order('requirement_value', { ascending: true });

    if (!achievements || achievements.length === 0) return null;

    // Get unlocked achievements
    const { data: unlockedAchievements } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    const unlockedIds = new Set(unlockedAchievements?.map((ua: any) => ua.achievement_id) || []);

    // Find next achievement to unlock
    const nextAchievement = achievements.find(
      (a: any) => !unlockedIds.has(a.id) && a.requirement_value > placesVisited
    );

    if (!nextAchievement) return null;

    return {
      name: nextAchievement.name,
      progress: placesVisited,
      target: nextAchievement.requirement_value,
      emoji: nextAchievement.icon_emoji,
    };
  } catch (error) {
    console.error('Error in getNextAchievementProgress:', error);
    return null;
  }
}

/**
 * Get greeting message for recent achievement
 */
export function getAchievementGreetingMessage(
  achievements: RecentAchievement[]
): string | null {
  if (achievements.length === 0) return null;

  const latest = achievements[0];
  const hoursAgo = Math.floor(
    (Date.now() - new Date(latest.unlocked_at).getTime()) / (1000 * 60 * 60)
  );

  if (hoursAgo < 1) {
    return `${latest.icon_emoji} Just unlocked: ${latest.name}! Keep exploring!`;
  } else if (hoursAgo < 24) {
    return `${latest.icon_emoji} Congrats on ${latest.name}! What's next?`;
  } else if (hoursAgo < 48) {
    return `${latest.icon_emoji} Still riding that ${latest.name} high? Let's keep going!`;
  }

  return null;
}

/**
 * Get greeting message for achievement progress
 */
export function getProgressGreetingMessage(progress: {
  name: string;
  progress: number;
  target: number;
  emoji: string;
}): string | null {
  const remaining = progress.target - progress.progress;

  // Only show if close to unlocking (within 3 places)
  if (remaining > 3) return null;

  if (remaining === 1) {
    return `${progress.emoji} One more place to unlock ${progress.name}!`;
  } else if (remaining === 2) {
    return `${progress.emoji} Just ${remaining} more to unlock ${progress.name}!`;
  } else if (remaining === 3) {
    return `${progress.emoji} ${remaining} away from ${progress.name}!`;
  }

  return null;
}
