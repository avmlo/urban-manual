import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/comments?destination_id=123
 * Fetches comments for a destination
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const destinationId = searchParams.get('destination_id');

    if (!destinationId) {
      return NextResponse.json({ error: 'destination_id is required' }, { status: 400 });
    }

    // Fetch comments with replies
    const { data: comments, error } = await supabase
      .from('destination_comments')
      .select('*')
      .eq('destination_id', parseInt(destinationId))
      .is('deleted_at', null)
      .is('parent_comment_id', null) // Only top-level comments
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Fetch replies for each comment
    const commentsWithReplies = await Promise.all(
      (comments || []).map(async (comment) => {
        const { data: replies } = await supabase
          .from('destination_comments')
          .select('*')
          .eq('parent_comment_id', comment.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: true });

        return {
          ...comment,
          replies: replies || [],
          reply_count: replies?.length || 0,
        };
      })
    );

    return NextResponse.json(commentsWithReplies);
  } catch (error: unknown) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/comments
 * Creates a new comment
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { destination_id, comment_text, parent_comment_id, mentioned_users } = body;

    if (!destination_id || !comment_text) {
      return NextResponse.json(
        { error: 'destination_id and comment_text are required' },
        { status: 400 }
      );
    }

    // Create comment
    const { data: comment, error } = await supabase
      .from('destination_comments')
      .insert({
        destination_id,
        user_id: user.id,
        user_email: user.email,
        user_name: user.user_metadata?.name || user.email,
        comment_text,
        parent_comment_id: parent_comment_id || null,
        mentioned_users: mentioned_users || [],
        is_internal: true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/comments/:id
 * Updates a comment (resolve, update text, etc.)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const commentId = searchParams.get('id');

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.comment_text !== undefined) {
      updateData.comment_text = body.comment_text;
    }

    if (body.resolved !== undefined) {
      updateData.resolved = body.resolved;
      if (body.resolved) {
        updateData.resolved_by = user.id;
        updateData.resolved_at = new Date().toISOString();
      } else {
        updateData.resolved_by = null;
        updateData.resolved_at = null;
      }
    }

    updateData.updated_at = new Date().toISOString();

    const { data: comment, error } = await supabase
      .from('destination_comments')
      .update(updateData)
      .eq('id', commentId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(comment);
  } catch (error: unknown) {
    console.error('Error updating comment:', error);
    return NextResponse.json(
      { error: 'Failed to update comment', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/comments/:id
 * Soft deletes a comment
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const commentId = searchParams.get('id');

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    // Soft delete by setting deleted_at
    const { error } = await supabase
      .from('destination_comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId)
      .eq('user_id', user.id); // Can only delete own comments

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment', details: String(error) },
      { status: 500 }
    );
  }
}
