import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthContext } from "@/lib/errors";
import { createServerClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ postId: string }>;
}

/**
 * GET /api/cms/posts/[postId]/comments - List comments for a post
 */
export const GET = withAuth(
  async (req: NextRequest, { user }: AuthContext, context: RouteContext) => {
    const { postId } = await context.params;
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data });
  }
);

/**
 * POST /api/cms/posts/[postId]/comments - Add a comment to a post
 */
export const POST = withAuth(
  async (req: NextRequest, { user }: AuthContext, context: RouteContext) => {
    const { postId } = await context.params;
    const { content } = await req.json();

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    const { data: comment, error } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: user.id,
        content: content.trim(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data: comment }, { status: 201 });
  }
);
