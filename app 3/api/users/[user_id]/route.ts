import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import {
  apiRatelimit,
  memoryApiRatelimit,
  enforceRateLimit,
} from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ user_id: string }> }
) {
  try {
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
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if profile is public or if it's the current user
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!profile.is_public && currentUser?.id !== user_id) {
      return NextResponse.json(
        { error: 'Profile is private' },
        { status: 403 }
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
        .from('collections')
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

    return NextResponse.json({
      profile,
      stats: {
        savedCount: savedPlaces?.length || 0,
        visitedCount: visitedPlaces?.length || 0,
        collectionsCount: collections?.length || 0,
        followerCount: profile.follower_count || 0,
        followingCount: profile.following_count || 0
      },
      collections: collections || [],
      isFollowing
    });
  } catch (error: any) {
    console.error('Get user profile error:', error);
    return NextResponse.json(
      { error: 'Failed to get user profile', details: error.message },
      { status: 500 }
    );
  }
}
