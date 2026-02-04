-- Add style/ambience/experience tags and vector embedding to destinations
-- Safe, idempotent migration

-- Enable pgvector if available (ignore if already enabled/not permitted)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgvector extension unavailable: %', SQLERRM;
END $$;

-- Columns
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS style_tags TEXT[];

ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS ambience_tags TEXT[];

ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS experience_tags TEXT[];

-- 3072 dims for text-embedding-3-large; adjust if needed
DO $$
BEGIN
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS vector_embedding vector(3072);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'vector column add skipped: %', SQLERRM;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_destinations_style_tags_gin ON destinations USING GIN(style_tags);
CREATE INDEX IF NOT EXISTS idx_destinations_ambience_tags_gin ON destinations USING GIN(ambience_tags);
CREATE INDEX IF NOT EXISTS idx_destinations_experience_tags_gin ON destinations USING GIN(experience_tags);

-- Vector index (if extension active)
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_destinations_vector_embedding ON destinations USING ivfflat (vector_embedding vector_cosine_ops) WITH (lists = 200)
  WHERE vector_embedding IS NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ivfflat index skipped: %', SQLERRM;
END $$;

-- Documentation comments
COMMENT ON COLUMN destinations.style_tags IS 'Design/style descriptors (minimalist, rustic, luxury, modernist, cozy, elegant, industrial)';
COMMENT ON COLUMN destinations.ambience_tags IS 'Ambience descriptors (quiet, lively, romantic, family-friendly, intimate, vibrant)';
COMMENT ON COLUMN destinations.experience_tags IS 'Experience features (rooftop, waterfront, garden, city-view, spa, pool)';
COMMENT ON COLUMN destinations.vector_embedding IS 'Semantic embedding (pgvector) for vibe/similarity search';


