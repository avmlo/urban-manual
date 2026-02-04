import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ collection_id: string }> }
) {
  try {
    const { collection_id } = await context.params;
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
  } catch (error: any) {
    console.error('Get comments error:', error);
    return NextResponse.json(
      { error: 'Failed to get comments', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ collection_id: string }> }
) {
  try {
    const { collection_id } = await context.params;
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { comment_text } = body;

    if (!comment_text || !comment_text.trim()) {
      return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });
    }

    // Check if collection is public
    const { data: collection } = await supabase
      .from('collections')
      .select('is_public')
      .eq('id', collection_id)
      .single();

    if (!collection?.is_public) {
      return NextResponse.json({ error: 'Cannot comment on private collections' }, { status: 403 });
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
  } catch (error: any) {
    console.error('Create comment error:', error);
    return NextResponse.json(
      { error: 'Failed to create comment', details: error.message },
      { status: 500 }
    );
  }
}
