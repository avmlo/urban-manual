-- Create visited_countries table for tracking user's visited countries
-- This table stores country-level visit data separate from destination visits

CREATE TABLE IF NOT EXISTS visited_countries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    country_code TEXT NOT NULL,
    country_name TEXT NOT NULL,
    visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, country_code)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_visited_countries_user ON visited_countries(user_id);
CREATE INDEX IF NOT EXISTS idx_visited_countries_code ON visited_countries(country_code);

-- Enable Row Level Security
ALTER TABLE visited_countries ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own visited countries
CREATE POLICY "Users can view their own visited countries"
    ON visited_countries
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own visited countries
CREATE POLICY "Users can insert their own visited countries"
    ON visited_countries
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own visited countries
CREATE POLICY "Users can delete their own visited countries"
    ON visited_countries
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE visited_countries IS 'Stores countries that users have marked as visited';
COMMENT ON COLUMN visited_countries.country_code IS 'ISO 3166-1 alpha-3 country code (e.g., USA, FRA, JPN)';
COMMENT ON COLUMN visited_countries.country_name IS 'Full country name for display';
COMMENT ON COLUMN visited_countries.visited_at IS 'Timestamp when the country was marked as visited';

