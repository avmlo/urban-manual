import { NextRequest, NextResponse } from 'next/server';
import { getHybridRecommendations, getColdStartRecommendations } from '@/lib/recommendations';

/**
 * POST /api/personalized-recommendations
 *
 * Returns personalized recommendations based on user behavior and preferences
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, sessionId, limit = 20, algorithm = 'hybrid' } = body;

    // Validate required parameters
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    let recommendations;

    switch (algorithm) {
      case 'cold_start':
        recommendations = await getColdStartRecommendations(limit);
        break;
      case 'hybrid':
      default:
        recommendations = await getHybridRecommendations(userId || null, sessionId, limit);
        break;
    }

    return NextResponse.json({
      success: true,
      algorithm,
      recommendations,
      count: recommendations.length,
    });
  } catch (error: any) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate recommendations',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/personalized-recommendations?userId=xxx&sessionId=xxx&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const recommendations = await getHybridRecommendations(
      userId || null,
      sessionId,
      limit
    );

    return NextResponse.json({
      success: true,
      recommendations,
      count: recommendations.length,
    });
  } catch (error: any) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate recommendations',
      },
      { status: 500 }
    );
  }
}
