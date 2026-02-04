-- Migration: Add AI Capabilities to Destinations Table
-- Date: 2025-11-01
-- Purpose: Enable vector search, full-text search, and AI-generated fields

-- ============================================================================
-- PHASE 1: VECTOR SEARCH SETUP
-- ============================================================================

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column (768 dimensions for Google text-embedding-004)
ALTER TABLE destinations 
ADD COLUMN IF NOT EXISTS embedding vector(3072);

-- Add metadata for embeddings
ALTER TABLE destinations
ADD COLUMN IF NOT EXISTS embedding_model text DEFAULT 'text-embedding-004';

ALTER TABLE destinations
ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;

-- Create index for fast similarity search
-- Using ivfflat for good balance of speed and accuracy
CREATE INDEX IF NOT EXISTS destinations_embedding_idx 
ON destinations 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Add comment for documentation
COMMENT ON COLUMN destinations.embedding IS 'Vector embedding for semantic search using Google text-embedding-004 model';

-- ============================================================================
-- PHASE 2: FULL-TEXT SEARCH SETUP
-- ============================================================================

-- Add combined search text column
ALTER TABLE destinations 
ADD COLUMN IF NOT EXISTS search_text text;

-- Create function to automatically update search_text
CREATE OR REPLACE FUNCTION update_destinations_search_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text := 
    COALESCE(NEW.name, '') || ' ' || 
    COALESCE(NEW.description, '') || ' ' || 
    COALESCE(NEW.content, '') || ' ' ||
    COALESCE(NEW.city, '') || ' ' || 
    COALESCE(NEW.country, '') || ' ' ||
    COALESCE(NEW.category, '') || ' ' ||
    COALESCE(NEW.architect, '') || ' ' ||
    COALESCE(NEW.brand, '') || ' ' ||
    COALESCE(NEW.neighborhood, '') || ' ' ||
    CASE WHEN NEW.tags IS NOT NULL THEN array_to_string(NEW.tags, ' ') ELSE '' END || ' ' ||
    CASE WHEN NEW.vibe_tags IS NOT NULL THEN array_to_string(NEW.vibe_tags, ' ') ELSE '' END || ' ' ||
    CASE WHEN NEW.keywords IS NOT NULL THEN array_to_string(NEW.keywords, ' ') ELSE '' END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to keep search_text updated
DROP TRIGGER IF EXISTS update_destinations_search_text_trigger ON destinations;
CREATE TRIGGER update_destinations_search_text_trigger
BEFORE INSERT OR UPDATE ON destinations
FOR EACH ROW EXECUTE FUNCTION update_destinations_search_text();

-- Backfill search_text for existing rows
UPDATE destinations SET search_text = 
  COALESCE(name, '') || ' ' || 
  COALESCE(description, '') || ' ' || 
  COALESCE(content, '') || ' ' ||
  COALESCE(city, '') || ' ' || 
  COALESCE(country, '') || ' ' ||
  COALESCE(category, '') || ' ' ||
  COALESCE(architect, '') || ' ' ||
  COALESCE(brand, '') || ' ' ||
  COALESCE(neighborhood, '') || ' ' ||
  CASE WHEN tags IS NOT NULL THEN array_to_string(tags, ' ') ELSE '' END || ' ' ||
  CASE WHEN vibe_tags IS NOT NULL THEN array_to_string(vibe_tags, ' ') ELSE '' END || ' ' ||
  CASE WHEN keywords IS NOT NULL THEN array_to_string(keywords, ' ') ELSE '' END
WHERE search_text IS NULL;

-- Create full-text search index
CREATE INDEX IF NOT EXISTS destinations_search_text_idx 
ON destinations 
USING gin(to_tsvector('english', search_text));

-- Add comment
COMMENT ON COLUMN destinations.search_text IS 'Combined searchable text for full-text search';

-- ============================================================================
-- PHASE 3: AI-GENERATED FIELDS
-- ============================================================================

-- Add AI-enhanced fields
ALTER TABLE destinations
ADD COLUMN IF NOT EXISTS ai_vibe_tags text[];

ALTER TABLE destinations
ADD COLUMN IF NOT EXISTS ai_keywords text[];

ALTER TABLE destinations
ADD COLUMN IF NOT EXISTS ai_short_summary text;

ALTER TABLE destinations
ADD COLUMN IF NOT EXISTS ai_search_keywords text[];

ALTER TABLE destinations
ADD COLUMN IF NOT EXISTS ai_generated_at timestamptz;

-- Add comments
COMMENT ON COLUMN destinations.ai_vibe_tags IS 'AI-generated vibe/atmosphere tags (e.g., romantic, modern, cozy)';
COMMENT ON COLUMN destinations.ai_keywords IS 'AI-generated SEO keywords';
COMMENT ON COLUMN destinations.ai_short_summary IS 'AI-generated short summary (1-2 sentences)';
COMMENT ON COLUMN destinations.ai_search_keywords IS 'AI-generated search-optimized keywords';
COMMENT ON COLUMN destinations.ai_generated_at IS 'Timestamp of when AI fields were last generated';

-- ============================================================================
-- HELPER FUNCTIONS FOR SEARCH
-- ============================================================================

-- Function for hybrid search (vector + keyword)
CREATE OR REPLACE FUNCTION search_destinations(
  query_text text,
  query_embedding vector(3072) DEFAULT NULL,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id int,
  name text,
  city text,
  category text,
  similarity float
) AS $$
BEGIN
  IF query_embedding IS NOT NULL THEN
    -- Vector similarity search
    RETURN QUERY
    SELECT 
      d.id,
      d.name,
      d.city,
      d.category,
      1 - (d.embedding <=> query_embedding) as similarity
    FROM destinations d
    WHERE d.embedding IS NOT NULL
      AND 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
  ELSE
    -- Full-text search fallback
    RETURN QUERY
    SELECT 
      d.id,
      d.name,
      d.city,
      d.category,
      ts_rank(to_tsvector('english', d.search_text), plainto_tsquery('english', query_text)) as similarity
    FROM destinations d
    WHERE to_tsvector('english', d.search_text) @@ plainto_tsquery('english', query_text)
    ORDER BY similarity DESC
    LIMIT match_count;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION search_destinations IS 'Hybrid search function supporting both vector and full-text search';

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Add indexes for common filters
CREATE INDEX IF NOT EXISTS destinations_city_idx ON destinations(city);
CREATE INDEX IF NOT EXISTS destinations_category_idx ON destinations(category);
CREATE INDEX IF NOT EXISTS destinations_country_idx ON destinations(country);
CREATE INDEX IF NOT EXISTS destinations_rating_idx ON destinations(rating DESC);
CREATE INDEX IF NOT EXISTS destinations_michelin_stars_idx ON destinations(michelin_stars DESC) WHERE michelin_stars IS NOT NULL;

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS destinations_city_category_idx ON destinations(city, category);

-- ============================================================================
-- COMPLETION
-- ============================================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 003_add_ai_capabilities.sql completed successfully';
  RAISE NOTICE 'Added: vector embeddings, full-text search, AI fields';
  RAISE NOTICE 'Next steps: Generate embeddings and AI-enhanced content';
END $$;

