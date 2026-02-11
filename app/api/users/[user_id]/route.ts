import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withOptionalAuth, OptionalAuthContext, createSuccessResponse, createNotFoundError, CustomError, ErrorCode } from '@/lib/errors';
import {
  apiRatelimit,
  memoryApiRatelimit,
  enforceRateLimit,
} from '@/lib/rate-limit';

export const GET = withOptionalAuth(async (
  request: NextRequest,
  { user: currentUser }: OptionalAuthContext,
  context: { params: Promise<{ user_id: string }> }
) => {
  const rateLimitResponse = await enforceRateLimit({
    request,
    message: 'Too many profile requests. Please wait a moment.',
    limiter: apiRatelimit,
    memoryLimiter: memoryApiRatelimit,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { user_id } = await context.params;
  const supabase = await createServerClient();

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user_id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) {
    throw createNotFoundError('Profile');
  }

  // Check if profile is public or if it's the current user
  if (!profile.is_public && currentUser?.id !== user_id) {
    throw new CustomError(
      ErrorCode.FORBIDDEN,
      'Profile is private',
      403
    );
  }

  // Get user stats
  const [
    { data: savedPlaces },
    { data: visitedPlaces },
    { data: collections }
  ] = await Promise.all([
    supabase
      .from('saved_places')
      .select('destination_slug', { count: 'exact' })
      .eq('user_id', user_id),
    supabase
      .from('visited_places')
      .select('destination_slug', { count: 'exact' })
      .eq('user_id', user_id),
    supabase
      .from('lists')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
  ]);

  // Check if current user follows this user
  let isFollowing = false;
  if (currentUser) {
    const { data: followData } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', user_id)
      .maybeSingle();

    isFollowing = !!followData;
  }

  const publicLists = collections || [];

  return createSuccessResponse({
    profile,
    stats: {
      savedCount: savedPlaces?.length || 0,
      visitedCount: visitedPlaces?.length || 0,
      collectionsCount: publicLists.length,
      listsCount: publicLists.length,
      followerCount: profile.follower_count || 0,
      followingCount: profile.following_count || 0
    },
    collections: publicLists,
    lists: publicLists,
    isFollowing
  });
});
