import { supabase } from '@/lib/supabase';
import { Achievement, UserAchievement, AchievementProgress } from '@/types/achievement';
import { cityCountryMap } from '@/data/cityCountryMap';

/**
 * Check and award achievements for a user
 * This should be called after user actions like visiting a place or saving a destination
 */
export async function checkAndAwardAchievements(userId: string): Promise<UserAchievement[]> {
  try {
    const { data, error } = await (supabase.rpc as any)('check_user_achievements', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error checking achievements:', error);
      return [];
    }

    // Fetch full achievement details for newly unlocked achievements
    if (data && data.length > 0) {
      const achievementIds = data.map((d: any) => d.achievement_id);
      const { data: achievements } = await supabase
        .from('achievements')
        .select('*')
        .in('id', achievementIds);

      return data.map((unlocked: any) => ({
        id: unlocked.id || '',
        user_id: userId,
        achievement_id: unlocked.achievement_id,
        unlocked_at: unlocked.unlocked_at,
        progress: unlocked.progress,
        achievement: achievements?.find((a: any) => a.id === unlocked.achievement_id),
      }));
    }

    return [];
  } catch (error) {
    console.error('Error in checkAndAwardAchievements:', error);
    return [];
  }
}

/**
 * Get all achievements with user's progress
 */
export async function getUserAchievementsWithProgress(userId: string): Promise<AchievementProgress[]> {
  try {
    // Get all achievements
    const { data: allAchievements, error: achievementsError } = await supabase
      .from('achievements')
      .select('*')
      .order('requirement_value', { ascending: true });

    if (achievementsError) {
      console.error('Error fetching achievements:', achievementsError);
      return [];
    }

    // Get user's unlocked achievements
    const { data: userAchievements, error: userError } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId);

    if (userError) {
      console.error('Error fetching user achievements:', userError);
      return [];
    }

    // Get user stats
    const stats = await getUserStats(userId);

    // Combine achievements with progress
    return ((allAchievements || []) as any[]).map((achievement: any) => {
      const unlocked = (userAchievements as any[])?.find((ua: any) => ua.achievement_id === achievement.id);
      const currentProgress = getCurrentProgressForAchievement(achievement, stats);
      const progressPercentage = Math.min(
        (currentProgress / achievement.requirement_value) * 100,
        100
      );

      return {
        achievement,
        unlocked: !!unlocked,
        current_progress: currentProgress,
        progress_percentage: progressPercentage,
        unlocked_at: unlocked?.unlocked_at,
      };
    });
  } catch (error) {
    console.error('Error in getUserAchievementsWithProgress:', error);
    return [];
  }
}

/**
 * Get user statistics for achievement checking
 */
async function getUserStats(userId: string) {
  try {
    // Get visited places slugs
    const { data: visitedPlaces } = await supabase
      .from('visited_places')
      .select('destination_slug')
      .eq('user_id', userId);

    // Get destination details for visited places
    const visitedSlugs = ((visitedPlaces || []) as any[]).map((vp: any) => vp.destination_slug).filter(Boolean);
    let destinations: any[] = [];
    if (visitedSlugs.length > 0) {
      const { data: destData } = await supabase
        .from('destinations')
        .select('country, city, michelin_stars')
        .in('slug', visitedSlugs);
      destinations = destData || [];
    }

    // Get saved destinations count
    const { count: savedCount } = await supabase
      .from('saved_places')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Map cities to countries using cityCountryMap
    const countries = new Set(
      destinations
        .map((d: any) => {
          const city = d.city?.toLowerCase();
          return city ? cityCountryMap[city] : null;
        })
        .filter((country): country is string => Boolean(country && country !== 'Other'))
    );
    const cities = new Set(destinations.map((d: any) => d.city).filter(Boolean));
    const michelinRestaurants = destinations.filter((d: any) => d.michelin_stars > 0);

    return {
      countries_visited: countries.size,
      cities_visited: cities.size,
      destinations_visited: visitedPlaces?.length || 0,
      michelin_restaurants: michelinRestaurants.length,
      destinations_saved: savedCount || 0,
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    return {
      countries_visited: 0,
      cities_visited: 0,
      destinations_visited: 0,
      michelin_restaurants: 0,
      destinations_saved: 0,
    };
  }
}

/**
 * Get current progress value for a specific achievement
 */
function getCurrentProgressForAchievement(
  achievement: Achievement,
  stats: {
    countries_visited: number;
    cities_visited: number;
    destinations_visited: number;
    michelin_restaurants: number;
    destinations_saved: number;
  }
): number {
  switch (achievement.requirement_type) {
    case 'countries_visited':
      return stats.countries_visited;
    case 'cities_visited':
      return stats.cities_visited;
    case 'destinations_visited':
      return stats.destinations_visited;
    case 'michelin_restaurants':
      return stats.michelin_restaurants;
    case 'destinations_saved':
      return stats.destinations_saved;
    default:
      return 0;
  }
}

/**
 * Get user's unlocked achievements
 */
export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievement:achievements(*)
      `)
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) {
      console.error('Error fetching user achievements:', error);
      return [];
    }

    return (data || []).map((ua: any) => ({
      ...ua,
      achievement: ua.achievement,
    }));
  } catch (error) {
    console.error('Error in getUserAchievements:', error);
    return [];
  }
}

