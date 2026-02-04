-- Fix type mismatch in match_destinations function
-- The rating column is numeric(2,1) but function expects float

DROP FUNCTION IF EXISTS match_destinations(vector(3072), float, int);

CREATE OR REPLACE FUNCTION match_destinations(
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 50
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
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

