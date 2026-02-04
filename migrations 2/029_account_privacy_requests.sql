-- Migration: Account privacy requests, exports, and deletion tracking
-- Provides storage for GDPR-style data export and deletion workflows

CREATE TABLE IF NOT EXISTS account_data_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('export', 'deletion')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'complete', 'failed', 'cancelled')),
  payload JSONB,
  result_payload JSONB,
  file_url TEXT,
  last_error TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_data_requests_user ON account_data_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_account_data_requests_type_status ON account_data_requests(request_type, status);

ALTER TABLE account_data_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their data requests" ON account_data_requests;
CREATE POLICY "Users can read their data requests" ON account_data_requests
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their data requests" ON account_data_requests;
CREATE POLICY "Users can create their data requests" ON account_data_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS account_privacy_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_privacy_audit_user ON account_privacy_audit(user_id);

ALTER TABLE account_privacy_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their privacy audit" ON account_privacy_audit;
CREATE POLICY "Users can read their privacy audit" ON account_privacy_audit
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create privacy audit entries" ON account_privacy_audit;
CREATE POLICY "Users can create privacy audit entries" ON account_privacy_audit
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION set_account_data_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_account_data_requests_updated_at ON account_data_requests;
CREATE TRIGGER set_account_data_requests_updated_at
  BEFORE UPDATE ON account_data_requests
  FOR EACH ROW EXECUTE FUNCTION set_account_data_requests_updated_at();
