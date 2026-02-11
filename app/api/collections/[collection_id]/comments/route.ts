import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling, withAuth, AuthContext, createValidationError } from '@/lib/errors';

export const GET = withErrorHandling(async (
  _req: NextRequest,
  context?: { params: Promise<{ collection_id: string }> }
) => {
  const { collection_id } = await context!.params;
  const supabase = await createServerClient();

  // Get comments with user profile info
  const { data: comments, error } = await supabase
    .from('collection_comments')
    .select(`
      id,
      comment_text,
      created_at,
      updated_at,
      user_profiles!collection_comments_user_id_fkey (
        user_id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('collection_id', collection_id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return NextResponse.json({ comments: comments || [] });
});

export const POST = withAuth(async (
  req: NextRequest,
  { user }: AuthContext,
  context?: { params: Promise<{ collection_id: string }> }
) => {
  const { collection_id } = await context!.params;
  const supabase = await createServerClient();

  const body = await req.json();
  const { comment_text } = body;

  if (!comment_text || !comment_text.trim()) {
    throw createValidationError('Comment text is required');
  }

  // Check if collection is public
  const { data: collection } = await supabase
    .from('lists')
    .select('is_public')
    .eq('id', collection_id)
    .single();

  if (!collection?.is_public) {
    throw createValidationError('Cannot comment on private collections');
  }

  // Create comment
  const { data: comment, error } = await supabase
    .from('collection_comments')
    .insert({
      collection_id,
      user_id: user.id,
      comment_text: comment_text.trim()
    })
    .select(`
      id,
      comment_text,
      created_at,
      updated_at,
      user_profiles!collection_comments_user_id_fkey (
        user_id,
        username,
        display_name,
        avatar_url
      )
    `)
    .single();

  if (error) throw error;

  return NextResponse.json({ comment });
});
