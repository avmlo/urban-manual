-- Admin settings table (singleton-row pattern)
CREATE TABLE IF NOT EXISTS admin_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default row
INSERT INTO admin_settings (id, settings)
VALUES ('main', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Only service role can access (admin API routes use service role client)
CREATE POLICY "Service role full access" ON admin_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);
