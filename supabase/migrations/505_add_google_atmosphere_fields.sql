-- Migration: Add Google Places Atmosphere fields
-- Adds columns for AI summaries, atmosphere data, accessibility, and price range
-- Date: 2026-02-11

DO $$ BEGIN
  -- AI-powered summaries from Google Gemini
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS generative_summary text;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS review_summary text;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS neighborhood_summary text;

  -- Atmosphere data (service options, dining features, place features, parking, payment)
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS google_atmosphere_json jsonb;

  -- Accessibility options
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS accessibility_options_json jsonb;

  -- Structured price range (min/max from Google)
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS price_range_json jsonb;

  -- Secondary opening hours (kitchen hours, happy hour, brunch hours)
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS secondary_opening_hours_json jsonb;
END $$;
