/**
 * CMS Blog Types (Craft.do-style CMS)
 *
 * Types for posts, tags, comments, reactions, and workspaces.
 */

export interface Workspace {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
}

export interface Post {
  id: string;
  title: string;
  blurb: string | null;
  content: string | null;
  published: boolean;
  published_date: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  workspace_id: string;
  tags?: Tag[];
  comments?: Comment[];
  reactions?: Reaction[];
}

export interface Tag {
  id: string;
  name: string;
  workspace_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  };
}

export interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface PostWithRelations extends Post {
  tags: Tag[];
  comments: Comment[];
  reactions: Reaction[];
}

export interface CreatePostInput {
  title: string;
  blurb?: string;
  content?: string;
  workspace_id: string;
  tag_ids?: string[];
}

export interface UpdatePostInput {
  title?: string;
  blurb?: string;
  content?: string;
  published?: boolean;
  published_date?: string;
  tag_ids?: string[];
}
