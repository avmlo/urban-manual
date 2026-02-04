-- ============================================
-- ADD MISSING COLUMNS TO EXISTING DESTINATIONS TABLE
-- ============================================
-- This script adds the missing columns to your existing destinations table
-- Run this first, then run the search and location script
-- ============================================

-- Add missing columns if they don't exist
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS subline TEXT;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION DEFAULT 0;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS long DOUBLE PRECISION DEFAULT 0;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS main_image TEXT;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS michelin_stars INTEGER DEFAULT 0;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS crown BOOLEAN DEFAULT FALSE;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_destinations_city ON destinations(city);
CREATE INDEX IF NOT EXISTS idx_destinations_category ON destinations(category);
CREATE INDEX IF NOT EXISTS idx_destinations_michelin ON destinations(michelin_stars) WHERE michelin_stars > 0;
CREATE INDEX IF NOT EXISTS idx_destinations_crown ON destinations(crown) WHERE crown = TRUE;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Columns added successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Run supabase_search_and_location_FIXED.sql';
END $$;

