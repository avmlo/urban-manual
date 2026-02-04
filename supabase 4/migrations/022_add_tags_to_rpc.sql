-- Migration 022: Add tags to RPC functions for insights API

BEGIN;

-- Drop existing functions first to allow changing return type
DROP FUNCTION IF EXISTS get_user_saved_destinations(uuid);
DROP FUNCTION IF EXISTS get_user_visited_destinations(uuid);

-- Update get_user_saved_destinations to include tags
CREATE OR REPLACE FUNCTION get_user_saved_destinations(
  target_user_id UUID
)
RETURNS TABLE (
  id INTEGER,
  slug TEXT,
  name TEXT,
  city TEXT,
  category TEXT,
  content TEXT,
  image_url TEXT,
  rating NUMERIC,
  price_level INTEGER,
  michelin_stars INTEGER,
  tags TEXT[],
  saved_at TIMESTAMPTZ,
  user_notes TEXT,
  user_tags TEXT[]
)
SECURITY DEFINER
SET search_path = public
AS $$

BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.slug,
    d.name,
    d.city,
    d.category,
    COALESCE(d.content, d.description) as content,
    COALESCE(d.image, d.main_image) as image_url,
    d.rating,
    d.price_level,
    d.michelin_stars,
    d.tags,
    sp.saved_at,
    sp.notes as user_notes,
    sp.tags as user_tags
  FROM saved_places sp
  JOIN destinations d ON d.slug = sp.destination_slug
  WHERE sp.user_id = target_user_id
  ORDER BY sp.saved_at DESC;
END;

$$ LANGUAGE plpgsql;

-- Update get_user_visited_destinations to include tags
CREATE OR REPLACE FUNCTION get_user_visited_destinations(
  target_user_id UUID
)
RETURNS TABLE (
  id INTEGER,
  slug TEXT,
  name TEXT,
  city TEXT,
  category TEXT,
  content TEXT,
  image_url TEXT,
  rating NUMERIC,
  price_level INTEGER,
  michelin_stars INTEGER,
  tags TEXT[],
  visited_at TIMESTAMPTZ,
  user_rating INTEGER,
  user_notes TEXT
)
SECURITY DEFINER
SET search_path = public
AS $$

BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.slug,
    d.name,
    d.city,
    d.category,
    COALESCE(d.content, d.description) as content,
    COALESCE(d.image, d.main_image) as image_url,
    d.rating,
    d.price_level,
    d.michelin_stars,
    d.tags,
    vp.visited_at,
    vp.rating as user_rating,
    vp.notes as user_notes
  FROM visited_places vp
  JOIN destinations d ON d.slug = vp.destination_slug
  WHERE vp.user_id = target_user_id
  ORDER BY vp.visited_at DESC;
END;

$$ LANGUAGE plpgsql;

COMMIT;

