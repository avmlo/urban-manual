-- Migration 021: Helper functions for querying with user context

BEGIN;

-- Function to get user's saved destinations with full details
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
    sp.saved_at,
    sp.notes as user_notes,
    sp.tags as user_tags
  FROM saved_places sp
  JOIN destinations d ON d.slug = sp.destination_slug
  WHERE sp.user_id = target_user_id
  ORDER BY sp.saved_at DESC;
END;

$$ LANGUAGE plpgsql;

-- Function to get user's visited destinations with full details
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
    vp.visited_at,
    vp.rating as user_rating,
    vp.notes as user_notes
  FROM visited_places vp
  JOIN destinations d ON d.slug = vp.destination_slug
  WHERE vp.user_id = target_user_id
  ORDER BY vp.visited_at DESC;
END;

$$ LANGUAGE plpgsql;

-- Function to check if destination is saved/visited by user
CREATE OR REPLACE FUNCTION get_destination_user_status(
  target_user_id UUID,
  destination_slug_param TEXT
)
RETURNS TABLE (
  is_saved BOOLEAN,
  is_visited BOOLEAN,
  saved_at TIMESTAMPTZ,
  visited_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
AS $$

BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(
      SELECT 1 FROM saved_places 
      WHERE user_id = target_user_id 
        AND destination_slug = destination_slug_param
    ) as is_saved,
    EXISTS(
      SELECT 1 FROM visited_places 
      WHERE user_id = target_user_id 
        AND destination_slug = destination_slug_param
    ) as is_visited,
    (SELECT sp.saved_at FROM saved_places sp 
     WHERE sp.user_id = target_user_id 
       AND sp.destination_slug = destination_slug_param) as saved_at,
    (SELECT vp.visited_at FROM visited_places vp 
     WHERE vp.user_id = target_user_id 
       AND vp.destination_slug = destination_slug_param) as visited_at;
END;

$$ LANGUAGE plpgsql;

COMMIT;

