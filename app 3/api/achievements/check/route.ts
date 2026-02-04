import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { checkAndAwardAchievements } from '@/lib/achievements';
import {
  apiRatelimit,
  memoryApiRatelimit,
  enforceRateLimit,
} from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitResponse = await enforceRateLimit({
      request,
      userId: user.id,
      message: 'Too many achievement checks. Please wait a moment.',
      limiter: apiRatelimit,
      memoryLimiter: memoryApiRatelimit,
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Check and award achievements
    const newlyUnlocked = await checkAndAwardAchievements(user.id);

    return NextResponse.json({
      success: true,
      newlyUnlocked: newlyUnlocked.length,
      achievements: newlyUnlocked,
    });
  } catch (error: any) {
    console.error('Error checking achievements:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check achievements' },
      { status: 500 }
    );
  }
}

