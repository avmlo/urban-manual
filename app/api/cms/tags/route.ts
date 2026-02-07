import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthContext } from "@/lib/errors";
import { createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/cms/tags - List tags for a workspace
 */
export const GET = withAuth(async (req: NextRequest, { user }: AuthContext) => {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspace_id is required" },
      { status: 400 }
    );
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("name");

  if (error) throw error;

  return NextResponse.json({ data });
});

/**
 * POST /api/cms/tags - Create a new tag
 */
export const POST = withAuth(
  async (req: NextRequest, { user }: AuthContext) => {
    const { name, workspace_id } = await req.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Tag name is required" },
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

    const { data: tag, error } = await supabase
      .from("tags")
      .insert({
        name: name.trim(),
        workspace_id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data: tag }, { status: 201 });
  }
);

/**
 * DELETE /api/cms/tags - Delete a tag
 */
export const DELETE = withAuth(
  async (req: NextRequest, { user }: AuthContext) => {
    const tagId = req.nextUrl.searchParams.get("id");

    if (!tagId) {
      return NextResponse.json(
        { error: "Tag id is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    const { error } = await supabase.from("tags").delete().eq("id", tagId);

    if (error) throw error;

    return NextResponse.json({ data: { message: "Tag deleted" } });
  }
);
