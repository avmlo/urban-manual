-- Add Google enrichment fields to destinations (idempotent)
DO $$ BEGIN
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS google_place_id text;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS formatted_address text;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS international_phone_number text;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS website text;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS price_level int;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS rating numeric;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS user_ratings_total int;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS opening_hours_json jsonb;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS plus_code text;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS latitude double precision;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS longitude double precision;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS timezone_id text;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS reviews_json jsonb;
EXCEPTION WHEN others THEN NULL; END $$;

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_destinations_google_place_id ON destinations(google_place_id);
