-- Migration 025: Conversation Tables for AI Chat

BEGIN;

-- Conversation sessions table
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation messages table
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'assistant')),
  detected_intent TEXT,
  extracted_entities JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user ON conversation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_last_activity ON conversation_sessions(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_session ON conversation_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created ON conversation_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_user ON conversation_messages(user_id);

-- Enable RLS
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own sessions" ON conversation_sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON conversation_sessions;
DROP POLICY IF EXISTS "Users can view own messages" ON conversation_messages;
DROP POLICY IF EXISTS "Users can create messages" ON conversation_messages;

-- RLS Policies for conversation_sessions
CREATE POLICY "Users can view own sessions"
  ON conversation_sessions FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create sessions"
  ON conversation_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own sessions"
  ON conversation_sessions FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- RLS Policies for conversation_messages
CREATE POLICY "Users can view own messages"
  ON conversation_messages FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create messages"
  ON conversation_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

COMMIT;

