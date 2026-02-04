-- Migration 024: Hybrid Search Function

BEGIN;

-- Hybrid search function that combines vector similarity with filters and user context
CREATE OR REPLACE FUNCTION search_destinations_hybrid(
  query_embedding vector(3072),
  user_id_param UUID DEFAULT NULL,
  city_filter TEXT DEFAULT NULL,
  category_filter TEXT DEFAULT NULL,
  michelin_only BOOLEAN DEFAULT FALSE,
  price_max INTEGER DEFAULT NULL,
  rating_min NUMERIC DEFAULT NULL,
  tags_filter TEXT[] DEFAULT NULL,
  limit_count INTEGER DEFAULT 10,
  include_saved_only BOOLEAN DEFAULT FALSE,
  boost_saved BOOLEAN DEFAULT TRUE
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
  similarity FLOAT,
  is_saved BOOLEAN,
  is_visited BOOLEAN,
  final_score FLOAT
) 
SECURITY DEFINER
SET search_path = public
AS $$

BEGIN
  RETURN QUERY
  WITH base_search AS (
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
      1 - (d.embedding <=> query_embedding) as similarity,
      EXISTS(
        SELECT 1 FROM saved_places sp 
        WHERE sp.destination_slug = d.slug 
          AND sp.user_id = user_id_param
      ) as is_saved,
      EXISTS(
        SELECT 1 FROM visited_places vp 
        WHERE vp.destination_slug = d.slug 
          AND vp.user_id = user_id_param
      ) as is_visited
    FROM destinations d
    WHERE d.embedding IS NOT NULL
      AND (city_filter IS NULL OR d.city ILIKE '%' || city_filter || '%')
      AND (category_filter IS NULL OR d.category = category_filter)
      AND (NOT michelin_only OR d.michelin_stars > 0)
      AND (price_max IS NULL OR d.price_level <= price_max)
      AND (rating_min IS NULL OR d.rating >= rating_min)
      AND (tags_filter IS NULL OR d.tags && tags_filter)
  )
  SELECT 
    bs.id::INTEGER,
    bs.slug,
    bs.name,
    bs.city,
    bs.category,
    bs.content,
    bs.image_url,
    bs.rating,
    bs.price_level,
    bs.michelin_stars,
    bs.tags,
    bs.similarity::FLOAT,
    bs.is_saved,
    bs.is_visited,
    (
      bs.similarity * 0.50 + 
      (COALESCE(bs.rating, 0) / 5.0) * 0.15 + 
      (CASE WHEN bs.michelin_stars > 0 THEN 0.1 ELSE 0 END) +
      (CASE WHEN boost_saved AND bs.is_saved THEN 0.15 ELSE 0 END) +
      (CASE WHEN bs.is_visited THEN 0.10 ELSE 0 END)
    )::FLOAT as final_score
  FROM base_search bs
  WHERE (NOT include_saved_only OR bs.is_saved)
  ORDER BY final_score DESC
  LIMIT limit_count;
END;

$$ LANGUAGE plpgsql;

COMMIT;

