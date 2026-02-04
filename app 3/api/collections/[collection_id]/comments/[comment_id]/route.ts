import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ collection_id: string; comment_id: string }> }
) {
  try {
    const { comment_id } = await context.params;
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete comment (RLS policies will ensure user owns the comment or owns the collection)
    const { error } = await supabase
      .from('collection_comments')
      .delete()
      .eq('id', comment_id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error: any) {
    console.error('Delete comment error:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment', details: error.message },
      { status: 500 }
    );
  }
}
