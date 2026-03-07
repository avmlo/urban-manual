import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthContext } from "@/lib/errors";
import { createServerClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ postId: string }>;
}

/**
 * GET /api/cms/posts/[postId]/reactions - List reactions for a post
 */
export const GET = withAuth(
  async (req: NextRequest, { user }: AuthContext, context: RouteContext) => {
    const { postId } = await context.params;
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("reactions")
      .select("*")
      .eq("post_id", postId);

    if (error) throw error;

    return NextResponse.json({ data });
  }
);

/**
 * POST /api/cms/posts/[postId]/reactions - Toggle a reaction on a post
 */
export const POST = withAuth(
  async (req: NextRequest, { user }: AuthContext, context: RouteContext) => {
    const { postId } = await context.params;
    const { emoji } = await req.json();

    if (!emoji || typeof emoji !== "string") {
      return NextResponse.json(
        { error: "Emoji is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Check if user already reacted with this emoji
    const { data: existing } = await supabase
      .from("reactions")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .eq("emoji", emoji)
      .maybeSingle();

    if (existing) {
      // Remove existing reaction (toggle off)
      const { error } = await supabase
        .from("reactions")
        .delete()
        .eq("id", existing.id);

      if (error) throw error;

      return NextResponse.json({ data: { removed: true, emoji } });
    }

    // Add new reaction
    const { data: reaction, error } = await supabase
      .from("reactions")
      .insert({
        post_id: postId,
        user_id: user.id,
        emoji,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data: reaction }, { status: 201 });
  }
);
