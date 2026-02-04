-- Add extended Google enrichment fields to destinations (idempotent)
DO $$ BEGIN
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS current_opening_hours_json jsonb;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS secondary_opening_hours_json jsonb;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS business_status text;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS editorial_summary text;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS google_name text;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS place_types_json jsonb;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS utc_offset int;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS vicinity text;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS adr_address text;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS address_components_json jsonb;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS icon_url text;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS icon_background_color text;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS icon_mask_base_uri text;
EXCEPTION WHEN others THEN NULL; END $$;

