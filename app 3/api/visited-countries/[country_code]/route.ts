import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import {
  apiRatelimit,
  memoryApiRatelimit,
  enforceRateLimit,
} from '@/lib/rate-limit';

/**
 * DELETE /api/visited-countries/[country_code]
 * Remove a visited country
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ country_code: string }> }
) {
  try {
    const { country_code } = await params;
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!country_code) {
      return NextResponse.json(
        { error: 'Missing country_code' },
        { status: 400 }
      );
    }

    const rateLimitResponse = await enforceRateLimit({
      request,
      userId: user.id,
      message: 'Too many visited country updates. Please wait a moment.',
      limiter: apiRatelimit,
      memoryLimiter: memoryApiRatelimit,
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { error } = await supabase
      .from('visited_countries')
      .delete()
      .eq('user_id', user.id)
      .eq('country_code', country_code.toUpperCase());

    if (error) {
      console.error('Error removing visited country:', error);
      return NextResponse.json(
        { error: 'Failed to remove visited country' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Country removed from visited list',
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/visited-countries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

