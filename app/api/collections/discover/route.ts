import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling } from '@/lib/errors';
import { sanitizeForIlike } from '@/lib/sanitize';

export const GET = withErrorHandling(async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const sortBy = searchParams.get('sort') || 'recent'; // recent, popular, likes
  const limit = parseInt(searchParams.get('limit') || '20');

  const supabase = await createServerClient();

  let dbQuery = supabase
    .from('collections')
    .select(`
      id,
      name,
      description,
      emoji,
      color,
      destination_count,
      view_count,
      created_at,
      user_profiles!collections_user_id_fkey (
        user_id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('is_public', true);

  // Search filter
  if (query.trim()) {
    const safeQuery = sanitizeForIlike(query);
    dbQuery = dbQuery.or(`name.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`);
  }

  // Sorting
  switch (sortBy) {
    case 'popular':
      dbQuery = dbQuery.order('view_count', { ascending: false });
      break;
    case 'recent':
    default:
      dbQuery = dbQuery.order('created_at', { ascending: false });
      break;
  }

  dbQuery = dbQuery.limit(limit);

  const { data: collections, error } = await dbQuery;

  if (error) throw error;

  return NextResponse.json({ collections: collections || [] });
});
