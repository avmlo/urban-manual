-- Add brand filter to match_destinations function

DROP FUNCTION IF EXISTS match_destinations(vector(3072), float, int, text, text, int, numeric, int, text);

CREATE OR REPLACE FUNCTION match_destinations(
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 50,
  filter_city text DEFAULT NULL,
  filter_category text DEFAULT NULL,
  filter_michelin_stars int DEFAULT NULL,
  filter_min_rating numeric DEFAULT NULL,
  filter_max_price_level int DEFAULT NULL,
  search_query text DEFAULT NULL,
  filter_brand text DEFAULT NULL
)
RETURNS TABLE (
  id int,
  slug text,
  name text,
  city text,
  category text,
  description text,
  content text,
  image text,
  michelin_stars int,
  crown boolean,
  rating numeric,
  price_level int,
  ai_vibe_tags text[],
  ai_keywords text[],
  ai_short_summary text,
  tags text[],
  architect text,
  brand text,
  neighborhood text,
  country text,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.slug,
    d.name,
    d.city,
    d.category,
    d.description,
    d.content,
    d.image,
    d.michelin_stars,
    d.crown,
    d.rating,
    d.price_level,
    d.ai_vibe_tags,
    d.ai_keywords,
    d.ai_short_summary,
    d.tags,
    d.architect,
    d.brand,
    d.neighborhood,
    d.country,
    (1 - (d.embedding <=> query_embedding))::float as similarity
  FROM destinations d
  WHERE d.embedding IS NOT NULL
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
    -- Apply optional filters
    AND (filter_city IS NULL OR LOWER(d.city) = LOWER(filter_city))
    AND (filter_category IS NULL OR LOWER(d.category) = LOWER(filter_category))
    AND (filter_michelin_stars IS NULL OR d.michelin_stars >= filter_michelin_stars)
    AND (filter_min_rating IS NULL OR d.rating >= filter_min_rating)
    AND (filter_max_price_level IS NULL OR d.price_level <= filter_max_price_level)
    AND (filter_brand IS NULL OR LOWER(d.brand) = LOWER(filter_brand))
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
