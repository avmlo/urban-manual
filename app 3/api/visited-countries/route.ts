import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import {
  apiRatelimit,
  memoryApiRatelimit,
  enforceRateLimit,
} from '@/lib/rate-limit';

/**
 * GET /api/visited-countries
 * Fetch user's visited countries
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const rateLimitResponse = await enforceRateLimit({
      request,
      userId: user.id,
      message: 'Too many visited country requests. Please wait a moment.',
      limiter: apiRatelimit,
      memoryLimiter: memoryApiRatelimit,
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { data: visitedCountries, error } = await supabase
      .from('visited_countries')
      .select('country_code, country_name, visited_at')
      .eq('user_id', user.id)
      .order('visited_at', { ascending: false });

    if (error) {
      console.error('Error fetching visited countries:', error);
      return NextResponse.json(
        { error: 'Failed to fetch visited countries' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      countries: visitedCountries || [],
      count: visitedCountries?.length || 0,
    });
  } catch (error: any) {
    console.error('Error in GET /api/visited-countries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/visited-countries
 * Add a visited country
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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

    const body = await request.json();
    const { country_code, country_name } = body;

    if (!country_code || !country_name) {
      return NextResponse.json(
        { error: 'Missing country_code or country_name' },
        { status: 400 }
      );
    }

    // Upsert (insert or update if exists)
    const { data, error } = await supabase
      .from('visited_countries')
      .upsert({
        user_id: user.id,
        country_code: country_code.toUpperCase(),
        country_name,
        visited_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,country_code',
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding visited country:', error);
      return NextResponse.json(
        { error: 'Failed to add visited country' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      country: data,
    });
  } catch (error: any) {
    console.error('Error in POST /api/visited-countries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

