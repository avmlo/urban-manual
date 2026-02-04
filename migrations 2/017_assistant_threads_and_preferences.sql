-- Migration: Assistant Threads and Preferences
-- Stores OpenAI Assistant thread IDs and per-user assistant customization
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. ASSISTANT THREADS
-- ============================================
-- Store OpenAI Assistant thread IDs per user for conversation persistence
CREATE TABLE IF NOT EXISTS assistant_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- OpenAI thread information
  thread_id TEXT NOT NULL UNIQUE, -- OpenAI thread ID
  assistant_id TEXT, -- OpenAI assistant ID (optional, for per-user assistants)
  
  -- Thread metadata
  title TEXT, -- Auto-generated from first message or user-set
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE,
  
  -- Thread settings
  is_active BOOLEAN DEFAULT true, -- Only one active thread per user
  is_archived BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assistant_threads_user_id ON assistant_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_threads_thread_id ON assistant_threads(thread_id);
CREATE INDEX IF NOT EXISTS idx_assistant_threads_active ON assistant_threads(user_id, is_active) WHERE is_active = true;

-- ============================================
-- 2. ASSISTANT PREFERENCES
-- ============================================
-- Per-user assistant customization and preferences
CREATE TABLE IF NOT EXISTS assistant_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Assistant behavior
  assistant_name TEXT DEFAULT 'Travel Planning Assistant',
  assistant_personality TEXT DEFAULT 'friendly', -- 'friendly', 'professional', 'casual', 'enthusiastic'
  response_style TEXT DEFAULT 'balanced', -- 'concise', 'detailed', 'balanced'
  use_emoji BOOLEAN DEFAULT true,
  
  -- Assistant capabilities
  enable_function_calling BOOLEAN DEFAULT true,
  enable_vision BOOLEAN DEFAULT true,
  enable_tts BOOLEAN DEFAULT false, -- Text-to-speech
  
  -- Model preferences
  preferred_model TEXT DEFAULT 'auto', -- 'auto', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4o'
  use_complex_model_threshold INTEGER DEFAULT 50, -- Word count threshold for complex queries
  
  -- Context and memory
  conversation_memory_days INTEGER DEFAULT 30, -- How long to remember conversations
  include_user_profile BOOLEAN DEFAULT true, -- Include user profile in context
  include_travel_history BOOLEAN DEFAULT true, -- Include visited places in context
  
  -- Custom instructions (user-defined)
  custom_instructions TEXT, -- User's custom instructions for the assistant
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assistant_preferences_user_id ON assistant_preferences(user_id);

-- ============================================
-- 3. ASSISTANT MESSAGE HISTORY (Optional)
-- ============================================
-- Store message history for analytics and recovery
-- Note: OpenAI stores messages, but we can cache summaries here
CREATE TABLE IF NOT EXISTS assistant_message_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id TEXT NOT NULL, -- OpenAI thread ID
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Message summary (not full content to save space)
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  message_preview TEXT, -- First 200 chars
  message_length INTEGER,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assistant_message_history_thread_id ON assistant_message_history(thread_id);
CREATE INDEX IF NOT EXISTS idx_assistant_message_history_user_id ON assistant_message_history(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_message_history_created_at ON assistant_message_history(created_at DESC);

-- ============================================
-- 4. FUNCTIONS
-- ============================================

-- Function to get or create active thread for user
CREATE OR REPLACE FUNCTION get_active_thread(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_thread_id TEXT;
BEGIN
  -- Get active thread
  SELECT thread_id INTO v_thread_id
  FROM assistant_threads
  WHERE user_id = p_user_id
    AND is_active = true
    AND is_archived = false
  ORDER BY last_message_at DESC NULLS LAST, created_at DESC
  LIMIT 1;
  
  RETURN v_thread_id;
END;
$$ LANGUAGE plpgsql;

-- Function to archive old threads
CREATE OR REPLACE FUNCTION archive_old_threads(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  v_archived_count INTEGER;
BEGIN
  UPDATE assistant_threads
  SET is_archived = true,
      is_active = false,
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND is_active = true
    AND last_message_at < NOW() - (p_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_archived_count = ROW_COUNT;
  RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql;

