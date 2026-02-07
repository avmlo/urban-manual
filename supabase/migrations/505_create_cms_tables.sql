-- CMS Blog Tables (Craft.do-style CMS)
-- Posts, Tags, Comments, Reactions with workspace support

-- ============================================================
-- Workspaces table
-- ============================================================
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workspace members junction table
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

-- ============================================================
-- Posts table
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  blurb TEXT,
  content TEXT,
  published BOOLEAN DEFAULT false,
  published_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_workspace_id ON posts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- ============================================================
-- Tags table
-- ============================================================
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_tags_workspace_id ON tags(workspace_id);

-- ============================================================
-- Post-Tags junction table
-- ============================================================
CREATE TABLE IF NOT EXISTS post_tags (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_post_tags_post_id ON post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON post_tags(tag_id);

-- ============================================================
-- Comments table
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- ============================================================
-- Reactions table
-- ============================================================
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id);

-- ============================================================
-- Updated_at trigger function (reusable)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_workspaces_updated_at') THEN
    CREATE TRIGGER set_workspaces_updated_at
      BEFORE UPDATE ON workspaces
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_posts_updated_at') THEN
    CREATE TRIGGER set_posts_updated_at
      BEFORE UPDATE ON posts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_comments_updated_at') THEN
    CREATE TRIGGER set_comments_updated_at
      BEFORE UPDATE ON comments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================
-- Row Level Security
-- ============================================================

-- Workspaces: members can read, owners/admins can modify
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_select" ON workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
        AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_insert" ON workspaces
  FOR INSERT WITH CHECK (true);

-- Posts: workspace members can read, authors can modify
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_workspace_select" ON posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = posts.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "posts_author_insert" ON posts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = posts.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "posts_author_update" ON posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "posts_author_delete" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- Tags: workspace members can read and create
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_workspace_select" ON tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = tags.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "tags_workspace_insert" ON tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = tags.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

-- Post tags: inherit from post permissions
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_tags_select" ON post_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_tags.post_id
    )
  );

CREATE POLICY "post_tags_insert" ON post_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_tags.post_id
        AND posts.user_id = auth.uid()
    )
  );

CREATE POLICY "post_tags_delete" ON post_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_tags.post_id
        AND posts.user_id = auth.uid()
    )
  );

-- Comments: workspace members can read, authors can modify their own
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_workspace_select" ON comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts
        JOIN workspace_members ON workspace_members.workspace_id = posts.workspace_id
      WHERE posts.id = comments.post_id
        AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "comments_auth_insert" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_author_update" ON comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "comments_author_delete" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- Reactions: workspace members can read, users can manage their own
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_workspace_select" ON reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts
        JOIN workspace_members ON workspace_members.workspace_id = posts.workspace_id
      WHERE posts.id = reactions.post_id
        AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "reactions_auth_insert" ON reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reactions_author_delete" ON reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Workspace members: members can see other members
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_select_policy" ON workspace_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
    )
  );
