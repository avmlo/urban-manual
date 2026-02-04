-- Add Instagram fields to destinations table
-- Run this in your Supabase SQL Editor

ALTER TABLE destinations
ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT;

-- Add indexes for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_destinations_instagram_handle ON destinations(instagram_handle);

-- Add a comment to document the columns
COMMENT ON COLUMN destinations.instagram_handle IS 'Instagram username without @ symbol';
COMMENT ON COLUMN destinations.instagram_url IS 'Full Instagram profile URL';
