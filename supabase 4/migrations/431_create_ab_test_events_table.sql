-- 431_create_ab_test_events_table.sql
-- Persist A/B test experiment events for analytics

CREATE TABLE IF NOT EXISTS ab_test_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  variant TEXT NOT NULL,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ab_test_events_user_id
  ON ab_test_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_test_event
  ON ab_test_events(test_name, event_type, created_at DESC);

ALTER TABLE ab_test_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert A/B test events" ON ab_test_events;
CREATE POLICY "Users can insert A/B test events" ON ab_test_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own A/B test events" ON ab_test_events;
CREATE POLICY "Users can view own A/B test events" ON ab_test_events
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage A/B test events" ON ab_test_events;
CREATE POLICY "Service role can manage A/B test events" ON ab_test_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
