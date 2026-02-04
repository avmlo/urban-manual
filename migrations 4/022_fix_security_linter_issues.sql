-- Fix security linter issues
-- Addresses SECURITY DEFINER views and missing RLS on assistant tables

-- ============================================
-- 1. FIX SECURITY DEFINER VIEWS
-- ============================================

-- Recreate enriched_destinations view without SECURITY DEFINER
-- Views should use SECURITY INVOKER (default) to respect user permissions
DROP VIEW IF EXISTS enriched_destinations CASCADE;

CREATE VIEW enriched_destinations AS
SELECT
  slug,
  name,
  city,
  category,
  image,
  content,
  crown,
  michelin_stars,
  place_id,
  rating,
  price_level,
  opening_hours,
  phone_number,
  website,
  google_maps_url,
  tags,
  last_enriched_at,
  CASE
    WHEN last_enriched_at IS NOT NULL THEN true
    ELSE false
  END as is_enriched
FROM destinations;

-- Recreate popular_destinations view without SECURITY DEFINER (if it exists)
-- First check if it exists, then recreate with proper table existence checks
DO $$
DECLARE
  has_saved_destinations BOOLEAN;
  has_visited_destinations BOOLEAN;
  has_reviews BOOLEAN;
BEGIN
  -- Check which tables exist
  has_saved_destinations := EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'saved_destinations'
  );
  has_visited_destinations := EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'visited_destinations'
  );
  has_reviews := EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reviews'
  );

  -- Check if it's a regular view
  IF EXISTS (
    SELECT 1 FROM pg_views 
    WHERE schemaname = 'public' 
    AND viewname = 'popular_destinations'
  ) THEN
    -- Drop the existing view
    DROP VIEW IF EXISTS popular_destinations CASCADE;
    
    -- Recreate as a regular view (SECURITY INVOKER is the default)
    -- Build the view based on which tables exist
    IF has_saved_destinations AND has_visited_destinations AND has_reviews THEN
      -- All tables exist - full view
      CREATE VIEW popular_destinations AS
      SELECT
        d.slug,
        d.name,
        d.city,
        d.category,
        COALESCE(d.image, d.main_image) as image,
        COUNT(DISTINCT sd.user_id) as save_count,
        COUNT(DISTINCT vd.user_id) as visit_count,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(r.id) as review_count
      FROM destinations d
      LEFT JOIN saved_destinations sd ON d.slug = sd.destination_slug
      LEFT JOIN visited_destinations vd ON d.slug = vd.destination_slug
      LEFT JOIN reviews r ON d.slug = r.destination_slug
      GROUP BY d.slug, d.name, d.city, d.category, d.image, d.main_image
      ORDER BY save_count DESC, visit_count DESC;
    ELSIF has_saved_destinations AND has_visited_destinations THEN
      -- No reviews table
      CREATE VIEW popular_destinations AS
      SELECT
        d.slug,
        d.name,
        d.city,
        d.category,
        COALESCE(d.image, d.main_image) as image,
        COUNT(DISTINCT sd.user_id) as save_count,
        COUNT(DISTINCT vd.user_id) as visit_count
      FROM destinations d
      LEFT JOIN saved_destinations sd ON d.slug = sd.destination_slug
      LEFT JOIN visited_destinations vd ON d.slug = vd.destination_slug
      GROUP BY d.slug, d.name, d.city, d.category, d.image, d.main_image
      ORDER BY save_count DESC, visit_count DESC;
    ELSIF has_saved_destinations THEN
      -- Only saved_destinations exists
      CREATE VIEW popular_destinations AS
      SELECT
        d.slug,
        d.name,
        d.city,
        d.category,
        COALESCE(d.image, d.main_image) as image,
        COUNT(DISTINCT sd.user_id) as save_count
      FROM destinations d
      LEFT JOIN saved_destinations sd ON d.slug = sd.destination_slug
      GROUP BY d.slug, d.name, d.city, d.category, d.image, d.main_image
      ORDER BY save_count DESC;
    ELSIF has_visited_destinations THEN
      -- Only visited_destinations exists
      CREATE VIEW popular_destinations AS
      SELECT
        d.slug,
        d.name,
        d.city,
        d.category,
        COALESCE(d.image, d.main_image) as image,
        COUNT(DISTINCT vd.user_id) as visit_count
      FROM destinations d
      LEFT JOIN visited_destinations vd ON d.slug = vd.destination_slug
      GROUP BY d.slug, d.name, d.city, d.category, d.image, d.main_image
      ORDER BY visit_count DESC;
    ELSE
      -- No supporting tables - simple view
      CREATE VIEW popular_destinations AS
      SELECT
        d.slug,
        d.name,
        d.city,
        d.category,
        COALESCE(d.image, d.main_image) as image
      FROM destinations d
      ORDER BY d.name;
    END IF;
  END IF;
END $$;

-- ============================================
-- 2. ENABLE RLS ON ASSISTANT TABLES
-- ============================================

-- Enable RLS on assistant_threads
ALTER TABLE assistant_threads ENABLE ROW LEVEL SECURITY;

-- Enable RLS on assistant_preferences
ALTER TABLE assistant_preferences ENABLE ROW LEVEL SECURITY;

-- Enable RLS on assistant_message_history
ALTER TABLE assistant_message_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. CREATE RLS POLICIES FOR ASSISTANT TABLES
-- ============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own assistant threads" ON assistant_threads;
DROP POLICY IF EXISTS "Users can create their own assistant threads" ON assistant_threads;
DROP POLICY IF EXISTS "Users can update their own assistant threads" ON assistant_threads;
DROP POLICY IF EXISTS "Users can delete their own assistant threads" ON assistant_threads;

DROP POLICY IF EXISTS "Users can view their own assistant preferences" ON assistant_preferences;
DROP POLICY IF EXISTS "Users can create their own assistant preferences" ON assistant_preferences;
DROP POLICY IF EXISTS "Users can update their own assistant preferences" ON assistant_preferences;

DROP POLICY IF EXISTS "Users can view their own assistant message history" ON assistant_message_history;
DROP POLICY IF EXISTS "Users can create their own assistant message history" ON assistant_message_history;
DROP POLICY IF EXISTS "Users can delete their own assistant message history" ON assistant_message_history;

-- Assistant Threads Policies
CREATE POLICY "Users can view their own assistant threads"
  ON assistant_threads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assistant threads"
  ON assistant_threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assistant threads"
  ON assistant_threads FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assistant threads"
  ON assistant_threads FOR DELETE
  USING (auth.uid() = user_id);

-- Assistant Preferences Policies
CREATE POLICY "Users can view their own assistant preferences"
  ON assistant_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assistant preferences"
  ON assistant_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assistant preferences"
  ON assistant_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Assistant Message History Policies
CREATE POLICY "Users can view their own assistant message history"
  ON assistant_message_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assistant message history"
  ON assistant_message_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assistant message history"
  ON assistant_message_history FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. GRANT PERMISSIONS
-- ============================================

-- Grant select on views to authenticated users
GRANT SELECT ON enriched_destinations TO authenticated;
GRANT SELECT ON enriched_destinations TO anon;

-- Grant select on popular_destinations if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views 
    WHERE schemaname = 'public' 
    AND viewname = 'popular_destinations'
  ) THEN
    GRANT SELECT ON popular_destinations TO authenticated;
    GRANT SELECT ON popular_destinations TO anon;
  END IF;
END $$;

