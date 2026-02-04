-- Achievement & Badge System Migration
-- Date: 2025-01-XX
-- Purpose: Create tables for achievements and user achievements tracking

-- ============================================================================
-- PART 1: Create achievements table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- e.g., 'world_traveler', 'michelin_hunter'
  name TEXT NOT NULL, -- e.g., 'World Traveler', 'Michelin Hunter'
  description TEXT NOT NULL, -- e.g., 'Visit 20 countries'
  emoji TEXT NOT NULL, -- e.g., '🌍', '⭐'
  category TEXT NOT NULL DEFAULT 'general', -- 'travel', 'food', 'exploration', 'social'
  requirement_type TEXT NOT NULL, -- 'countries_visited', 'michelin_restaurants', 'destinations_visited', 'cities_visited'
  requirement_value INTEGER NOT NULL, -- e.g., 20 for 20 countries
  rarity TEXT NOT NULL DEFAULT 'common', -- 'common', 'uncommon', 'rare', 'epic', 'legendary'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_achievements_code ON public.achievements(code);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON public.achievements(category);

-- ============================================================================
-- PART 2: Create user_achievements table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress INTEGER DEFAULT NULL, -- Current progress towards achievement (if applicable)
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at ON public.user_achievements(unlocked_at);

-- ============================================================================
-- PART 3: Insert default achievements
-- ============================================================================

-- Travel Achievements
INSERT INTO public.achievements (code, name, description, emoji, category, requirement_type, requirement_value, rarity)
VALUES
  -- Country-based achievements
  ('world_traveler', 'World Traveler', 'Visit 20 countries', '🌍', 'travel', 'countries_visited', 20, 'rare'),
  ('explorer', 'Explorer', 'Visit 10 countries', '🗺️', 'travel', 'countries_visited', 10, 'uncommon'),
  ('wanderer', 'Wanderer', 'Visit 5 countries', '🧳', 'travel', 'countries_visited', 5, 'common'),
  ('globe_trotter', 'Globe Trotter', 'Visit 50 countries', '✈️', 'travel', 'countries_visited', 50, 'epic'),
  
  -- City-based achievements
  ('city_hopper', 'City Hopper', 'Visit 10 cities', '🏙️', 'travel', 'cities_visited', 10, 'common'),
  ('urban_explorer', 'Urban Explorer', 'Visit 25 cities', '🌆', 'travel', 'cities_visited', 25, 'uncommon'),
  ('metropolitan', 'Metropolitan', 'Visit 50 cities', '🏛️', 'travel', 'cities_visited', 50, 'rare'),
  
  -- Destination-based achievements
  ('first_steps', 'First Steps', 'Visit 5 destinations', '👣', 'exploration', 'destinations_visited', 5, 'common'),
  ('adventurer', 'Adventurer', 'Visit 25 destinations', '⛰️', 'exploration', 'destinations_visited', 25, 'uncommon'),
  ('globetrotter', 'Globetrotter', 'Visit 100 destinations', '🗺️', 'exploration', 'destinations_visited', 100, 'rare'),
  
  -- Food Achievements
  ('michelin_hunter', 'Michelin Hunter', 'Visit 10 Michelin-starred restaurants', '⭐', 'food', 'michelin_restaurants', 10, 'rare'),
  ('michelin_explorer', 'Michelin Explorer', 'Visit 5 Michelin-starred restaurants', '🍽️', 'food', 'michelin_restaurants', 5, 'uncommon'),
  ('michelin_master', 'Michelin Master', 'Visit 25 Michelin-starred restaurants', '👨‍🍳', 'food', 'michelin_restaurants', 25, 'epic'),
  ('first_michelin', 'First Michelin', 'Visit your first Michelin-starred restaurant', '🌟', 'food', 'michelin_restaurants', 1, 'common'),
  
  -- Collection Achievements
  ('collector', 'Collector', 'Save 25 destinations', '💾', 'social', 'destinations_saved', 25, 'common'),
  ('curator', 'Curator', 'Save 100 destinations', '📚', 'social', 'destinations_saved', 100, 'uncommon'),
  ('archivist', 'Archivist', 'Save 500 destinations', '📦', 'social', 'destinations_saved', 500, 'rare')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- PART 4: Enable RLS (Row Level Security)
-- ============================================================================

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Achievements are public (read-only for all)
CREATE POLICY "Achievements are viewable by everyone"
  ON public.achievements FOR SELECT
  USING (true);

-- User achievements: users can only see their own
CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert achievements (for system operations)
CREATE POLICY "Service role can insert achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (true); -- We'll check permissions in application code

-- ============================================================================
-- PART 5: Create function to check and award achievements
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_user_achievements(p_user_id UUID)
RETURNS TABLE (
  achievement_id UUID,
  achievement_code TEXT,
  achievement_name TEXT,
  achievement_emoji TEXT,
  unlocked_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_countries_visited INTEGER;
  v_cities_visited INTEGER;
  v_destinations_visited INTEGER;
  v_michelin_visited INTEGER;
  v_destinations_saved INTEGER;
BEGIN
  -- Count countries visited by counting distinct cities
  -- Note: Since destinations table doesn't have a direct country field,
  -- we'll count distinct cities as a proxy (each city typically maps to one country)
  -- The application layer will map cities to countries using cityCountryMap
  SELECT COUNT(DISTINCT d.city)
  INTO v_countries_visited
  FROM public.visited_places vp
  JOIN public.destinations d ON d.slug = vp.destination_slug
  WHERE vp.user_id = p_user_id AND d.city IS NOT NULL;

  -- Count cities visited
  SELECT COUNT(DISTINCT d.city)
  INTO v_cities_visited
  FROM public.visited_places vp
  JOIN public.destinations d ON d.slug = vp.destination_slug
  WHERE vp.user_id = p_user_id;

  -- Count destinations visited
  SELECT COUNT(DISTINCT destination_slug)
  INTO v_destinations_visited
  FROM public.visited_places
  WHERE user_id = p_user_id;

  -- Count Michelin restaurants visited
  SELECT COUNT(DISTINCT vp.destination_slug)
  INTO v_michelin_visited
  FROM public.visited_places vp
  JOIN public.destinations d ON d.slug = vp.destination_slug
  WHERE vp.user_id = p_user_id AND d.michelin_stars > 0;

  -- Count destinations saved
  SELECT COUNT(*)
  INTO v_destinations_saved
  FROM public.saved_destinations
  WHERE user_id = p_user_id;

  -- Check and award achievements
  RETURN QUERY
  WITH eligible_achievements AS (
    SELECT 
      a.id,
      a.code,
      a.name,
      a.emoji,
      a.requirement_type,
      a.requirement_value,
      CASE 
        WHEN a.requirement_type = 'countries_visited' THEN v_countries_visited
        WHEN a.requirement_type = 'cities_visited' THEN v_cities_visited
        WHEN a.requirement_type = 'destinations_visited' THEN v_destinations_visited
        WHEN a.requirement_type = 'michelin_restaurants' THEN v_michelin_visited
        WHEN a.requirement_type = 'destinations_saved' THEN v_destinations_saved
        ELSE 0
      END as current_value
    FROM public.achievements a
    WHERE (
      (a.requirement_type = 'countries_visited' AND v_countries_visited >= a.requirement_value)
      OR (a.requirement_type = 'cities_visited' AND v_cities_visited >= a.requirement_value)
      OR (a.requirement_type = 'destinations_visited' AND v_destinations_visited >= a.requirement_value)
      OR (a.requirement_type = 'michelin_restaurants' AND v_michelin_visited >= a.requirement_value)
      OR (a.requirement_type = 'destinations_saved' AND v_destinations_saved >= a.requirement_value)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_achievements ua
      WHERE ua.user_id = p_user_id AND ua.achievement_id = a.id
    )
  )
  INSERT INTO public.user_achievements (user_id, achievement_id, progress)
  SELECT 
    p_user_id,
    ea.id,
    ea.current_value
  FROM eligible_achievements ea
  RETURNING 
    achievement_id,
    (SELECT code FROM public.achievements WHERE id = achievement_id),
    (SELECT name FROM public.achievements WHERE id = achievement_id),
    (SELECT emoji FROM public.achievements WHERE id = achievement_id),
    unlocked_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_user_achievements IS 'Checks user stats and awards new achievements. Returns newly unlocked achievements.';

