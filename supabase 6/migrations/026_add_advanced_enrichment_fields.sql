-- Migration: Add Advanced Enrichment Fields
-- Adds columns for photos, weather, events, routes, currency, and static maps
-- Date: 2025-01-XX

DO $$ BEGIN
  -- Google Places Photos
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS photos_json jsonb;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS primary_photo_url text;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS photo_count int DEFAULT 0;
  
  -- Weather Data (from Open-Meteo)
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS current_weather_json jsonb;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS weather_forecast_json jsonb;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS weather_updated_at timestamptz;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS best_visit_months int[]; -- Array of month numbers (1-12)
  
  -- Events Data (from Eventbrite/Ticketmaster)
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS nearby_events_json jsonb;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS events_updated_at timestamptz;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS upcoming_event_count int DEFAULT 0;
  
  -- Routes & Distance Data
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS route_from_city_center_json jsonb;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS walking_time_from_center_minutes int;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS driving_time_from_center_minutes int;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS transit_time_from_center_minutes int;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS distance_from_center_meters int;
  
  -- Static Maps
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS static_map_url text;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS static_map_generated_at timestamptz;
  
  -- Currency & Pricing
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS currency_code text; -- e.g., 'USD', 'EUR', 'GBP'
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS price_range_local text; -- Local currency price range
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS exchange_rate_to_usd numeric;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS currency_updated_at timestamptz;
  
  -- Distance Matrix (for nearby calculations)
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS nearby_destinations_json jsonb; -- Pre-calculated nearby destinations
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS nearby_updated_at timestamptz;
  
  -- AI Vision Analysis (OpenAI)
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS photo_analysis_json jsonb; -- GPT-4 Vision analysis of photos
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS image_captions jsonb; -- Generated captions for images
  
  -- General enrichment tracking
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS advanced_enrichment_at timestamptz;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS enrichment_version int DEFAULT 1; -- Track enrichment schema version
  
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Error adding columns: %', SQLERRM;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_destinations_photo_count ON destinations(photo_count DESC) WHERE photo_count > 0;
CREATE INDEX IF NOT EXISTS idx_destinations_upcoming_events ON destinations(upcoming_event_count DESC) WHERE upcoming_event_count > 0;
CREATE INDEX IF NOT EXISTS idx_destinations_walking_time ON destinations(walking_time_from_center_minutes) WHERE walking_time_from_center_minutes IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_destinations_currency_code ON destinations(currency_code) WHERE currency_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_destinations_advanced_enrichment ON destinations(advanced_enrichment_at DESC) WHERE advanced_enrichment_at IS NOT NULL;

-- Create GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_destinations_photos_json ON destinations USING GIN(photos_json) WHERE photos_json IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_destinations_events_json ON destinations USING GIN(nearby_events_json) WHERE nearby_events_json IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_destinations_weather_json ON destinations USING GIN(current_weather_json) WHERE current_weather_json IS NOT NULL;

COMMENT ON COLUMN destinations.photos_json IS 'Array of Google Places photo objects with URLs and metadata';
COMMENT ON COLUMN destinations.current_weather_json IS 'Current weather conditions from Open-Meteo API';
COMMENT ON COLUMN destinations.weather_forecast_json IS '7-day weather forecast from Open-Meteo API';
COMMENT ON COLUMN destinations.best_visit_months IS 'Array of best months to visit (1-12) based on weather and events';
COMMENT ON COLUMN destinations.nearby_events_json IS 'Upcoming events near this destination from Eventbrite/Ticketmaster';
COMMENT ON COLUMN destinations.route_from_city_center_json IS 'Route data from city center using Google Routes API';
COMMENT ON COLUMN destinations.nearby_destinations_json IS 'Pre-calculated nearby destinations with distances';
COMMENT ON COLUMN destinations.photo_analysis_json IS 'GPT-4 Vision analysis of destination photos';
COMMENT ON COLUMN destinations.image_captions IS 'Generated captions for destination images';

