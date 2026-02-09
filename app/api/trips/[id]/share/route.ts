import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { withErrorHandling, createValidationError } from "@/lib/errors";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/trips/[id]/share
 * Generate a share token for the trip and return the share URL.
 * If the trip already has a share token, return the existing one.
 */
export const POST = withErrorHandling(
  async (request: NextRequest, context: RouteContext) => {
    const { id } = await context.params;

    if (!id) {
      throw createValidationError("Trip ID is required");
    }

    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify trip ownership
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id, share_token, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (tripError || !trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // If the trip already has a share token, return it
    if (trip.share_token) {
      const origin = request.nextUrl.origin;
      const shareUrl = `${origin}/trips/shared/${trip.share_token}`;

      return NextResponse.json({
        shareToken: trip.share_token,
        shareUrl,
      });
    }

    // Generate a new share token
    const shareToken = crypto.randomUUID();

    const { error: updateError } = await supabase
      .from("trips")
      .update({ share_token: shareToken })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) {
      throw updateError;
    }

    const origin = request.nextUrl.origin;
    const shareUrl = `${origin}/trips/shared/${shareToken}`;

    return NextResponse.json({
      shareToken,
      shareUrl,
    });
  }
);

/**
 * DELETE /api/trips/[id]/share
 * Revoke sharing by removing the share token.
 */
export const DELETE = withErrorHandling(
  async (request: NextRequest, context: RouteContext) => {
    const { id } = await context.params;

    if (!id) {
      throw createValidationError("Trip ID is required");
    }

    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify trip ownership
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (tripError || !trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Remove the share token
    const { error: updateError } = await supabase
      .from("trips")
      .update({ share_token: null })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });
  }
);
