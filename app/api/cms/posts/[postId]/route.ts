import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthContext } from "@/lib/errors";
import { createServerClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ postId: string }>;
}

/**
 * GET /api/cms/posts/[postId] - Get a single post with relations
 */
export const GET = withAuth(
  async (req: NextRequest, { user }: AuthContext, context: RouteContext) => {
    const { postId } = await context.params;
    const supabase = await createServerClient();

    const { data: post, error } = await supabase
      .from("posts")
      .select(
        `
        *,
        tags:post_tags(tag:tags(*)),
        comments(id, content, created_at, updated_at, user_id),
        reactions(id, emoji, user_id, created_at)
      `
      )
      .eq("id", postId)
      .single();

    if (error) throw error;

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const result = {
      ...post,
      tags:
        post.tags?.map((pt: { tag: unknown }) => pt.tag).filter(Boolean) || [],
    };

    return NextResponse.json({ data: result });
  }
);

/**
 * PUT /api/cms/posts/[postId] - Update a post
 */
export const PUT = withAuth(
  async (req: NextRequest, { user }: AuthContext, context: RouteContext) => {
    const { postId } = await context.params;
    const { title, blurb, content, published, published_date, tag_ids } =
      await req.json();

    const supabase = await createServerClient();

    // Verify the post exists and belongs to the user
    const { data: existing, error: fetchError } = await supabase
      .from("posts")
      .select("id, user_id")
      .eq("id", postId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build update payload (only include provided fields)
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (blurb !== undefined) updates.blurb = blurb;
    if (content !== undefined) updates.content = content;
    if (published !== undefined) updates.published = published;
    if (published_date !== undefined) updates.published_date = published_date;

    const { error: updateError } = await supabase
      .from("posts")
      .update(updates)
      .eq("id", postId);

    if (updateError) throw updateError;

    // Update tags if provided
    if (tag_ids !== undefined && Array.isArray(tag_ids)) {
      // Remove existing tags
      const { error: deleteTagsError } = await supabase
        .from("post_tags")
        .delete()
        .eq("post_id", postId);

      if (deleteTagsError) throw deleteTagsError;

      // Add new tags
      if (tag_ids.length > 0) {
        const postTags = tag_ids.map((tag_id: string) => ({
          post_id: postId,
          tag_id,
        }));

        const { error: insertTagsError } = await supabase
          .from("post_tags")
          .insert(postTags);

        if (insertTagsError) throw insertTagsError;
      }
    }

    // Fetch updated post with relations
    const { data: updatedPost, error: refetchError } = await supabase
      .from("posts")
      .select(
        `
        *,
        tags:post_tags(tag:tags(*)),
        comments(id, content, created_at, user_id),
        reactions(id, emoji, user_id)
      `
      )
      .eq("id", postId)
      .single();

    if (refetchError) throw refetchError;

    const result = {
      ...updatedPost,
      tags:
        updatedPost.tags
          ?.map((pt: { tag: unknown }) => pt.tag)
          .filter(Boolean) || [],
    };

    return NextResponse.json({ data: result });
  }
);

/**
 * DELETE /api/cms/posts/[postId] - Delete a post
 */
export const DELETE = withAuth(
  async (req: NextRequest, { user }: AuthContext, context: RouteContext) => {
    const { postId } = await context.params;
    const supabase = await createServerClient();

    // Verify the post exists and belongs to the user
    const { data: existing, error: fetchError } = await supabase
      .from("posts")
      .select("id, user_id")
      .eq("id", postId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase.from("posts").delete().eq("id", postId);

    if (error) throw error;

    return NextResponse.json({ data: { message: "Post deleted" } });
  }
);
