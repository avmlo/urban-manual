-- Migration 023: Enable Vector Search with pgvector

BEGIN;

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns to destinations
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS embedding vector(3072),
  ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-large',
  ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMPTZ;

-- Create vector index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_destinations_embedding
  ON destinations USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 200)
  WHERE embedding IS NOT NULL;

-- Add additional columns if they don't exist
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS opening_hours JSONB,
  ADD COLUMN IF NOT EXISTS price_range TEXT,
  ADD COLUMN IF NOT EXISTS booking_url TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Create GIN index for tags array
CREATE INDEX IF NOT EXISTS idx_destinations_tags 
  ON destinations USING GIN (tags);

COMMIT;

