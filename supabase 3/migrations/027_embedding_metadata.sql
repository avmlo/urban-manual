-- Migration 027: Embedding metadata & stale tracking
BEGIN;

-- Add metadata columns to destinations table
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS embedding_version TEXT,
  ADD COLUMN IF NOT EXISTS embedding_needs_update BOOLEAN NOT NULL DEFAULT TRUE;

-- Backfill metadata for existing rows
UPDATE destinations
SET embedding_needs_update = TRUE
WHERE embedding IS NULL;

UPDATE destinations
SET embedding_needs_update = FALSE,
    embedding_version = COALESCE(embedding_version, 'legacy-v1')
WHERE embedding IS NOT NULL;

-- Trigger function to mark embeddings as stale when user-generated content changes
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

DROP TRIGGER IF EXISTS destinations_embedding_stale_trigger ON destinations;
CREATE TRIGGER destinations_embedding_stale_trigger
BEFORE UPDATE ON destinations
FOR EACH ROW
EXECUTE FUNCTION public.mark_destination_embedding_stale();

COMMIT;
