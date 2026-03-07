import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthContext } from "@/lib/errors";
import { createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/cms/workspaces - List workspaces for the current user
 */
export const GET = withAuth(async (req: NextRequest, { user }: AuthContext) => {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("workspace_members")
    .select(
      `
      workspace_id,
      role,
      workspace:workspaces(id, name, created_at, updated_at)
    `
    )
    .eq("user_id", user.id);

  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workspaces = data?.map((wm: any) => ({
    ...(wm.workspace as Record<string, unknown>),
    role: wm.role as string,
  }));

  return NextResponse.json({ data: workspaces });
});

/**
 * POST /api/cms/workspaces - Create a new workspace
 */
export const POST = withAuth(
  async (req: NextRequest, { user }: AuthContext) => {
    const { name } = await req.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Workspace name is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Create workspace
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .insert({ name: name.trim() })
      .select()
      .single();

    if (wsError) throw wsError;

    // Add creator as owner
    const { error: memberError } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: "owner",
      });

    if (memberError) throw memberError;

    return NextResponse.json({ data: workspace }, { status: 201 });
  }
);
