-- Migration Cleanup Script
-- Run this if you encounter errors about missing columns or tables
-- This will safely drop and recreate the saved_visited_places tables

-- Drop existing tables (CASCADE will also drop policies)
DROP TABLE IF EXISTS saved_places CASCADE;
DROP TABLE IF EXISTS visited_places CASCADE;

-- Now recreate them with correct schema
-- Create saved_places table
CREATE TABLE saved_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination_slug VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, destination_slug)
);

-- Create visited_places table
CREATE TABLE visited_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination_slug VARCHAR(255) NOT NULL,
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  UNIQUE(user_id, destination_slug)
);

-- Create indexes for better performance
CREATE INDEX idx_saved_places_user_id ON saved_places(user_id);
CREATE INDEX idx_saved_places_destination_slug ON saved_places(destination_slug);
CREATE INDEX idx_visited_places_user_id ON visited_places(user_id);
CREATE INDEX idx_visited_places_destination_slug ON visited_places(destination_slug);

-- Enable Row Level Security
ALTER TABLE saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE visited_places ENABLE ROW LEVEL SECURITY;

-- Saved Places RLS Policies
CREATE POLICY "Users can view their own saved places"
  ON saved_places FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save places"
  ON saved_places FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their saved places"
  ON saved_places FOR DELETE
  USING (auth.uid() = user_id);

-- Visited Places RLS Policies
CREATE POLICY "Users can view their own visited places"
  ON visited_places FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark places as visited"
  ON visited_places FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their visited places"
  ON visited_places FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their visited places"
  ON visited_places FOR DELETE
  USING (auth.uid() = user_id);

-- Success message
SELECT 'Migration completed successfully! Tables created: saved_places, visited_places' as status;
