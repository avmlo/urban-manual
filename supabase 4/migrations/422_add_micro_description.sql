-- Add micro_description column to destinations table
-- This is a short 1-line description for homepage cards

ALTER TABLE destinations
ADD COLUMN IF NOT EXISTS micro_description TEXT;

-- Add index for potential future search/filtering
CREATE INDEX IF NOT EXISTS idx_destinations_micro_description 
ON destinations USING gin(to_tsvector('english', COALESCE(micro_description, '')));

COMMENT ON COLUMN destinations.micro_description IS 'Short 1-line description for homepage card display (typically 50-100 characters)';

