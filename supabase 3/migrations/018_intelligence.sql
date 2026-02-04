-- 018_intelligence.sql
-- Schema upgrades for Urban Manual Intelligence Layer

-- destinations
ALTER TABLE IF EXISTS destinations
  ADD COLUMN IF NOT EXISTS rank_score FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_open_now BOOLEAN DEFAULT false;

-- co_visit_signals
CREATE TABLE IF NOT EXISTS co_visit_signals (
  destination_a UUID REFERENCES destinations(id),
  destination_b UUID REFERENCES destinations(id),
  co_visit_score FLOAT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (destination_a, destination_b)
);

-- discovery_prompts
ALTER TABLE IF EXISTS discovery_prompts
  ADD COLUMN IF NOT EXISTS variant_a TEXT,
  ADD COLUMN IF NOT EXISTS variant_b TEXT,
  ADD COLUMN IF NOT EXISTS archetype TEXT,
  ADD COLUMN IF NOT EXISTS city_id UUID,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS weight FLOAT DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS clicks INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impressions INT DEFAULT 0;

-- personalization_scores
ALTER TABLE IF EXISTS personalization_scores
  ADD COLUMN IF NOT EXISTS cache JSONB,
  ADD COLUMN IF NOT EXISTS ttl TIMESTAMP WITH TIME ZONE;

-- forecasting_data
ALTER TABLE IF EXISTS forecasting_data
  ADD COLUMN IF NOT EXISTS interest_score FLOAT,
  ADD COLUMN IF NOT EXISTS trend_direction TEXT,
  ADD COLUMN IF NOT EXISTS last_forecast TIMESTAMP WITH TIME ZONE;

-- opportunity_alerts
ALTER TABLE IF EXISTS opportunity_alerts
  ADD COLUMN IF NOT EXISTS alert_type TEXT,
  ADD COLUMN IF NOT EXISTS severity TEXT,
  ADD COLUMN IF NOT EXISTS triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;

-- destination_relationships
ALTER TABLE IF EXISTS destination_relationships
  ADD COLUMN IF NOT EXISTS relation_type TEXT CHECK (relation_type IN ('similar', 'complementary')),
  ADD COLUMN IF NOT EXISTS similarity_score FLOAT;

-- itinerary_templates
ALTER TABLE IF EXISTS itinerary_templates
  ADD COLUMN IF NOT EXISTS template_type TEXT,
  ADD COLUMN IF NOT EXISTS personalization_weight FLOAT DEFAULT 0.5;

-- jobs_history
CREATE TABLE IF NOT EXISTS jobs_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT,
  status TEXT,
  run_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_ms INT,
  notes TEXT
);


