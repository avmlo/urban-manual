import { NextRequest, NextResponse } from 'next/server';
import { getDiscoveryEngineService } from '@/services/search/discovery-engine';
import { createServerClient } from '@/lib/supabase-server';

/**
 * GET /api/recommendations/discovery
 * Get personalized recommendations using Google Discovery Engine
 * 
 * Query parameters:
 * - userId: User ID (optional, will use session if not provided)
 * - city: Filter by city (optional)
 * - category: Filter by category (optional)
 * - pageSize: Number of recommendations (default: 10)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;
    const city = searchParams.get('city') || undefined;
    const category = searchParams.get('category') || undefined;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 10;

    const discoveryEngine = getDiscoveryEngineService();

    if (!discoveryEngine.isAvailable()) {
      return NextResponse.json(
        { 
          error: 'Discovery Engine is not configured',
          fallback: true,
        },
        { status: 503 }
      );
    }

    // Get user ID from session if not provided
    let finalUserId = userId;
    if (!finalUserId) {
      try {
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        finalUserId = user?.id;
      } catch (error) {
        return NextResponse.json(
          { error: 'User authentication required for personalized recommendations' },
          { status: 401 }
        );
      }
    }

    if (!finalUserId) {
      return NextResponse.json(
        { error: 'User ID is required for recommendations' },
        { status: 400 }
      );
    }

    const recommendations = await discoveryEngine.recommend(finalUserId, {
      pageSize,
      filters: {
        city,
        category,
      },
    });

    return NextResponse.json({
      recommendations,
      count: recommendations.length,
      userId: finalUserId,
    });
  } catch (error: any) {
    console.error('Discovery Engine recommendation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get recommendations',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

