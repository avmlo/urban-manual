import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withOptionalAuth, OptionalAuthContext, createSuccessResponse, createNotFoundError, CustomError, ErrorCode } from '@/lib/errors';

export const GET = withOptionalAuth(async (
  request: NextRequest,
  { user: currentUser }: OptionalAuthContext,
  context?: { params: Promise<{ user_id: string; list_slug: string }> }
) => {
  const { user_id, list_slug } = await context!.params;
  const supabase = await createServerClient();

  // Fetch list by user_id + slug
  const { data: list, error: listError } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', user_id)
    .eq('slug', list_slug)
    .single();

  if (listError || !list) {
    throw createNotFoundError('List');
  }

  // Check access: public or owner
  if (!list.is_public && currentUser?.id !== user_id) {
    throw new CustomError(
      ErrorCode.FORBIDDEN,
      'This list is private',
      403
    );
  }

  // Fetch items ordered by rank (nulls last), then by added_at
  const { data: items } = await supabase
    .from('list_items')
    .select('*')
    .eq('list_id', list.id)
    .order('rank', { ascending: true, nullsFirst: false })
    .order('added_at', { ascending: false });

  // Fetch destinations for those items
  const slugs = (items || []).map((i: any) => i.destination_slug);
  let destinations: any[] = [];
  if (slugs.length > 0) {
    const { data } = await supabase
      .from('destinations')
      .select('*')
      .in('slug', slugs);
    destinations = data || [];
  }

  // Merge rank/notes from items onto destinations, preserving item order
  const orderedDestinations = (items || []).map((item: any) => {
    const dest = destinations.find((d: any) => d.slug === item.destination_slug);
    return dest ? { ...dest, rank: item.rank, curator_notes: item.notes } : null;
  }).filter(Boolean);

  // Fetch owner profile for display
  const { data: ownerProfile } = await supabase
    .from('user_profiles')
    .select('username, display_name, avatar_url')
    .eq('user_id', user_id)
    .single();

  return createSuccessResponse({
    list,
    destinations: orderedDestinations,
    owner: ownerProfile,
  });
});
