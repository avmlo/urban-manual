-- ============================================
-- SETUP SCRIPT FOR SAVE/VISITED FUNCTIONALITY
-- ============================================
-- Run this in your Supabase SQL Editor
-- Dashboard: https://avdnefdfwvpjkuanhdwk.supabase.co

-- 1. Create saved_destinations table
CREATE TABLE IF NOT EXISTS saved_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  destination_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, destination_slug)
);

-- 2. Create visited_destinations table
CREATE TABLE IF NOT EXISTS visited_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  destination_slug TEXT NOT NULL,
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, destination_slug)
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_saved_destinations_user ON saved_destinations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_destinations_slug ON saved_destinations(destination_slug);
CREATE INDEX IF NOT EXISTS idx_visited_destinations_user ON visited_destinations(user_id);
CREATE INDEX IF NOT EXISTS idx_visited_destinations_slug ON visited_destinations(destination_slug);

-- 4. Enable Row Level Security
ALTER TABLE saved_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE visited_destinations ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own saved destinations" ON saved_destinations;
DROP POLICY IF EXISTS "Users can save destinations" ON saved_destinations;
DROP POLICY IF EXISTS "Users can remove saved destinations" ON saved_destinations;
DROP POLICY IF EXISTS "Users can view their own visited destinations" ON visited_destinations;
DROP POLICY IF EXISTS "Users can mark destinations as visited" ON visited_destinations;
DROP POLICY IF EXISTS "Users can update their visited destinations" ON visited_destinations;
DROP POLICY IF EXISTS "Users can remove visited destinations" ON visited_destinations;

-- 6. Create RLS Policies for saved_destinations
CREATE POLICY "Users can view their own saved destinations" ON saved_destinations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save destinations" ON saved_destinations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove saved destinations" ON saved_destinations
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Create RLS Policies for visited_destinations
CREATE POLICY "Users can view their own visited destinations" ON visited_destinations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can mark destinations as visited" ON visited_destinations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their visited destinations" ON visited_destinations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can remove visited destinations" ON visited_destinations
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the tables were created:

-- Check saved_destinations table
SELECT * FROM saved_destinations LIMIT 5;

-- Check visited_destinations table
SELECT * FROM visited_destinations LIMIT 5;

-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('saved_destinations', 'visited_destinations');

