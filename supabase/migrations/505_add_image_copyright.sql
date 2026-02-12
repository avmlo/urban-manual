-- Add image_copyright column to destinations table
-- Stores copyright/attribution info for destination images (e.g., photographer name, source)
ALTER TABLE destinations
ADD COLUMN IF NOT EXISTS image_copyright TEXT DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN destinations.image_copyright IS 'Copyright or attribution text for the destination image (e.g., photographer, source)';
