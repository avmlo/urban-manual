-- Migration 300: Conversational AI with Memory
-- Implements Phase 3: Conversational AI with context persistence

BEGIN;

-- ============================================================================
-- CONVERSATION SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  context JSONB DEFAULT '{}'::jsonb,
  context_summary TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_sessions_user 
  ON conversation_sessions(user_id, last_updated DESC);

CREATE INDEX IF NOT EXISTS idx_conv_sessions_active 
  ON conversation_sessions(user_id, ended_at) 
  WHERE ended_at IS NULL;

-- ============================================================================
-- CONVERSATION MESSAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  embedding vector(3072),
  intent_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_messages_session 
  ON conversation_messages(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_conv_messages_user 
  ON conversation_messages(user_id, created_at DESC);

-- Index for embedding similarity search
CREATE INDEX IF NOT EXISTS idx_conv_messages_embedding
  ON conversation_messages USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 200)
  WHERE embedding IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- Users can only access their own sessions
CREATE POLICY "Users own sessions" ON conversation_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Users can only access their own messages
CREATE POLICY "Users own messages" ON conversation_messages
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get or create active session for user
CREATE OR REPLACE FUNCTION get_or_create_session(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Try to get active session (not ended)
  SELECT id INTO v_session_id
  FROM conversation_sessions
  WHERE user_id = p_user_id
    AND ended_at IS NULL
  ORDER BY last_updated DESC
  LIMIT 1;

  -- If no active session, create one
  IF v_session_id IS NULL THEN
    INSERT INTO conversation_sessions (user_id)
    VALUES (p_user_id)
    RETURNING id INTO v_session_id;
  END IF;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get conversation history (last N messages)
CREATE OR REPLACE FUNCTION get_conversation_history(
  p_session_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  role TEXT,
  content TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.role,
    cm.content,
    cm.created_at
  FROM conversation_messages cm
  WHERE cm.session_id = p_session_id
  ORDER BY cm.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update session context
CREATE OR REPLACE FUNCTION update_session_context(
  p_session_id UUID,
  p_context JSONB
)
RETURNS void AS $$
BEGIN
  UPDATE conversation_sessions
  SET 
    context = p_context,
    last_updated = NOW()
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- End session
CREATE OR REPLACE FUNCTION end_session(p_session_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE conversation_sessions
  SET ended_at = NOW()
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

