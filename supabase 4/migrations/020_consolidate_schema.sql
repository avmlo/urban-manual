-- Migration 020: Consolidate to saved_places/visited_places
-- This is the source of truth going forward

BEGIN;

-- ============================================================================
-- SAVED PLACES - Standardized Schema
-- ============================================================================

-- Check if table exists and needs schema update
DO $$

DECLARE
  table_exists BOOLEAN;
  has_destination_id BOOLEAN;
  has_saved_at BOOLEAN;
  has_created_at BOOLEAN;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'saved_places'
  ) INTO table_exists;

  IF table_exists THEN
    -- Check if destination_id column exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'saved_places' AND column_name = 'destination_id'
    ) INTO has_destination_id;

    -- Check if saved_at column exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'saved_places' AND column_name = 'saved_at'
    ) INTO has_saved_at;

    -- Check if created_at column exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'saved_places' AND column_name = 'created_at'
    ) INTO has_created_at;

    IF NOT has_destination_id THEN
      -- Add missing columns
      ALTER TABLE saved_places 
        ADD COLUMN IF NOT EXISTS destination_id INTEGER,
        ADD COLUMN IF NOT EXISTS notes TEXT,
        ADD COLUMN IF NOT EXISTS tags TEXT[];
      
      -- Handle saved_at column
      IF NOT has_saved_at THEN
        -- If saved_at doesn't exist, check for created_at
        IF has_created_at THEN
          -- Rename created_at to saved_at
          ALTER TABLE saved_places RENAME COLUMN created_at TO saved_at;
        ELSE
          -- Neither exists, add saved_at
          ALTER TABLE saved_places ADD COLUMN saved_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
      END IF;
    END IF;
  ELSE
    -- Create table with full schema
    CREATE TABLE saved_places (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      destination_slug TEXT NOT NULL,
      destination_id INTEGER,
      saved_at TIMESTAMPTZ DEFAULT NOW(),
      notes TEXT,
      tags TEXT[],
      CONSTRAINT saved_places_user_dest_unique UNIQUE(user_id, destination_slug)
    );
  END IF;
END $$;

-- Migrate from saved_destinations if it exists
DO $$

DECLARE
  has_dest_id_col BOOLEAN;
  has_slug_col BOOLEAN;
  has_saved_at_col BOOLEAN;
  has_created_at_col BOOLEAN;
  has_notes_col BOOLEAN;
  sql_query TEXT;
  time_col TEXT;
  notes_select TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_destinations') THEN
    RAISE NOTICE 'Migrating data from saved_destinations...';
    
    -- Check what columns saved_destinations has
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'saved_destinations' AND column_name = 'destination_id'
    ) INTO has_dest_id_col;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'saved_destinations' AND column_name = 'destination_slug'
    ) INTO has_slug_col;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'saved_destinations' AND column_name = 'saved_at'
    ) INTO has_saved_at_col;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'saved_destinations' AND column_name = 'created_at'
    ) INTO has_created_at_col;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'saved_destinations' AND column_name = 'notes'
    ) INTO has_notes_col;
    
    IF has_dest_id_col THEN
      -- Schema with destination_id (from personalization system)
      IF has_saved_at_col THEN
        INSERT INTO saved_places (user_id, destination_slug, destination_id, saved_at, notes, tags)
        SELECT 
          sd.user_id,
          COALESCE(d.slug, sd.destination_slug::TEXT),
          sd.destination_id,
          COALESCE(sd.saved_at, NOW()),
          CASE WHEN has_notes_col THEN sd.notes ELSE NULL END,
          ARRAY[]::TEXT[]
        FROM saved_destinations sd
        LEFT JOIN destinations d ON d.id = sd.destination_id
        WHERE NOT EXISTS (
          SELECT 1 FROM saved_places sp 
          WHERE sp.user_id = sd.user_id 
            AND sp.destination_slug = COALESCE(d.slug, sd.destination_slug::TEXT)
        )
        ON CONFLICT (user_id, destination_slug) DO UPDATE SET
          destination_id = COALESCE(EXCLUDED.destination_id, saved_places.destination_id),
          saved_at = LEAST(saved_places.saved_at, EXCLUDED.saved_at),
          notes = COALESCE(EXCLUDED.notes, saved_places.notes),
          tags = COALESCE(EXCLUDED.tags, saved_places.tags);
      ELSIF has_created_at_col THEN
        INSERT INTO saved_places (user_id, destination_slug, destination_id, saved_at, notes, tags)
        SELECT 
          sd.user_id,
          COALESCE(d.slug, sd.destination_slug::TEXT),
          sd.destination_id,
          COALESCE(sd.created_at, NOW()),
          CASE WHEN has_notes_col THEN sd.notes ELSE NULL END,
          ARRAY[]::TEXT[]
        FROM saved_destinations sd
        LEFT JOIN destinations d ON d.id = sd.destination_id
        WHERE NOT EXISTS (
          SELECT 1 FROM saved_places sp 
          WHERE sp.user_id = sd.user_id 
            AND sp.destination_slug = COALESCE(d.slug, sd.destination_slug::TEXT)
        )
        ON CONFLICT (user_id, destination_slug) DO UPDATE SET
          destination_id = COALESCE(EXCLUDED.destination_id, saved_places.destination_id),
          saved_at = LEAST(saved_places.saved_at, EXCLUDED.saved_at),
          notes = COALESCE(EXCLUDED.notes, saved_places.notes),
          tags = COALESCE(EXCLUDED.tags, saved_places.tags);
      ELSE
        INSERT INTO saved_places (user_id, destination_slug, destination_id, saved_at, notes, tags)
        SELECT 
          sd.user_id,
          COALESCE(d.slug, sd.destination_slug::TEXT),
          sd.destination_id,
          NOW(),
          CASE WHEN has_notes_col THEN sd.notes ELSE NULL END,
          ARRAY[]::TEXT[]
        FROM saved_destinations sd
        LEFT JOIN destinations d ON d.id = sd.destination_id
        WHERE NOT EXISTS (
          SELECT 1 FROM saved_places sp 
          WHERE sp.user_id = sd.user_id 
            AND sp.destination_slug = COALESCE(d.slug, sd.destination_slug::TEXT)
        )
        ON CONFLICT (user_id, destination_slug) DO UPDATE SET
          destination_id = COALESCE(EXCLUDED.destination_id, saved_places.destination_id),
          saved_at = LEAST(saved_places.saved_at, EXCLUDED.saved_at),
          notes = COALESCE(EXCLUDED.notes, saved_places.notes),
          tags = COALESCE(EXCLUDED.tags, saved_places.tags);
      END IF;
    ELSIF has_slug_col THEN
      -- Schema with destination_slug only (from SETUP_SAVED_VISITED)
      -- Use dynamic SQL to avoid column reference errors
      -- Determine which timestamp column to use
      IF has_saved_at_col THEN
        time_col := 'sd.saved_at';
      ELSIF has_created_at_col THEN
        time_col := 'sd.created_at';
      ELSE
        time_col := 'NOW()';
      END IF;
      
      -- Determine notes selection
      IF has_notes_col THEN
        notes_select := 'sd.notes';
      ELSE
        notes_select := 'NULL';
      END IF;
      
      -- Build and execute dynamic SQL
      sql_query := format('
        INSERT INTO saved_places (user_id, destination_slug, destination_id, saved_at, notes, tags)
        SELECT 
          sd.user_id,
          sd.destination_slug,
          d.id,
          COALESCE(%s, NOW()),
          %s,
          ARRAY[]::TEXT[]
        FROM saved_destinations sd
        LEFT JOIN destinations d ON d.slug = sd.destination_slug
        WHERE NOT EXISTS (
          SELECT 1 FROM saved_places sp 
          WHERE sp.user_id = sd.user_id 
            AND sp.destination_slug = sd.destination_slug
        )
        ON CONFLICT (user_id, destination_slug) DO UPDATE SET
          destination_id = COALESCE(EXCLUDED.destination_id, saved_places.destination_id),
          saved_at = LEAST(saved_places.saved_at, EXCLUDED.saved_at),
          notes = COALESCE(EXCLUDED.notes, saved_places.notes),
          tags = COALESCE(EXCLUDED.tags, saved_places.tags)
      ', time_col, notes_select);
      
      EXECUTE sql_query;
    ELSE
      RAISE NOTICE 'saved_destinations table exists but has unknown schema';
    END IF;
    
    RAISE NOTICE 'Migrated % rows from saved_destinations',
      (SELECT COUNT(*) FROM saved_destinations);
  END IF;
END $$;

-- Populate destination_id from slug if missing
UPDATE saved_places sp
SET destination_id = d.id
FROM destinations d
WHERE sp.destination_slug = d.slug
  AND sp.destination_id IS NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_saved_places_user_id 
  ON saved_places(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_places_destination_slug 
  ON saved_places(destination_slug);
CREATE INDEX IF NOT EXISTS idx_saved_places_destination_id 
  ON saved_places(destination_id);
CREATE INDEX IF NOT EXISTS idx_saved_places_saved_at 
  ON saved_places(saved_at DESC);

-- Add foreign key to destinations (only if destination_id is populated)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM saved_places 
    WHERE destination_id IS NOT NULL 
    LIMIT 1
  ) THEN
    ALTER TABLE saved_places
      DROP CONSTRAINT IF EXISTS fk_saved_places_destination;
    ALTER TABLE saved_places
      ADD CONSTRAINT fk_saved_places_destination 
      FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE saved_places ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own saved places" ON saved_places;
DROP POLICY IF EXISTS "Users can save places" ON saved_places;
DROP POLICY IF EXISTS "Users can delete own saved places" ON saved_places;
DROP POLICY IF EXISTS "Users can update own saved places" ON saved_places;
DROP POLICY IF EXISTS "Users can view their own saved places" ON saved_places;
DROP POLICY IF EXISTS "Users can save places" ON saved_places;
DROP POLICY IF EXISTS "Users can delete their saved places" ON saved_places;

-- Create RLS policies
CREATE POLICY "Users can view own saved places"
  ON saved_places FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save places"
  ON saved_places FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved places"
  ON saved_places FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own saved places"
  ON saved_places FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- VISITED PLACES - Standardized Schema
-- ============================================================================

-- Check if table exists and needs schema update
DO $$

DECLARE
  table_exists BOOLEAN;
  has_destination_id BOOLEAN;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'visited_places'
  ) INTO table_exists;

  IF table_exists THEN
    -- Check if destination_id column exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'visited_places' AND column_name = 'destination_id'
    ) INTO has_destination_id;

    IF NOT has_destination_id THEN
      -- Add missing columns
      ALTER TABLE visited_places 
        ADD COLUMN IF NOT EXISTS destination_id INTEGER,
        ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        ADD COLUMN IF NOT EXISTS notes TEXT;
    END IF;
  ELSE
    -- Create table with full schema
    CREATE TABLE visited_places (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      destination_slug TEXT NOT NULL,
      destination_id INTEGER,
      visited_at TIMESTAMPTZ DEFAULT NOW(),
      rating INTEGER CHECK (rating >= 1 AND rating <= 5),
      notes TEXT,
      CONSTRAINT visited_places_user_dest_unique UNIQUE(user_id, destination_slug)
    );
  END IF;
END $$;

-- Migrate from visited_destinations if it exists
DO $$

DECLARE
  has_dest_id_col BOOLEAN;
  has_slug_col BOOLEAN;
  has_rating_col BOOLEAN;
  has_notes_col BOOLEAN;
  sql_query TEXT;
  rating_select TEXT;
  notes_select TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visited_destinations') THEN
    RAISE NOTICE 'Migrating data from visited_destinations...';
    
    -- Check what columns visited_destinations has
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'visited_destinations' AND column_name = 'destination_id'
    ) INTO has_dest_id_col;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'visited_destinations' AND column_name = 'destination_slug'
    ) INTO has_slug_col;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'visited_destinations' AND column_name = 'rating'
    ) INTO has_rating_col;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'visited_destinations' AND column_name = 'notes'
    ) INTO has_notes_col;
    
    -- Determine rating and notes selection
    IF has_rating_col THEN
      rating_select := 'vd.rating';
    ELSE
      rating_select := 'NULL';
    END IF;
    
    IF has_notes_col THEN
      notes_select := 'vd.notes';
    ELSE
      notes_select := 'NULL';
    END IF;
    
    IF has_dest_id_col THEN
      -- Schema with destination_id
      sql_query := format('
        INSERT INTO visited_places (user_id, destination_slug, destination_id, visited_at, rating, notes)
        SELECT 
          vd.user_id,
          COALESCE(d.slug, vd.destination_slug::TEXT),
          vd.destination_id,
          COALESCE(vd.visited_at, NOW()),
          %s,
          %s
        FROM visited_destinations vd
        LEFT JOIN destinations d ON d.id = vd.destination_id
        WHERE NOT EXISTS (
          SELECT 1 FROM visited_places vp 
          WHERE vp.user_id = vd.user_id 
            AND vp.destination_slug = COALESCE(d.slug, vd.destination_slug::TEXT)
        )
        ON CONFLICT (user_id, destination_slug) DO UPDATE SET
          destination_id = COALESCE(EXCLUDED.destination_id, visited_places.destination_id),
          visited_at = LEAST(visited_places.visited_at, EXCLUDED.visited_at),
          rating = COALESCE(EXCLUDED.rating, visited_places.rating),
          notes = COALESCE(EXCLUDED.notes, visited_places.notes)
      ', rating_select, notes_select);
      
      EXECUTE sql_query;
    ELSIF has_slug_col THEN
      -- Schema with destination_slug only
      sql_query := format('
        INSERT INTO visited_places (user_id, destination_slug, destination_id, visited_at, rating, notes)
        SELECT 
          vd.user_id,
          vd.destination_slug,
          d.id,
          COALESCE(vd.visited_at, NOW()),
          %s,
          %s
        FROM visited_destinations vd
        LEFT JOIN destinations d ON d.slug = vd.destination_slug
        WHERE NOT EXISTS (
          SELECT 1 FROM visited_places vp 
          WHERE vp.user_id = vd.user_id 
            AND vp.destination_slug = vd.destination_slug
        )
        ON CONFLICT (user_id, destination_slug) DO UPDATE SET
          destination_id = COALESCE(EXCLUDED.destination_id, visited_places.destination_id),
          visited_at = LEAST(visited_places.visited_at, EXCLUDED.visited_at),
          rating = COALESCE(EXCLUDED.rating, visited_places.rating),
          notes = COALESCE(EXCLUDED.notes, visited_places.notes)
      ', rating_select, notes_select);
      
      EXECUTE sql_query;
    ELSE
      RAISE NOTICE 'visited_destinations table exists but has unknown schema';
    END IF;
    
    RAISE NOTICE 'Migrated % rows from visited_destinations',
      (SELECT COUNT(*) FROM visited_destinations);
  END IF;
END $$;

-- Populate destination_id from slug if missing
UPDATE visited_places vp
SET destination_id = d.id
FROM destinations d
WHERE vp.destination_slug = d.slug
  AND vp.destination_id IS NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_visited_places_user_id 
  ON visited_places(user_id);
CREATE INDEX IF NOT EXISTS idx_visited_places_destination_slug 
  ON visited_places(destination_slug);
CREATE INDEX IF NOT EXISTS idx_visited_places_destination_id 
  ON visited_places(destination_id);
CREATE INDEX IF NOT EXISTS idx_visited_places_visited_at 
  ON visited_places(visited_at DESC);

-- Add foreign key to destinations (only if destination_id is populated)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM visited_places 
    WHERE destination_id IS NOT NULL 
    LIMIT 1
  ) THEN
    ALTER TABLE visited_places
      DROP CONSTRAINT IF EXISTS fk_visited_places_destination;
    ALTER TABLE visited_places
      ADD CONSTRAINT fk_visited_places_destination
      FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE visited_places ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own visited places" ON visited_places;
DROP POLICY IF EXISTS "Users can add visited places" ON visited_places;
DROP POLICY IF EXISTS "Users can delete own visited places" ON visited_places;
DROP POLICY IF EXISTS "Users can update own visited places" ON visited_places;
DROP POLICY IF EXISTS "Users can view their own visited places" ON visited_places;
DROP POLICY IF EXISTS "Users can mark places as visited" ON visited_places;

-- Create RLS policies
CREATE POLICY "Users can view own visited places"
  ON visited_places FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add visited places"
  ON visited_places FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own visited places"
  ON visited_places FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own visited places"
  ON visited_places FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$

DECLARE
  saved_count INTEGER;
  visited_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO saved_count FROM saved_places;
  SELECT COUNT(*) INTO visited_count FROM visited_places;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== MIGRATION COMPLETE ===';
  RAISE NOTICE 'saved_places rows: %', saved_count;
  RAISE NOTICE 'visited_places rows: %', visited_count;
  RAISE NOTICE '========================';

END $$;

COMMIT;

