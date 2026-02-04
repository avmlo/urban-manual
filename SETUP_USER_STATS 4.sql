-- ============================================
-- USER STATS & GAMIFICATION SETUP
-- ============================================
-- Run this in your Supabase SQL Editor

-- 1. Create user_stats table
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Check-in stats
  level INTEGER DEFAULT 1,
  points INTEGER DEFAULT 0,
  cities_count INTEGER DEFAULT 0,
  countries_count INTEGER DEFAULT 0,
  places_count INTEGER DEFAULT 0,
  mayorships_count INTEGER DEFAULT 0,
  
  -- Map clearing stats
  world_explored_percentage DECIMAL(10, 8) DEFAULT 0.0,
  miles_explored DECIMAL(10, 2) DEFAULT 0.0,
  
  -- Premium
  is_premium BOOLEAN DEFAULT FALSE,
  premium_expires_at TIMESTAMPTZ,
  
  -- Metadata
  worldwide_rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create check_ins table
CREATE TABLE IF NOT EXISTS check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  destination_slug TEXT NOT NULL,
  
  -- Check-in details
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  
  -- Points earned
  points_earned INTEGER DEFAULT 10,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, destination_slug)
);

-- 3. Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, achievement_type)
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_stats_user ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_rank ON user_stats(worldwide_rank);
CREATE INDEX IF NOT EXISTS idx_check_ins_user ON check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_date ON check_ins(checked_in_at);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_id);

-- 5. Enable Row Level Security
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can update their own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can insert their own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can view their own check-ins" ON check_ins;
DROP POLICY IF EXISTS "Users can create check-ins" ON check_ins;
DROP POLICY IF EXISTS "Users can view their own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can unlock achievements" ON user_achievements;

-- 7. Create RLS Policies for user_stats
CREATE POLICY "Users can view their own stats" ON user_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" ON user_stats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats" ON user_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. Create RLS Policies for check_ins
CREATE POLICY "Users can view their own check-ins" ON check_ins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create check-ins" ON check_ins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. Create RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can unlock achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 10. Create function to update stats timestamp
CREATE OR REPLACE FUNCTION update_user_stats_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger for auto-updating timestamp
DROP TRIGGER IF EXISTS update_user_stats_timestamp_trigger ON user_stats;
CREATE TRIGGER update_user_stats_timestamp_trigger
  BEFORE UPDATE ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_timestamp();

-- 12. Create function to calculate worldwide rank
CREATE OR REPLACE FUNCTION calculate_worldwide_rank()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_stats
  SET worldwide_rank = (
    SELECT COUNT(*) + 1
    FROM user_stats AS us
    WHERE us.points > NEW.points
  )
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Create trigger for auto-calculating rank
DROP TRIGGER IF EXISTS calculate_rank_trigger ON user_stats;
CREATE TRIGGER calculate_rank_trigger
  AFTER INSERT OR UPDATE OF points ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION calculate_worldwide_rank();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check tables
SELECT * FROM user_stats LIMIT 5;
SELECT * FROM check_ins LIMIT 5;
SELECT * FROM user_achievements LIMIT 5;

-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('user_stats', 'check_ins', 'user_achievements');

