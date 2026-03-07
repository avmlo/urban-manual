import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthContext } from "@/lib/errors";
import { createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/cms/posts - List posts for a workspace
 */
export const GET = withAuth(async (req: NextRequest, { user }: AuthContext) => {
  const searchParams = req.nextUrl.searchParams;
  const workspaceId = searchParams.get("workspace_id");
  const search = searchParams.get("search");
  const tag = searchParams.get("tag");
  const published = searchParams.get("published");
  const sortBy = searchParams.get("sort_by") || "updated_at";
  const order = searchParams.get("order") || "desc";

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspace_id is required" },
      { status: 400 }
    );
  }

  const supabase = await createServerClient();

  let query = supabase
    .from("posts")
    .select(
      `
      *,
      tags:post_tags(tag:tags(*)),
      comments(id, content, created_at, user_id),
      reactions(id, emoji, user_id)
    `
    )
    .eq("workspace_id", workspaceId);

  if (search) {
    query = query.or(`title.ilike.%${search}%,blurb.ilike.%${search}%`);
  }

  if (published !== null && published !== undefined) {
    query = query.eq("published", published === "true");
  }

  // Validate sort column to prevent injection
  const allowedSortColumns = [
    "created_at",
    "updated_at",
    "title",
    "published_date",
  ];
  const sortColumn = allowedSortColumns.includes(sortBy)
    ? sortBy
    : "updated_at";

  query = query.order(sortColumn, { ascending: order === "asc" });

  const { data, error } = await query;

  if (error) throw error;

  // Flatten the nested tag structure from the junction table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts = (data || []).map((post: any) => ({
    ...post,
    tags: (post.tags as Array<{ tag: unknown }> | undefined)?.map((pt) => pt.tag).filter(Boolean) || [],
  }));

  return NextResponse.json({ data: posts });
});

/**
 * POST /api/cms/posts - Create a new post
 */
export const POST = withAuth(
  async (req: NextRequest, { user }: AuthContext) => {
    const { title, blurb, content, workspace_id, tag_ids } = await req.json();

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!workspace_id) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Create the post
    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({
        title: title.trim(),
        blurb: blurb || null,
        content: content || null,
        user_id: user.id,
        workspace_id,
      })
      .select()
      .single();

    if (postError) throw postError;

    // Attach tags if provided
    if (tag_ids && Array.isArray(tag_ids) && tag_ids.length > 0) {
      const postTags = tag_ids.map((tag_id: string) => ({
        post_id: post.id,
        tag_id,
      }));

      const { error: tagError } = await supabase
        .from("post_tags")
        .insert(postTags);

      if (tagError) throw tagError;
    }

    // Fetch the complete post with relations
    const { data: fullPost, error: fetchError } = await supabase
      .from("posts")
      .select(
        `
        *,
        tags:post_tags(tag:tags(*)),
        comments(id, content, created_at, user_id),
        reactions(id, emoji, user_id)
      `
      )
      .eq("id", post.id)
      .single();

    if (fetchError) throw fetchError;

    const result = {
      ...fullPost,
      tags:
        fullPost.tags
          ?.map((pt: { tag: unknown }) => pt.tag)
          .filter(Boolean) || [],
    };

    return NextResponse.json({ data: result }, { status: 201 });
  }
);
