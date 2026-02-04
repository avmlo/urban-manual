/**
 * ML Service Proxy - Collaborative Filtering Recommendations
 *
 * Proxies requests to the Python ML microservice for collaborative filtering
 * recommendations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const CF_ENDPOINT_BASE = `${ML_SERVICE_URL}/api/recommendations`;

export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const topN = searchParams.get('top_n') || '10';
    const excludeVisited = searchParams.get('exclude_visited') !== 'false';
    const excludeSaved = searchParams.get('exclude_saved') !== 'false';

    // Call ML service
    const mlResponse = await fetch(
      `${CF_ENDPOINT_BASE}/collaborative/${user.id}?top_n=${topN}&exclude_visited=${excludeVisited}&exclude_saved=${excludeSaved}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Timeout after 5 seconds
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!mlResponse.ok) {
      // If ML service fails, return error but don't crash
      console.error('ML service error:', mlResponse.statusText);

      // Return fallback response
      return NextResponse.json(
        {
          error: 'ML service unavailable',
          fallback: true,
          recommendations: []
        },
        { status: 503 }
      );
    }

    const data = await mlResponse.json();

    return NextResponse.json(data);

  } catch (error) {
    console.error('ML recommendation error:', error);

    // Return graceful error with fallback flag
    return NextResponse.json(
      {
        error: 'Failed to fetch recommendations',
        fallback: true,
        recommendations: []
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Call ML service
    const mlResponse = await fetch(
      `${CF_ENDPOINT_BASE}/collaborative`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          ...body
        }),
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!mlResponse.ok) {
      console.error('ML service error:', mlResponse.statusText);
      return NextResponse.json(
        {
          error: 'ML service unavailable',
          fallback: true,
          recommendations: []
        },
        { status: 503 }
      );
    }

    const data = await mlResponse.json();

    return NextResponse.json(data);

  } catch (error) {
    console.error('ML recommendation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch recommendations',
        fallback: true,
        recommendations: []
      },
      { status: 500 }
    );
  }
}
