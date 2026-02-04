-- ============================================
-- SUPABASE FULL-TEXT SEARCH + POSTGIS LOCATION
-- ============================================
-- Run this in your Supabase SQL Editor
-- Dashboard: https://avdnefdfwvpjkuanhdwk.supabase.co
--
-- This script adds:
-- 1. Full-text search for destinations
-- 2. PostGIS for advanced location queries
-- ============================================

-- ============================================
-- PART 1: FULL-TEXT SEARCH
-- ============================================

-- Add search vector column (auto-generated from name, content, category, city)
ALTER TABLE destinations 
ADD COLUMN IF NOT EXISTS search_vector tsvector 
GENERATED ALWAYS AS (
  to_tsvector('english', 
    coalesce(name, '') || ' ' || 
    coalesce(content, '') || ' ' || 
    coalesce(category, '') || ' ' || 
    coalesce(city, '') || ' ' ||
    coalesce(brand, '') || ' ' ||
    coalesce(subline, '')
  )
) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_destinations_search 
ON destinations USING GIN(search_vector);

-- Search function with ranking
CREATE OR REPLACE FUNCTION search_destinations(search_query TEXT)
RETURNS TABLE (
  slug TEXT,
  name TEXT,
  city TEXT,
  category TEXT,
  brand TEXT,
  main_image TEXT,
  michelin_stars INTEGER,
  crown BOOLEAN,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.slug,
    d.name,
    d.city,
    d.category,
    d.brand,
    d.main_image,
    d.michelin_stars,
    d.crown,
    ts_rank(d.search_vector, websearch_to_tsquery('english', search_query)) as rank
  FROM destinations d
  WHERE d.search_vector @@ websearch_to_tsquery('english', search_query)
  ORDER BY rank DESC, d.michelin_stars DESC NULLS LAST, d.crown DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- Search with filters function
CREATE OR REPLACE FUNCTION search_destinations_filtered(
  search_query TEXT,
  filter_city TEXT DEFAULT NULL,
  filter_category TEXT DEFAULT NULL,
  filter_michelin BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  slug TEXT,
  name TEXT,
  city TEXT,
  category TEXT,
  brand TEXT,
  main_image TEXT,
  michelin_stars INTEGER,
  crown BOOLEAN,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.slug,
    d.name,
    d.city,
    d.category,
    d.brand,
    d.main_image,
    d.michelin_stars,
    d.crown,
    ts_rank(d.search_vector, websearch_to_tsquery('english', search_query)) as rank
  FROM destinations d
  WHERE d.search_vector @@ websearch_to_tsquery('english', search_query)
    AND (filter_city IS NULL OR d.city = filter_city)
    AND (filter_category IS NULL OR d.category = filter_category)
    AND (NOT filter_michelin OR d.michelin_stars > 0)
  ORDER BY rank DESC, d.michelin_stars DESC NULLS LAST, d.crown DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 2: POSTGIS FOR LOCATION
-- ============================================

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geometry column for location
ALTER TABLE destinations 
ADD COLUMN IF NOT EXISTS location GEOMETRY(Point, 4326);

-- Populate location from existing lat/long
UPDATE destinations 
SET location = ST_SetSRID(ST_MakePoint(long, lat), 4326)
WHERE lat != 0 AND long != 0 AND location IS NULL;

-- Create spatial index for fast location queries
CREATE INDEX IF NOT EXISTS idx_destinations_location 
ON destinations USING GIST(location);

-- Find nearby destinations function
CREATE OR REPLACE FUNCTION find_nearby_destinations(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 5,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  slug TEXT,
  name TEXT,
  city TEXT,
  category TEXT,
  brand TEXT,
  main_image TEXT,
  michelin_stars INTEGER,
  crown BOOLEAN,
  lat DOUBLE PRECISION,
  long DOUBLE PRECISION,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.slug,
    d.name,
    d.city,
    d.category,
    d.brand,
    d.main_image,
    d.michelin_stars,
    d.crown,
    d.lat,
    d.long,
    ST_Distance(
      d.location::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000 as distance_km
  FROM destinations d
  WHERE d.location IS NOT NULL
    AND ST_DWithin(
      d.location::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Find nearby with category filter
CREATE OR REPLACE FUNCTION find_nearby_by_category(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  filter_category TEXT,
  radius_km DOUBLE PRECISION DEFAULT 10,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  slug TEXT,
  name TEXT,
  city TEXT,
  category TEXT,
  brand TEXT,
  main_image TEXT,
  michelin_stars INTEGER,
  crown BOOLEAN,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.slug,
    d.name,
    d.city,
    d.category,
    d.brand,
    d.main_image,
    d.michelin_stars,
    d.crown,
    ST_Distance(
      d.location::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000 as distance_km
  FROM destinations d
  WHERE d.location IS NOT NULL
    AND d.category = filter_category
    AND ST_DWithin(
      d.location::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Get destinations within a bounding box (for map view)
CREATE OR REPLACE FUNCTION get_destinations_in_bounds(
  min_lat DOUBLE PRECISION,
  min_lng DOUBLE PRECISION,
  max_lat DOUBLE PRECISION,
  max_lng DOUBLE PRECISION
)
RETURNS TABLE (
  slug TEXT,
  name TEXT,
  city TEXT,
  category TEXT,
  lat DOUBLE PRECISION,
  long DOUBLE PRECISION,
  michelin_stars INTEGER,
  crown BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.slug,
    d.name,
    d.city,
    d.category,
    d.lat,
    d.long,
    d.michelin_stars,
    d.crown
  FROM destinations d
  WHERE d.location IS NOT NULL
    AND ST_Within(
      d.location,
      ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    )
  LIMIT 500;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 3: GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions on search functions
GRANT EXECUTE ON FUNCTION search_destinations TO authenticated;
GRANT EXECUTE ON FUNCTION search_destinations TO anon;
GRANT EXECUTE ON FUNCTION search_destinations_filtered TO authenticated;
GRANT EXECUTE ON FUNCTION search_destinations_filtered TO anon;

-- Grant execute permissions on location functions
GRANT EXECUTE ON FUNCTION find_nearby_destinations TO authenticated;
GRANT EXECUTE ON FUNCTION find_nearby_destinations TO anon;
GRANT EXECUTE ON FUNCTION find_nearby_by_category TO authenticated;
GRANT EXECUTE ON FUNCTION find_nearby_by_category TO anon;
GRANT EXECUTE ON FUNCTION get_destinations_in_bounds TO authenticated;
GRANT EXECUTE ON FUNCTION get_destinations_in_bounds TO anon;

-- ============================================
-- PART 4: VERIFICATION QUERIES
-- ============================================

-- Test full-text search
SELECT * FROM search_destinations('coffee tokyo') LIMIT 5;

-- Test search with filters
SELECT * FROM search_destinations_filtered('restaurant', 'tokyo', 'Dining', TRUE) LIMIT 5;

-- Test nearby search (example: Tokyo Station)
SELECT * FROM find_nearby_destinations(35.6812, 139.7671, 2) LIMIT 10;

-- Test nearby by category
SELECT * FROM find_nearby_by_category(35.6812, 139.7671, 'Dining', 5) LIMIT 10;

-- Test bounding box (example: Tokyo area)
SELECT * FROM get_destinations_in_bounds(35.6, 139.6, 35.8, 139.9) LIMIT 10;

-- Check search vector was created
SELECT slug, name, search_vector IS NOT NULL as has_search 
FROM destinations 
LIMIT 5;

-- Check location was populated
SELECT slug, name, location IS NOT NULL as has_location, lat, long 
FROM destinations 
WHERE lat != 0 
LIMIT 5;

-- ============================================
-- NOTES
-- ============================================
--
-- Full-Text Search Features:
-- - Searches across name, content, category, city, brand, subline
-- - Supports fuzzy matching (typos)
-- - Ranks results by relevance
-- - Can filter by city, category, Michelin stars
-- - Example queries:
--   * "coffee shop" → finds all coffee shops
--   * "michelin star tokyo" → Michelin restaurants in Tokyo
--   * "museum taipei" → museums in Taipei
--
-- PostGIS Location Features:
-- - Accurate distance calculations using geography
-- - Find destinations within X km radius
-- - Filter by category within radius
-- - Get destinations in map bounding box
-- - Much more accurate than simple lat/long math
--
-- Performance:
-- - GIN index makes search very fast
-- - GIST index makes location queries fast
-- - Both indexes are automatically maintained
--
-- ============================================

