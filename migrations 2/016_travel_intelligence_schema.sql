-- Travel Intelligence Database Schema
-- Comprehensive schema for conversation memory, intelligence insights, and ML data

-- ============================================================================
-- CONVERSATION MEMORY
-- ============================================================================

-- Store conversation sessions
CREATE TABLE IF NOT EXISTS conversation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE, -- For anonymous users
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    context_summary TEXT, -- Summarized context for long conversations
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user ON conversation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_token ON conversation_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_activity ON conversation_sessions(last_activity DESC);

-- Store conversation messages
CREATE TABLE IF NOT EXISTS conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    intent_data JSONB, -- Structured intent extracted from message
    destinations JSONB, -- Related destinations mentioned/shown
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_session ON conversation_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_intent ON conversation_messages USING GIN(intent_data);

-- ============================================================================
-- INTELLIGENCE INSIGHTS
-- ============================================================================

-- Store intelligence insights (forecasts, opportunities, etc.)
CREATE TABLE IF NOT EXISTS intelligence_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    insight_type TEXT NOT NULL CHECK (insight_type IN ('forecast', 'opportunity', 'anomaly', 'trend', 'recommendation')),
    destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
    city TEXT,
    category TEXT,
    insight_data JSONB NOT NULL, -- Flexible structure for different insight types
    confidence_score FLOAT DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    relevance_score FLOAT DEFAULT 0.5 CHECK (relevance_score >= 0 AND relevance_score <= 1),
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intelligence_insights_type ON intelligence_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_intelligence_insights_destination ON intelligence_insights(destination_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_insights_city ON intelligence_insights(city);
CREATE INDEX IF NOT EXISTS idx_intelligence_insights_validity ON intelligence_insights(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_intelligence_insights_confidence ON intelligence_insights(confidence_score DESC, relevance_score DESC);

-- ============================================================================
-- OPPORTUNITY ALERTS
-- ============================================================================

-- Store detected opportunities (deals, events, etc.)
CREATE TABLE IF NOT EXISTS opportunity_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opportunity_type TEXT NOT NULL CHECK (opportunity_type IN ('price_drop', 'availability', 'seasonal', 'event', 'weather', 'trending')),
    destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- If personalized
    city TEXT,
    category TEXT,
    title TEXT NOT NULL,
    description TEXT,
    opportunity_data JSONB NOT NULL, -- Price changes, availability, etc.
    urgency TEXT CHECK (urgency IN ('low', 'medium', 'high')),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opportunity_alerts_type ON opportunity_alerts(opportunity_type);
CREATE INDEX IF NOT EXISTS idx_opportunity_alerts_user ON opportunity_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_alerts_active ON opportunity_alerts(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_opportunity_alerts_city ON opportunity_alerts(city);

-- ============================================================================
-- KNOWLEDGE GRAPH
-- ============================================================================

-- Store destination relationships
CREATE TABLE IF NOT EXISTS destination_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
    target_destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL CHECK (relationship_type IN (
        'similar', 'nearby', 'alternative', 'complementary', 'inspired_by', 
        'trendsetter', 'sequential', 'thematic', 'price_comparison'
    )),
    strength FLOAT DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_destination_id, target_destination_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_destination_relationships_source ON destination_relationships(source_destination_id);
CREATE INDEX IF NOT EXISTS idx_destination_relationships_target ON destination_relationships(target_destination_id);
CREATE INDEX IF NOT EXISTS idx_destination_relationships_type ON destination_relationships(relationship_type);

-- ============================================================================
-- USER PREFERENCE EVOLUTION
-- ============================================================================

-- Track how user preferences evolve over time
CREATE TABLE IF NOT EXISTS user_preferences_evolution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    preference_type TEXT NOT NULL CHECK (preference_type IN ('city', 'category', 'style', 'price', 'rating', 'atmosphere')),
    preference_value TEXT NOT NULL,
    strength FLOAT DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
    context TEXT, -- 'business', 'leisure', 'romantic', etc.
    first_observed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_observed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    observation_count INTEGER DEFAULT 1,
    trend TEXT CHECK (trend IN ('increasing', 'decreasing', 'stable')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences_evolution(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_type ON user_preferences_evolution(preference_type);
CREATE INDEX IF NOT EXISTS idx_user_preferences_trend ON user_preferences_evolution(trend);

-- ============================================================================
-- ITINERARY TEMPLATES & INTELLIGENCE
-- ============================================================================

-- Store generated itinerary templates
CREATE TABLE IF NOT EXISTS itinerary_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    city TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    template_name TEXT,
    destinations JSONB NOT NULL, -- Array of destination IDs with order and timing
    optimization_criteria JSONB, -- What was optimized (time, cost, experience)
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_itinerary_templates_user ON itinerary_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_templates_city ON itinerary_templates(city);

-- ============================================================================
-- FORECASTING DATA
-- ============================================================================

-- Store historical data for forecasting
CREATE TABLE IF NOT EXISTS forecasting_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('price', 'demand', 'availability', 'rating', 'popularity')),
    metric_value FLOAT NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forecasting_data_destination ON forecasting_data(destination_id);
CREATE INDEX IF NOT EXISTS idx_forecasting_data_metric ON forecasting_data(metric_type, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_forecasting_data_time ON forecasting_data(recorded_at DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE destination_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences_evolution ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecasting_data ENABLE ROW LEVEL SECURITY;

-- Conversation sessions: Users can read their own sessions
CREATE POLICY "Users can view own conversation sessions" ON conversation_sessions
    FOR SELECT USING (auth.uid() = user_id OR session_token = current_setting('app.session_token', true));

-- Conversation messages: Users can read messages from their sessions
CREATE POLICY "Users can view own conversation messages" ON conversation_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_sessions cs
            WHERE cs.id = conversation_messages.session_id
            AND (cs.user_id = auth.uid() OR cs.session_token = current_setting('app.session_token', true))
        )
    );

-- Intelligence insights: Public read, admin write
CREATE POLICY "Anyone can read intelligence insights" ON intelligence_insights
    FOR SELECT USING (true);

-- Opportunity alerts: Users can read their own alerts
CREATE POLICY "Users can view own opportunity alerts" ON opportunity_alerts
    FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

-- Destination relationships: Public read
CREATE POLICY "Anyone can read destination relationships" ON destination_relationships
    FOR SELECT USING (true);

-- User preferences: Users can read/update their own
CREATE POLICY "Users can manage own preferences" ON user_preferences_evolution
    FOR ALL USING (user_id = auth.uid());

-- Itinerary templates: Users can manage their own
CREATE POLICY "Users can manage own itinerary templates" ON itinerary_templates
    FOR ALL USING (user_id = auth.uid());

-- Forecasting data: Read-only for all, write for service role
CREATE POLICY "Anyone can read forecasting data" ON forecasting_data
    FOR SELECT USING (true);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_sessions_updated_at BEFORE UPDATE ON conversation_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intelligence_insights_updated_at BEFORE UPDATE ON intelligence_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_destination_relationships_updated_at BEFORE UPDATE ON destination_relationships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences_evolution
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update last_activity on conversation sessions
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversation_sessions
    SET last_activity = NOW()
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_session_activity_on_message AFTER INSERT ON conversation_messages
    FOR EACH ROW EXECUTE FUNCTION update_session_activity();

-- Increment observation count on preference updates
CREATE OR REPLACE FUNCTION increment_preference_count()
RETURNS TRIGGER AS $$
BEGIN
    NEW.observation_count = OLD.observation_count + 1;
    NEW.last_observed = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER increment_preference_count_on_update BEFORE UPDATE ON user_preferences_evolution
    FOR EACH ROW
    WHEN (OLD.preference_value = NEW.preference_value)
    EXECUTE FUNCTION increment_preference_count();

