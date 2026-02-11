-- ============================================================================
-- Migration: Unify collections + lists into a single system
-- Adds: slug, category_filter to lists; rank, notes to list_items
-- Migrates collections data into lists; adds comprehensive RLS policies
-- ============================================================================

-- ============================================================================
-- Phase 1: Extend lists table with fields from collections
-- ============================================================================

ALTER TABLE lists ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '📍';
ALTER TABLE lists ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';
ALTER TABLE lists ADD COLUMN IF NOT EXISTS destination_count INT DEFAULT 0;
ALTER TABLE lists ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0;
ALTER TABLE lists ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE lists ADD COLUMN IF NOT EXISTS category_filter TEXT;

-- ============================================================================
-- Phase 2: Extend list_items with rank and notes
-- ============================================================================

ALTER TABLE list_items ADD COLUMN IF NOT EXISTS rank INTEGER;
ALTER TABLE list_items ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================================
-- Phase 3: Migrate collections data into lists (preserve IDs for list_items)
-- ============================================================================

INSERT INTO lists (id, user_id, name, description, emoji, color, is_public, destination_count,
                   created_at, updated_at, slug, is_collaborative, cover_image)
SELECT
  id,
  user_id,
  name,
  description,
  COALESCE(emoji, '📍'),
  COALESCE(color, '#3B82F6'),
  COALESCE(is_public, false),
  COALESCE(destination_count, 0),
  created_at,
  COALESCE(updated_at, created_at),
  LOWER(REGEXP_REPLACE(
    REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  )) || '-' || SUBSTRING(id::text, 1, 8),
  false,
  null
FROM collections
WHERE NOT EXISTS (SELECT 1 FROM lists WHERE lists.id = collections.id);

-- ============================================================================
-- Phase 4: Backfill slugs for existing lists rows that have no slug
-- ============================================================================

UPDATE lists
SET slug = LOWER(REGEXP_REPLACE(
  REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'),
  '\s+', '-', 'g'
)) || '-' || SUBSTRING(id::text, 1, 8)
WHERE slug IS NULL;

-- Make slug required
ALTER TABLE lists ALTER COLUMN slug SET NOT NULL;

-- ============================================================================
-- Phase 5: Indexes
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_lists_user_slug ON lists(user_id, slug);
CREATE INDEX IF NOT EXISTS idx_lists_is_public ON lists(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_lists_category_filter ON lists(category_filter) WHERE category_filter IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_list_items_rank ON list_items(list_id, rank) WHERE rank IS NOT NULL;

-- ============================================================================
-- Phase 6: RLS Policies for lists
-- ============================================================================

ALTER TABLE lists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to make migration idempotent
DROP POLICY IF EXISTS "Anyone can view public lists" ON lists;
DROP POLICY IF EXISTS "Users can view own lists" ON lists;
DROP POLICY IF EXISTS "Users can create own lists" ON lists;
DROP POLICY IF EXISTS "Users can update own lists" ON lists;
DROP POLICY IF EXISTS "Users can delete own lists" ON lists;

-- Public can view public lists
CREATE POLICY "Anyone can view public lists" ON lists
  FOR SELECT
  USING (is_public = true);

-- Owners can view all their lists
CREATE POLICY "Users can view own lists" ON lists
  FOR SELECT
  USING (auth.uid() = user_id);

-- Owners can create lists
CREATE POLICY "Users can create own lists" ON lists
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Owners can update own lists
CREATE POLICY "Users can update own lists" ON lists
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owners can delete own lists
CREATE POLICY "Users can delete own lists" ON lists
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Phase 7: RLS Policies for list_items
-- ============================================================================

ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to make migration idempotent
DROP POLICY IF EXISTS "Anyone can view items in public lists" ON list_items;
DROP POLICY IF EXISTS "Users can view items in own lists" ON list_items;
DROP POLICY IF EXISTS "Users can insert items in own lists" ON list_items;
DROP POLICY IF EXISTS "Users can update items in own lists" ON list_items;
DROP POLICY IF EXISTS "Users can delete items in own lists" ON list_items;

-- Anyone can view items in public lists
CREATE POLICY "Anyone can view items in public lists" ON list_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lists WHERE lists.id = list_items.list_id AND lists.is_public = true
    )
  );

-- Owners can view items in their own lists
CREATE POLICY "Users can view items in own lists" ON list_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lists WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid()
    )
  );

-- Owners can manage items in their own lists
CREATE POLICY "Users can insert items in own lists" ON list_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items in own lists" ON list_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM lists WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items in own lists" ON list_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM lists WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid()
    )
  );
