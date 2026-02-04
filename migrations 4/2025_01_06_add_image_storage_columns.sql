-- Add columns for Supabase Storage image migration
-- These columns store the optimized full image, thumbnail, and original URL backup

ALTER TABLE destinations 
ADD COLUMN IF NOT EXISTS image_thumbnail TEXT,
ADD COLUMN IF NOT EXISTS image_original TEXT;

-- Add comment for documentation
COMMENT ON COLUMN destinations.image_thumbnail IS 'Optimized thumbnail URL from Supabase Storage (400px width, WebP format)';
COMMENT ON COLUMN destinations.image_original IS 'Backup of original image URL before migration to Supabase Storage';
