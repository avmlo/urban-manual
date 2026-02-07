-- Add content status column to destinations
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'published', 'archived'));

-- Add SEO fields to destinations
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS meta_title VARCHAR(200),
  ADD COLUMN IF NOT EXISTS meta_description VARCHAR(500),
  ADD COLUMN IF NOT EXISTS canonical_url TEXT,
  ADD COLUMN IF NOT EXISTS noindex BOOLEAN NOT NULL DEFAULT false;

-- Content versioning table
CREATE TABLE IF NOT EXISTS destination_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id INTEGER REFERENCES destinations(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  data JSONB NOT NULL,
  changed_fields TEXT[],
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_destination_versions_destination_id
  ON destination_versions(destination_id);
CREATE INDEX IF NOT EXISTS idx_destination_versions_created_at
  ON destination_versions(created_at DESC);

-- Enable RLS on destination_versions
ALTER TABLE destination_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON destination_versions
  FOR ALL USING (true) WITH CHECK (true);

-- Index for filtering published destinations
CREATE INDEX IF NOT EXISTS idx_destinations_status ON destinations(status);
