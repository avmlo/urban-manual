-- Ensure collections table exists with proper structure
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '📍',
  color TEXT DEFAULT '#3B82F6',
  
  -- Privacy
  is_public BOOLEAN DEFAULT false,
  
  -- Metadata
  destination_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_is_public ON collections(is_public) WHERE is_public = true;

-- Enable RLS
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own collections" ON collections;
DROP POLICY IF EXISTS "Users can view public collections" ON collections;
DROP POLICY IF EXISTS "Users can create own collections" ON collections;
DROP POLICY IF EXISTS "Users can update own collections" ON collections;
DROP POLICY IF EXISTS "Users can delete own collections" ON collections;

-- RLS Policies
-- Users can view their own collections
CREATE POLICY "Users can view own collections" ON collections
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view public collections
CREATE POLICY "Users can view public collections" ON collections
  FOR SELECT
  USING (is_public = true);

-- Users can create their own collections
CREATE POLICY "Users can create own collections" ON collections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own collections
CREATE POLICY "Users can update own collections" ON collections
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own collections
CREATE POLICY "Users can delete own collections" ON collections
  FOR DELETE
  USING (auth.uid() = user_id);

