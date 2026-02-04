import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import {
  apiRatelimit,
  memoryApiRatelimit,
  enforceRateLimit,
} from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ user_id: string }> }
) {
  try {
    const rateLimitResponse = await enforceRateLimit({
      request,
      message: 'Too many follow actions. Please wait a moment.',
      limiter: apiRatelimit,
      memoryLimiter: memoryApiRatelimit,
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { user_id: targetUserId } = await context.params;
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.id === targetUserId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    // Create follow relationship
    const { error } = await supabase
      .from('user_follows')
      .insert({
        follower_id: user.id,
        following_id: targetUserId
      });

    if (error) {
      // Check if already following
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Already following this user' }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, message: 'User followed successfully' });
  } catch (error: any) {
    console.error('Follow user error:', error);
    return NextResponse.json(
      { error: 'Failed to follow user', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ user_id: string }> }
) {
  try {
    const rateLimitResponse = await enforceRateLimit({
      request,
      message: 'Too many follow actions. Please wait a moment.',
      limiter: apiRatelimit,
      memoryLimiter: memoryApiRatelimit,
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { user_id: targetUserId } = await context.params;
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete follow relationship
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'User unfollowed successfully' });
  } catch (error: any) {
    console.error('Unfollow user error:', error);
    return NextResponse.json(
      { error: 'Failed to unfollow user', details: error.message },
      { status: 500 }
    );
  }
}
