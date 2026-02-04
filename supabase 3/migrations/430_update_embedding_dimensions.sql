-- Migration 430: Align all embeddings with text-embedding-3-large defaults
-- * Updates embedding columns to vector(3072)
-- * Rebuilds IVFFLAT indexes with tuned list counts
-- * Re-creates RPCs so callers use the new signature
-- * Adds a validation helper to detect rows with mismatched vector lengths

BEGIN;

-- Ensure pgvector exists so vector columns can be recreated safely
CREATE EXTENSION IF NOT EXISTS vector;

-- Helper DO block to drop and recreate embedding columns with the desired dimension
DO $$
DECLARE
  target_dim INTEGER := 3072;
BEGIN
  -- Destinations.primary embedding
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'destinations' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE destinations DROP COLUMN embedding CASCADE;
  END IF;
  ALTER TABLE destinations ADD COLUMN embedding vector(target_dim);

  -- Discovery candidates embedding from Google
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'discovery_candidates' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE discovery_candidates DROP COLUMN embedding CASCADE;
  END IF;
  ALTER TABLE discovery_candidates ADD COLUMN embedding vector(target_dim);

  -- Conversation memory embeddings
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_messages' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE conversation_messages DROP COLUMN embedding CASCADE;
  END IF;
  ALTER TABLE conversation_messages ADD COLUMN embedding vector(target_dim);

  -- Location embeddings used for neighborhood intelligence
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'locations' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE locations DROP COLUMN embedding CASCADE;
  END IF;
  ALTER TABLE locations ADD COLUMN embedding vector(target_dim);
END $$;

-- Rebuild IVFFLAT indexes with tuned list counts (higher for better recall on >10k rows)
CREATE INDEX IF NOT EXISTS idx_destinations_embedding
  ON destinations USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 200)
  WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_discovery_candidates_embedding
  ON discovery_candidates USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 200)
  WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conv_messages_embedding
  ON conversation_messages USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 200)
  WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_locations_embedding
  ON locations USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 200)
  WHERE embedding IS NOT NULL;

-- Drop old functions so we can re-create them with vector(3072)
DROP FUNCTION IF EXISTS search_destinations_hybrid(vector);
DROP FUNCTION IF EXISTS search_destinations_hybrid(vector, uuid, text, text, boolean, integer, numeric, text[], integer, boolean, boolean);
DROP FUNCTION IF EXISTS search_destinations_intelligent(vector);
DROP FUNCTION IF EXISTS search_destinations_intelligent(vector, uuid, text, text, boolean, integer);
DROP FUNCTION IF EXISTS search_destinations_intelligent(vector(1536), uuid, text, text, boolean, integer);

-- Recreate search_destinations_hybrid with the new signature
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

-- Recreate search_destinations_intelligent with vector(3072)
CREATE OR REPLACE FUNCTION search_destinations_intelligent(
  query_embedding vector(3072),
  user_id_param UUID DEFAULT NULL,
  city_filter TEXT DEFAULT NULL,
  category_filter TEXT DEFAULT NULL,
  open_now_filter BOOLEAN DEFAULT false,
  limit_count INTEGER DEFAULT 20
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
  is_open_now BOOLEAN,
  similarity_score FLOAT,
  rank_score FLOAT,
  trending_score FLOAT,
  is_saved BOOLEAN,
  final_score FLOAT
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
    d.is_open_now,
    1 - (d.embedding <=> query_embedding) as similarity_score,
    d.rank_score,
    d.trending_score,
    EXISTS(
      SELECT 1 FROM saved_places sp
      WHERE sp.destination_slug = d.slug
        AND sp.user_id = user_id_param
    ) as is_saved,
    (1 - (d.embedding <=> query_embedding)) * 0.70 +
    COALESCE(d.rank_score, 0.5) * 0.20 +
    COALESCE(d.trending_score / 10, 0) * 0.10 as final_score
  FROM destinations d
  WHERE
    d.embedding IS NOT NULL
    AND (city_filter IS NULL OR d.city ILIKE '%' || city_filter || '%')
    AND (category_filter IS NULL OR d.category = category_filter)
    AND (NOT open_now_filter OR d.is_open_now = true)
  ORDER BY final_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Validation RPC to surface rows with unexpected vector lengths
CREATE OR REPLACE FUNCTION validate_embedding_dimensions(expected_dim INTEGER DEFAULT 3072)
RETURNS TABLE (
  table_name TEXT,
  row_identifier TEXT,
  actual_dimension INTEGER
) SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT 'destinations', d.slug::TEXT, vector_dims(d.embedding)
  FROM destinations d
  WHERE d.embedding IS NOT NULL
    AND vector_dims(d.embedding) <> expected_dim;

  RETURN QUERY
  SELECT 'discovery_candidates', dc.place_id::TEXT, vector_dims(dc.embedding)
  FROM discovery_candidates dc
  WHERE dc.embedding IS NOT NULL
    AND vector_dims(dc.embedding) <> expected_dim;

  RETURN QUERY
  SELECT 'conversation_messages', cm.id::TEXT, vector_dims(cm.embedding)
  FROM conversation_messages cm
  WHERE cm.embedding IS NOT NULL
    AND vector_dims(cm.embedding) <> expected_dim;

  RETURN QUERY
  SELECT 'locations', l.id::TEXT, vector_dims(l.embedding)
  FROM locations l
  WHERE l.embedding IS NOT NULL
    AND vector_dims(l.embedding) <> expected_dim;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_embedding_dimensions(INTEGER) IS 'Returns any rows whose embedding vector dimension does not match the expected schema dimension. Run before and after deployments to ensure data hygiene.';

COMMIT;
