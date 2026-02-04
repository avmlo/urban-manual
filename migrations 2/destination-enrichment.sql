-- Destination Enrichment Migration
-- Adds Google Places API data and Gemini AI tags to destinations

-- 1. Add enrichment columns to destinations table
ALTER TABLE destinations
ADD COLUMN IF NOT EXISTS place_id TEXT, -- Google Places ID
ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1), -- 1.0 to 5.0
ADD COLUMN IF NOT EXISTS price_level INTEGER, -- 1-4 ($, $$, $$$, $$$$)
ADD COLUMN IF NOT EXISTS opening_hours JSONB, -- Opening hours from Google
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[], -- AI-generated tags from Gemini
ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMP WITH TIME ZONE;

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_destinations_place_id ON destinations(place_id);
CREATE INDEX IF NOT EXISTS idx_destinations_rating ON destinations(rating DESC);
CREATE INDEX IF NOT EXISTS idx_destinations_price_level ON destinations(price_level);
CREATE INDEX IF NOT EXISTS idx_destinations_tags ON destinations USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_destinations_last_enriched ON destinations(last_enriched_at DESC);

-- 3. Add check constraint for rating
ALTER TABLE destinations
ADD CONSTRAINT chk_rating_range
CHECK (rating IS NULL OR (rating >= 1.0 AND rating <= 5.0));

-- 4. Add check constraint for price_level
ALTER TABLE destinations
ADD CONSTRAINT chk_price_level_range
CHECK (price_level IS NULL OR (price_level >= 1 AND price_level <= 4));

-- 5. Create function to search tags (case-insensitive)
CREATE OR REPLACE FUNCTION search_tags(search_term TEXT)
RETURNS TABLE(slug TEXT, name TEXT, tags TEXT[]) AS $$
BEGIN
  RETURN QUERY
  SELECT d.slug, d.name, d.tags
  FROM destinations d
  WHERE EXISTS (
    SELECT 1
    FROM unnest(d.tags) AS tag
    WHERE LOWER(tag) LIKE LOWER('%' || search_term || '%')
  );
END;
$$ LANGUAGE plpgsql;

-- 6. Create view for enriched destinations
CREATE OR REPLACE VIEW enriched_destinations AS
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

-- Success message
SELECT 'Destination enrichment migration completed! Added Google Places and AI tag fields.' as status;
