/**
 * Greeting Context API
 * GET /api/greeting/context
 *
 * Returns enriched greeting context for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { fetchGreetingContext } from '@/lib/greetings/context-fetcher';

// Mark route as dynamic since it uses searchParams
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const favoriteCity = searchParams.get('favoriteCity') || undefined;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch enriched greeting context
    const context = await fetchGreetingContext(userId, favoriteCity);

    return NextResponse.json({
      success: true,
      context,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching greeting context:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Cache for 5 minutes
export const revalidate = 300;
