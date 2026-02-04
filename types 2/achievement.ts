export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  emoji: string;
  category: 'travel' | 'food' | 'exploration' | 'social' | 'general';
  requirement_type: 'countries_visited' | 'cities_visited' | 'destinations_visited' | 'michelin_restaurants' | 'destinations_saved';
  requirement_value: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  created_at: string;
  updated_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  progress?: number;
  achievement?: Achievement;
}

export interface AchievementProgress {
  achievement: Achievement;
  unlocked: boolean;
  current_progress: number;
  progress_percentage: number;
  unlocked_at?: string;
}

export const RARITY_COLORS: Record<Achievement['rarity'], string> = {
  common: '#9ca3af', // gray
  uncommon: '#10b981', // green
  rare: '#3b82f6', // blue
  epic: '#8b5cf6', // purple
  legendary: '#f59e0b', // amber/gold
};

export const RARITY_BORDERS: Record<Achievement['rarity'], string> = {
  common: 'border-gray-300',
  uncommon: 'border-green-400',
  rare: 'border-blue-400',
  epic: 'border-purple-400',
  legendary: 'border-amber-400',
};

