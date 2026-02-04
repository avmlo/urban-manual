-- Migration: Personalization System
-- Creates tables for AI-powered personalization, collections, and user tracking
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. USER PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  
  -- Preferences
  favorite_cities TEXT[], -- ['Tokyo', 'Paris', 'New York']
  favorite_categories TEXT[], -- ['Hotels', 'Restaurants']
  dietary_preferences TEXT[], -- ['Vegetarian', 'Vegan']
  price_preference INT CHECK (price_preference >= 1 AND price_preference <= 4), -- 1-4 ($ to $$$$)
  
  -- Interests
  interests TEXT[], -- ['Michelin Stars', 'Rooftop Bars', 'Boutique Hotels']
  travel_style TEXT, -- 'Luxury', 'Budget', 'Adventure', 'Relaxation'
  
  -- Settings
  privacy_mode BOOLEAN DEFAULT false,
  allow_tracking BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- ============================================
-- 2. COLLECTIONS (like Pinterest boards)
-- ============================================
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '📍',
  color TEXT DEFAULT '#3B82F6',
  
  -- Privacy
  is_public BOOLEAN DEFAULT false,
  
  -- Metadata
  destination_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);

-- ============================================
-- 3. SAVED DESTINATIONS (redesigned)
-- ============================================
CREATE TABLE IF NOT EXISTS saved_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  destination_id INT REFERENCES destinations(id) ON DELETE CASCADE NOT NULL,
  collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
  
  -- Metadata
  notes TEXT, -- User's personal notes
  visited BOOLEAN DEFAULT false,
  visit_date DATE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  
  -- Timestamps
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, destination_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_destinations_user_id ON saved_destinations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_destinations_destination_id ON saved_destinations(destination_id);
CREATE INDEX IF NOT EXISTS idx_saved_destinations_collection_id ON saved_destinations(collection_id);

-- ============================================
-- 4. VISIT HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS visit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  destination_id INT REFERENCES destinations(id) ON DELETE CASCADE NOT NULL,
  
  -- Visit data
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_seconds INT, -- Time spent on page
  
  -- Context
  source TEXT, -- 'search', 'recommendation', 'category', 'city'
  search_query TEXT, -- If came from search
  
  UNIQUE(user_id, destination_id, visited_at)
);

CREATE INDEX IF NOT EXISTS idx_visit_history_user_id ON visit_history(user_id);
CREATE INDEX IF NOT EXISTS idx_visit_history_destination_id ON visit_history(destination_id);
CREATE INDEX IF NOT EXISTS idx_visit_history_visited_at ON visit_history(visited_at DESC);

-- ============================================
-- 5. USER INTERACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  destination_id INT REFERENCES destinations(id) ON DELETE CASCADE NOT NULL,
  
  -- Interaction types
  interaction_type TEXT NOT NULL, -- 'view', 'save', 'unsave', 'click_website', 'click_maps', 'share'
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_destination_id ON user_interactions(destination_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at ON user_interactions(created_at DESC);

-- ============================================
-- 6. PERSONALIZATION SCORES (AI-generated)
-- ============================================
CREATE TABLE IF NOT EXISTS personalization_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  destination_id INT REFERENCES destinations(id) ON DELETE CASCADE NOT NULL,
  
  -- AI-generated score
  score FLOAT NOT NULL CHECK (score >= 0.0 AND score <= 1.0), -- 0.0 to 1.0
  reason TEXT, -- Why this was recommended
  
  -- Metadata
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
  
  UNIQUE(user_id, destination_id)
);

CREATE INDEX IF NOT EXISTS idx_personalization_scores_user_id ON personalization_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_personalization_scores_destination_id ON personalization_scores(destination_id);
CREATE INDEX IF NOT EXISTS idx_personalization_scores_score ON personalization_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_personalization_scores_expires_at ON personalization_scores(expires_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE personalization_scores ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Saved Destinations Policies
DROP POLICY IF EXISTS "Users can view own saved destinations" ON saved_destinations;
CREATE POLICY "Users can view own saved destinations" ON saved_destinations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own saved destinations" ON saved_destinations;
CREATE POLICY "Users can insert own saved destinations" ON saved_destinations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own saved destinations" ON saved_destinations;
CREATE POLICY "Users can update own saved destinations" ON saved_destinations
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own saved destinations" ON saved_destinations;
CREATE POLICY "Users can delete own saved destinations" ON saved_destinations
  FOR DELETE USING (auth.uid() = user_id);

-- Collections Policies
DROP POLICY IF EXISTS "Users can view own collections" ON collections;
CREATE POLICY "Users can view own collections" ON collections
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own collections" ON collections;
CREATE POLICY "Users can insert own collections" ON collections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own collections" ON collections;
CREATE POLICY "Users can update own collections" ON collections
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own collections" ON collections;
CREATE POLICY "Users can delete own collections" ON collections
  FOR DELETE USING (auth.uid() = user_id);

-- Public collections (optional)
DROP POLICY IF EXISTS "Anyone can view public collections" ON collections;
CREATE POLICY "Anyone can view public collections" ON collections
  FOR SELECT USING (is_public = true);

-- Visit History Policies
DROP POLICY IF EXISTS "Users can view own visit history" ON visit_history;
CREATE POLICY "Users can view own visit history" ON visit_history
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own visit history" ON visit_history;
CREATE POLICY "Users can insert own visit history" ON visit_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Interactions Policies
DROP POLICY IF EXISTS "Users can view own interactions" ON user_interactions;
CREATE POLICY "Users can view own interactions" ON user_interactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own interactions" ON user_interactions;
CREATE POLICY "Users can insert own interactions" ON user_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Personalization Scores Policies
DROP POLICY IF EXISTS "Users can view own scores" ON personalization_scores;
CREATE POLICY "Users can view own scores" ON personalization_scores
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all scores (for AI generation)
DROP POLICY IF EXISTS "Service role can manage all scores" ON personalization_scores;
CREATE POLICY "Service role can manage all scores" ON personalization_scores
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- TRIGGERS
-- ============================================

-- Update destination_count in collections when saved destinations change
CREATE OR REPLACE FUNCTION update_collection_destination_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE collections
    SET destination_count = destination_count + 1,
        updated_at = NOW()
    WHERE id = NEW.collection_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE collections
    SET destination_count = GREATEST(destination_count - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.collection_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.collection_id != OLD.collection_id THEN
      -- Decrement old collection
      UPDATE collections
      SET destination_count = GREATEST(destination_count - 1, 0),
          updated_at = NOW()
      WHERE id = OLD.collection_id;
      -- Increment new collection
      UPDATE collections
      SET destination_count = destination_count + 1,
          updated_at = NOW()
      WHERE id = NEW.collection_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_collection_count ON saved_destinations;
CREATE TRIGGER trigger_update_collection_count
  AFTER INSERT OR UPDATE OR DELETE ON saved_destinations
  FOR EACH ROW EXECUTE FUNCTION update_collection_destination_count();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trigger_update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_collections_updated_at ON collections;
CREATE TRIGGER trigger_update_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION FROM OLD TABLES (Optional)
-- ============================================

-- Migrate data from saved_places to saved_destinations
-- Note: This assumes destinations table has id field that matches slug
INSERT INTO saved_destinations (user_id, destination_id, saved_at)
SELECT 
  sp.user_id,
  d.id,
  sp.created_at
FROM saved_places sp
INNER JOIN destinations d ON d.slug = sp.destination_slug
WHERE NOT EXISTS (
  SELECT 1 FROM saved_destinations sd 
  WHERE sd.user_id = sp.user_id AND sd.destination_id = d.id
)
ON CONFLICT (user_id, destination_id) DO NOTHING;

-- Migrate data from visited_places to visit_history
INSERT INTO visit_history (user_id, destination_id, visited_at)
SELECT 
  vp.user_id,
  d.id,
  vp.visited_at
FROM visited_places vp
INNER JOIN destinations d ON d.slug = vp.destination_slug
WHERE NOT EXISTS (
  SELECT 1 FROM visit_history vh 
  WHERE vh.user_id = vp.user_id 
    AND vh.destination_id = d.id 
    AND vh.visited_at = vp.visited_at
)
ON CONFLICT (user_id, destination_id, visited_at) DO NOTHING;

-- Note: After migration, you can optionally drop old tables:
-- DROP TABLE IF EXISTS saved_places CASCADE;
-- DROP TABLE IF EXISTS visited_places CASCADE;

