-- Migration: Fix embedding dimension mismatch
-- The database has embedding vector(768) from old migration
-- But code uses text-embedding-3-large which now produces 3072 dimensions
-- This migration updates the column to vector(3072) to match

BEGIN;

-- Drop and recreate embedding column with correct dimension
-- This handles both vector(768) and any other mismatched dimensions
DO $$
BEGIN
  -- Drop the column if it exists (CASCADE will drop dependent indexes/constraints)
  ALTER TABLE destinations DROP COLUMN IF EXISTS embedding CASCADE;
  
  -- Add column with correct dimension for text-embedding-3-large (3072)
  ALTER TABLE destinations ADD COLUMN embedding vector(3072);
  
  -- Recreate index
  CREATE INDEX IF NOT EXISTS idx_destinations_embedding
    ON destinations USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 200)
    WHERE embedding IS NOT NULL;
    
  RAISE NOTICE 'Updated embedding column to vector(3072)';
END $$;

-- Drop existing function first to allow changing return type
DROP FUNCTION IF EXISTS search_destinations_intelligent(vector, uuid, text, text, boolean, integer);
DROP FUNCTION IF EXISTS search_destinations_intelligent(vector(768), uuid, text, text, boolean, integer);
DROP FUNCTION IF EXISTS search_destinations_intelligent(vector(1536), uuid, text, text, boolean, integer);
DROP FUNCTION IF EXISTS search_destinations_intelligent(vector(3072), uuid, text, text, boolean, integer);

-- Create search_destinations_intelligent function with correct dimension
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
    -- Blended scoring: semantic (70%) + editorial rank (20%) + trending (10%)
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

COMMIT;

