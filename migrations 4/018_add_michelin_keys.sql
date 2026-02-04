-- Migration: Add Michelin Keys support for hotels
-- Michelin Keys are awarded to hotels (similar to stars for restaurants)
-- Range: 1-5 keys

-- Add michelin_keys column to destinations table
ALTER TABLE destinations 
ADD COLUMN IF NOT EXISTS michelin_keys INTEGER CHECK (michelin_keys BETWEEN 1 AND 5);

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_destinations_michelin_keys ON destinations(michelin_keys) WHERE michelin_keys IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN destinations.michelin_keys IS 'Number of Michelin Keys (1-5) awarded to hotels';

-- Update search functions to include michelin_keys filtering
-- Note: This assumes match_destinations function exists. If it doesn't, you may need to create it separately.

