-- Vector Search Migration for Semantic Search
-- Adds pgvector support and creates RPC function for vector similarity search

-- 1. Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column to destinations table (if not exists)
-- Using text-embedding-3-large which produces 3072-dimensional embeddings
DO $$ BEGIN
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS embedding vector(3072);
EXCEPTION WHEN others THEN NULL; END $$;

-- 3. Create search_text column for full-text search (combines name, description, content, keywords, etc.)
DO $$ BEGIN
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS search_text TEXT;
EXCEPTION WHEN others THEN NULL; END $$;

-- 4. Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_destinations_search_text_gin ON destinations USING GIN(to_tsvector('english', COALESCE(search_text, '')));

-- 5. Create HNSW index for vector similarity search (more efficient than IVFFlat for larger datasets)
CREATE INDEX IF NOT EXISTS idx_destinations_embedding_hnsw ON destinations USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 6. Create function to update search_text column (combines all searchable fields)
CREATE OR REPLACE FUNCTION update_destination_search_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text := CONCAT_WS(' ',
    NEW.name,
    NEW.description,
    NEW.content,
    NEW.city,
    NEW.category,
    NEW.country,
    COALESCE(ARRAY_TO_STRING(NEW.vibe_tags, ' '), ''),
    COALESCE(ARRAY_TO_STRING(NEW.keywords, ' '), ''),
    COALESCE(ARRAY_TO_STRING(NEW.search_keywords, ' '), ''),
    COALESCE(NEW.short_summary, ''),
    COALESCE(NEW.editorial_summary, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to automatically update search_text when destination is updated
DROP TRIGGER IF EXISTS trigger_update_destination_search_text ON destinations;
CREATE TRIGGER trigger_update_destination_search_text
  BEFORE INSERT OR UPDATE ON destinations
  FOR EACH ROW
  EXECUTE FUNCTION update_destination_search_text();

-- 8. Update existing destinations to populate search_text
UPDATE destinations SET search_text = CONCAT_WS(' ',
  name, description, content, city, category, country,
  COALESCE(ARRAY_TO_STRING(vibe_tags, ' '), ''),
  COALESCE(ARRAY_TO_STRING(keywords, ' '), ''),
  COALESCE(ARRAY_TO_STRING(search_keywords, ' '), ''),
  COALESCE(short_summary, ''),
  COALESCE(editorial_summary, '')
)
WHERE search_text IS NULL OR search_text = '';

-- 9. Create RPC function for vector similarity search with filters
CREATE OR REPLACE FUNCTION match_destinations(
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 50,
  filter_city text DEFAULT NULL,
  filter_category text DEFAULT NULL,
  filter_michelin_stars int DEFAULT NULL,
  filter_min_rating numeric DEFAULT NULL,
  filter_max_price_level int DEFAULT NULL,
  search_query text DEFAULT NULL
)
RETURNS TABLE (
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
  similarity float,
  rank float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
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
    -- Cosine similarity (1 - distance = similarity)
    1 - (d.embedding <=> query_embedding) as similarity,
    -- Combined rank: similarity + full-text search rank (if query provided)
    CASE
      WHEN search_query IS NOT NULL AND d.search_text IS NOT NULL THEN
        (1 - (d.embedding <=> query_embedding)) * 0.7 +
        ts_rank(to_tsvector('english', d.search_text), plainto_tsquery('english', search_query)) * 0.3
      ELSE
        1 - (d.embedding <=> query_embedding)
    END as rank
  FROM destinations d
  WHERE
    -- Vector similarity threshold
    (1 - (d.embedding <=> query_embedding)) >= match_threshold
    -- Optional filters
    AND (filter_city IS NULL OR d.city ILIKE '%' || filter_city || '%')
    AND (filter_category IS NULL OR d.category ILIKE '%' || filter_category || '%')
    AND (filter_michelin_stars IS NULL OR d.michelin_stars >= filter_michelin_stars)
    AND (filter_min_rating IS NULL OR d.rating >= filter_min_rating)
    AND (filter_max_price_level IS NULL OR d.price_level <= filter_max_price_level)
    -- Full-text search filter (if query provided)
    AND (search_query IS NULL OR d.search_text IS NOT NULL)
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;

-- 10. Create helper function to search by AI fields (vibe_tags, keywords, search_keywords)
CREATE OR REPLACE FUNCTION search_by_ai_fields(
  search_term text,
  match_count int DEFAULT 50
)
RETURNS TABLE (
  slug text,
  name text,
  city text,
  category text,
  description text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.slug,
    d.name,
    d.city,
    d.category,
    d.description,
    -- Calculate similarity based on array overlap
    (
      CASE WHEN d.vibe_tags IS NOT NULL THEN
        (SELECT COUNT(*)::float / GREATEST(array_length(d.vibe_tags, 1), 1)
         FROM unnest(d.vibe_tags) tag
         WHERE tag ILIKE '%' || search_term || '%') * 0.4
      ELSE 0 END +
      CASE WHEN d.keywords IS NOT NULL THEN
        (SELECT COUNT(*)::float / GREATEST(array_length(d.keywords, 1), 1)
         FROM unnest(d.keywords) kw
         WHERE kw ILIKE '%' || search_term || '%') * 0.4
      ELSE 0 END +
      CASE WHEN d.search_keywords IS NOT NULL THEN
        (SELECT COUNT(*)::float / GREATEST(array_length(d.search_keywords, 1), 1)
         FROM unnest(d.search_keywords) skw
         WHERE skw ILIKE '%' || search_term || '%') * 0.2
      ELSE 0 END
    ) as similarity
  FROM destinations d
  WHERE
    (d.vibe_tags && ARRAY[search_term]::text[] OR
     EXISTS (SELECT 1 FROM unnest(COALESCE(d.vibe_tags, ARRAY[]::text[])) tag WHERE tag ILIKE '%' || search_term || '%')) OR
    (d.keywords && ARRAY[search_term]::text[] OR
     EXISTS (SELECT 1 FROM unnest(COALESCE(d.keywords, ARRAY[]::text[])) kw WHERE kw ILIKE '%' || search_term || '%')) OR
    (d.search_keywords && ARRAY[search_term]::text[] OR
     EXISTS (SELECT 1 FROM unnest(COALESCE(d.search_keywords, ARRAY[]::text[])) skw WHERE skw ILIKE '%' || search_term || '%'))
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
