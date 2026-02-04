-- Migration 430: Realign vector dimensions and RPC definitions
-- * Drops legacy 768-dimension artifacts introduced by older scripts
-- * Ensures every vector column on destinations uses vector(1536)
-- * Recreates HNSW indexes and search_text helpers
-- * Updates match_destinations RPC signatures to require vector(1536)

BEGIN;

-- Ensure pgvector is enabled (safe to re-run)
CREATE EXTENSION IF NOT EXISTS vector;

-- Guard against legacy 768-dimension artifacts from manual scripts
DROP INDEX IF EXISTS idx_destinations_embedding_hnsw;
DROP INDEX IF EXISTS idx_destinations_embedding;
DROP INDEX IF EXISTS idx_destinations_vector_embedding_hnsw;
DROP INDEX IF EXISTS idx_destinations_vector_embedding;
DROP TRIGGER IF EXISTS trigger_update_destination_search_text ON destinations;
DROP FUNCTION IF EXISTS update_destination_search_text();

-- Ensure helper columns exist
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS search_text TEXT;

CREATE INDEX IF NOT EXISTS idx_destinations_search_text_gin
  ON destinations USING GIN (to_tsvector('english', COALESCE(search_text, '')));

-- Helper to reset a vector column to the desired dimension
DO $$
DECLARE
  current_type TEXT;
BEGIN
  SELECT pg_catalog.format_type(att.atttypid, att.atttypmod)
  INTO current_type
  FROM pg_attribute att
  WHERE att.attrelid = 'public.destinations'::regclass
    AND att.attname = 'embedding'
    AND NOT att.attisdropped;

  IF current_type IS DISTINCT FROM 'vector(1536)' THEN
    IF current_type IS NOT NULL THEN
      ALTER TABLE destinations DROP COLUMN embedding;
    END IF;
    ALTER TABLE destinations ADD COLUMN embedding vector(1536);
  END IF;
END $$;

DO $$
DECLARE
  current_type TEXT;
BEGIN
  SELECT pg_catalog.format_type(att.atttypid, att.atttypmod)
  INTO current_type
  FROM pg_attribute att
  WHERE att.attrelid = 'public.destinations'::regclass
    AND att.attname = 'vector_embedding'
    AND NOT att.attisdropped;

  IF current_type IS DISTINCT FROM 'vector(1536)' THEN
    IF current_type IS NOT NULL THEN
      ALTER TABLE destinations DROP COLUMN vector_embedding;
    END IF;
    ALTER TABLE destinations ADD COLUMN IF NOT EXISTS vector_embedding vector(1536);
  END IF;
END $$;

DO $$
DECLARE
  current_type TEXT;
BEGIN
  SELECT pg_catalog.format_type(att.atttypid, att.atttypmod)
  INTO current_type
  FROM pg_attribute att
  WHERE att.attrelid = 'public.destinations'::regclass
    AND att.attname = 'cf_factors'
    AND NOT att.attisdropped;

  IF current_type IS DISTINCT FROM 'vector(1536)' THEN
    IF current_type IS NOT NULL THEN
      ALTER TABLE destinations DROP COLUMN cf_factors;
    END IF;
    ALTER TABLE destinations ADD COLUMN IF NOT EXISTS cf_factors vector(1536);
  END IF;
END $$;

-- (Re)create tuned HNSW indexes for vector columns
CREATE INDEX IF NOT EXISTS idx_destinations_embedding_hnsw
  ON destinations USING hnsw (embedding vector_cosine_ops)
  WITH (m = 32, ef_construction = 128)
  WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_destinations_vector_embedding_hnsw
  ON destinations USING hnsw (vector_embedding vector_cosine_ops)
  WITH (m = 32, ef_construction = 128)
  WHERE vector_embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_destinations_cf_factors_hnsw
  ON destinations USING hnsw (cf_factors vector_cosine_ops)
  WITH (m = 32, ef_construction = 128)
  WHERE cf_factors IS NOT NULL;

-- search_text helper function + trigger
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

CREATE TRIGGER trigger_update_destination_search_text
  BEFORE INSERT OR UPDATE ON destinations
  FOR EACH ROW
  EXECUTE FUNCTION update_destination_search_text();

-- Backfill search_text when missing
UPDATE destinations SET search_text = CONCAT_WS(' ',
  name, description, content, city, category, country,
  COALESCE(ARRAY_TO_STRING(vibe_tags, ' '), ''),
  COALESCE(ARRAY_TO_STRING(keywords, ' '), ''),
  COALESCE(ARRAY_TO_STRING(search_keywords, ' '), ''),
  COALESCE(short_summary, ''),
  COALESCE(editorial_summary, '')
)
WHERE search_text IS NULL OR search_text = '';

-- Ensure RPCs accept the right vector dimension
DROP FUNCTION IF EXISTS match_destinations(vector(768), float, int, text, text, int, numeric, int, text);
DROP FUNCTION IF EXISTS match_destinations(vector, float, int, text, text, int, numeric, int, text);
DROP FUNCTION IF EXISTS match_destinations(vector(1536), float, int, text, text, int, numeric, int, text);

CREATE OR REPLACE FUNCTION match_destinations(
  query_embedding vector(1536),
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
    1 - (d.embedding <=> query_embedding) AS similarity,
    CASE
      WHEN search_query IS NOT NULL AND d.search_text IS NOT NULL THEN
        (1 - (d.embedding <=> query_embedding)) * 0.7 +
        ts_rank(to_tsvector('english', d.search_text), plainto_tsquery('english', search_query)) * 0.3
      ELSE
        1 - (d.embedding <=> query_embedding)
    END AS rank
  FROM destinations d
  WHERE
    d.embedding IS NOT NULL
    AND (1 - (d.embedding <=> query_embedding)) >= match_threshold
    AND (filter_city IS NULL OR d.city ILIKE '%' || filter_city || '%')
    AND (filter_category IS NULL OR d.category ILIKE '%' || filter_category || '%')
    AND (filter_michelin_stars IS NULL OR d.michelin_stars >= filter_michelin_stars)
    AND (filter_min_rating IS NULL OR d.rating >= filter_min_rating)
    AND (filter_max_price_level IS NULL OR d.price_level <= filter_max_price_level)
    AND (search_query IS NULL OR d.search_text IS NOT NULL)
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;

COMMIT;
