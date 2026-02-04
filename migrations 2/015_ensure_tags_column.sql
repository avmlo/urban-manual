-- Ensure tags column exists for contextual search
-- This migration is idempotent

DO $$ BEGIN
  -- Add tags column if it doesn't exist
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS tags TEXT[];
  
  -- Create GIN index for efficient tag searches
  CREATE INDEX IF NOT EXISTS idx_destinations_tags_gin ON destinations USING GIN(tags);
  
  -- Add comment
  COMMENT ON COLUMN destinations.tags IS 'Array of descriptive tags (e.g., romantic, michelin, fine-dining, vegetarian, cute-cafe) for contextual search filtering';
  
  -- Example: Update a few destinations with tags (optional - for testing)
  -- UPDATE destinations SET tags = ARRAY['romantic', 'fine-dining'] WHERE slug = 'example-slug';
  
END $$;

