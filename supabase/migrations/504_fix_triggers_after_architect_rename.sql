-- Migration 504: Fix triggers and functions after architect → design_firm column rename
-- The column `architect` was renamed to `design_firm` in migration 503.
-- Any trigger functions referencing NEW.architect will fail.
-- This migration drops and recreates ALL triggers on destinations to ensure
-- no stale references remain, and updates match_destinations accordingly.

BEGIN;

-- ============================================================================
-- 1. DROP ALL EXISTING TRIGGERS ON DESTINATIONS
-- ============================================================================
DROP TRIGGER IF EXISTS destinations_embedding_stale_trigger ON destinations;
DROP TRIGGER IF EXISTS trigger_update_destination_search_text ON destinations;
DROP TRIGGER IF EXISTS trigger_asimov_sync ON destinations;
DROP TRIGGER IF EXISTS trigger_ensure_retail_stores_are_shopping ON destinations;

-- ============================================================================
-- 2. RECREATE TRIGGER FUNCTIONS (ensuring no NEW.architect references)
-- ============================================================================

-- 2a. Mark embedding as stale when content changes
CREATE OR REPLACE FUNCTION public.mark_destination_embedding_stale()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (
      NEW.name IS DISTINCT FROM OLD.name OR
      NEW.city IS DISTINCT FROM OLD.city OR
      NEW.category IS DISTINCT FROM OLD.category OR
      NEW.content IS DISTINCT FROM OLD.content OR
      NEW.description IS DISTINCT FROM OLD.description OR
      NEW.tags IS DISTINCT FROM OLD.tags OR
      NEW.style_tags IS DISTINCT FROM OLD.style_tags OR
      NEW.ambience_tags IS DISTINCT FROM OLD.ambience_tags OR
      NEW.experience_tags IS DISTINCT FROM OLD.experience_tags
    ) THEN
      NEW.embedding_needs_update = TRUE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2b. Update search_text (now includes design_firm instead of architect)
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
    COALESCE(NEW.design_firm, ''),
    COALESCE(ARRAY_TO_STRING(NEW.vibe_tags, ' '), ''),
    COALESCE(ARRAY_TO_STRING(NEW.keywords, ' '), ''),
    COALESCE(ARRAY_TO_STRING(NEW.search_keywords, ' '), ''),
    COALESCE(NEW.short_summary, ''),
    COALESCE(NEW.editorial_summary, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2c. Asimov sync notification
CREATE OR REPLACE FUNCTION notify_asimov_sync()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('asimov_sync', json_build_object(
    'id', NEW.id,
    'slug', NEW.slug,
    'name', NEW.name,
    'action', TG_OP
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2d. Ensure retail stores are categorized as Shopping
CREATE OR REPLACE FUNCTION ensure_retail_stores_are_shopping()
RETURNS TRIGGER AS $$
BEGIN
  IF LOWER(NEW.name) LIKE 'apple%' OR LOWER(NEW.name) LIKE 'aesop%' OR LOWER(NEW.name) LIKE 'aēsop%' THEN
    NEW.category := 'Shopping';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. RECREATE ALL TRIGGERS
-- ============================================================================

CREATE TRIGGER destinations_embedding_stale_trigger
  BEFORE UPDATE ON destinations
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_destination_embedding_stale();

CREATE TRIGGER trigger_update_destination_search_text
  BEFORE INSERT OR UPDATE ON destinations
  FOR EACH ROW
  EXECUTE FUNCTION update_destination_search_text();

CREATE TRIGGER trigger_asimov_sync
  AFTER INSERT OR UPDATE ON destinations
  FOR EACH ROW
  WHEN (
    NEW.name IS NOT NULL AND
    (NEW.description IS NOT NULL OR NEW.content IS NOT NULL)
  )
  EXECUTE FUNCTION notify_asimov_sync();

CREATE TRIGGER trigger_ensure_retail_stores_are_shopping
  BEFORE INSERT OR UPDATE ON destinations
  FOR EACH ROW
  EXECUTE FUNCTION ensure_retail_stores_are_shopping();

-- ============================================================================
-- 4. FIX match_destinations FUNCTION (d.architect → d.design_firm)
-- ============================================================================

-- Drop existing versions
DROP FUNCTION IF EXISTS match_destinations(vector(3072), float, int, text, text, int, numeric, int, text);
DROP FUNCTION IF EXISTS match_destinations(vector(3072), float, int, text, text, int, numeric, int, text, text);
DROP FUNCTION IF EXISTS match_destinations(vector, float, int, text, text, int, numeric, int, text, text);

-- Recreate with d.design_firm
CREATE OR REPLACE FUNCTION match_destinations(
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.5,
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
  design_firm text,
  brand text,
  neighborhood text,
  country text,
  similarity float,
  rank float
)
LANGUAGE plpgsql
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
    d.design_firm,
    d.brand,
    d.neighborhood,
    d.country,
    (1 - (d.embedding <=> query_embedding))::float as similarity,
    CASE
      WHEN search_query IS NOT NULL AND d.search_text IS NOT NULL THEN
        (1 - (d.embedding <=> query_embedding)) * 0.7 +
        ts_rank(to_tsvector('english', d.search_text), plainto_tsquery('english', search_query)) * 0.3
      ELSE
        (1 - (d.embedding <=> query_embedding))
    END::float as rank
  FROM destinations d
  WHERE
    d.embedding IS NOT NULL
    AND (1 - (d.embedding <=> query_embedding)) >= match_threshold
    AND (filter_city IS NULL OR d.city ILIKE '%' || filter_city || '%')
    AND (filter_category IS NULL OR d.category ILIKE '%' || filter_category || '%')
    AND (filter_michelin_stars IS NULL OR d.michelin_stars >= filter_michelin_stars)
    AND (filter_min_rating IS NULL OR d.rating >= filter_min_rating)
    AND (filter_max_price_level IS NULL OR d.price_level <= filter_max_price_level)
    AND (filter_brand IS NULL OR d.brand ILIKE '%' || filter_brand || '%')
    AND d.parent_destination_id IS NULL
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;

-- Backward-compatible overload without filter_brand
CREATE OR REPLACE FUNCTION match_destinations(
  query_embedding vector(3072),
  match_threshold float,
  match_count int,
  filter_city text,
  filter_category text,
  filter_michelin_stars int,
  filter_min_rating numeric,
  filter_max_price_level int,
  search_query text
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
  design_firm text,
  brand text,
  neighborhood text,
  country text,
  similarity float,
  rank float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM match_destinations(
    query_embedding,
    match_threshold,
    match_count,
    filter_city,
    filter_category,
    filter_michelin_stars,
    filter_min_rating,
    filter_max_price_level,
    search_query,
    NULL::text
  );
END;
$$;

COMMENT ON FUNCTION match_destinations(vector(3072), float, int, text, text, int, numeric, int, text, text) IS
  'Semantic search for destinations using vector similarity with optional filters. Uses text-embedding-3-large (3072 dimensions).';

-- ============================================================================
-- 5. CATCH-ALL: Drop any other triggers that may reference NEW.architect
-- This handles triggers created directly in the live DB outside of migrations
-- ============================================================================
DO $$
DECLARE
  trigger_record RECORD;
  func_body TEXT;
BEGIN
  FOR trigger_record IN
    SELECT t.tgname, p.proname, p.prosrc
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'destinations'
      AND NOT t.tgisinternal
  LOOP
    IF trigger_record.prosrc LIKE '%NEW.architect%' AND trigger_record.prosrc NOT LIKE '%NEW.architect_id%' THEN
      RAISE NOTICE 'Found trigger "%" with function "%" referencing NEW.architect - dropping trigger',
        trigger_record.tgname, trigger_record.proname;
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON destinations', trigger_record.tgname);
    END IF;
  END LOOP;
END $$;

COMMIT;
