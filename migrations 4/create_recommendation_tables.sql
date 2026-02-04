-- User sessions tracking
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  location_city VARCHAR(100),
  location_country VARCHAR(100),
  device_type VARCHAR(50),
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User interactions tracking
CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL, -- 'view', 'click', 'save', 'visit', 'search', 'filter'
  destination_slug VARCHAR(255) REFERENCES destinations(slug) ON DELETE CASCADE,
  city VARCHAR(100),
  category VARCHAR(100),
  duration_seconds INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences (computed from interactions)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  category_scores JSONB DEFAULT '{}', -- {"restaurant": 0.8, "cafe": 0.6, ...}
  city_scores JSONB DEFAULT '{}', -- {"tokyo": 0.9, "paris": 0.7, ...}
  style_preferences JSONB DEFAULT '{}', -- {"michelin": true, "casual": false, ...}
  preferred_times JSONB DEFAULT '{}', -- {"morning": ["cafe", "bakery"], "evening": ["bar", "restaurant"]}
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recommendation cache for performance
CREATE TABLE IF NOT EXISTS recommendation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  algorithm VARCHAR(50) NOT NULL, -- 'cold_start', 'collaborative', 'content_based', 'hybrid'
  recommendations JSONB NOT NULL, -- Array of {slug, score, reason}
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_session_id ON user_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at ON user_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_user_id ON recommendation_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_expires_at ON recommendation_cache(expires_at);

-- Enable Row Level Security
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own interactions"
  ON user_interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interactions"
  ON user_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own recommendation cache"
  ON recommendation_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all recommendation data"
  ON recommendation_cache FOR ALL
  USING (true);
