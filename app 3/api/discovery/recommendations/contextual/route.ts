import { NextRequest, NextResponse } from 'next/server';
import { getDiscoveryEngineService } from '@/services/search/discovery-engine';
import { createServerClient } from '@/lib/supabase-server';

/**
 * POST /api/discovery/recommendations/contextual
 * Get context-aware recommendations based on time, location, weather, events
 * 
 * Body:
 * - userId: User ID (optional)
 * - context: Context object with time, location, weather, events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, context = {} } = body;

    const discoveryEngine = getDiscoveryEngineService();

    if (!discoveryEngine.isAvailable()) {
      return NextResponse.json(
        { error: 'Discovery Engine is not configured' },
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
          { error: 'User authentication required for contextual recommendations' },
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

    // Build context-aware query
    const contextQuery = buildContextQuery(context);

    // Get base recommendations
    const recommendations = await discoveryEngine.recommend(finalUserId, {
      pageSize: context.pageSize || 10,
      filters: {
        city: context.city,
        category: context.category,
      },
    });

    // Enhance with context scoring
    const enhancedRecommendations = recommendations.map((rec: any) => ({
      ...rec,
      contextScore: calculateContextScore(rec, context),
      contextReason: getContextReason(rec, context),
    }));

    // Sort by context score
    enhancedRecommendations.sort((a: any, b: any) => b.contextScore - a.contextScore);

    return NextResponse.json({
      recommendations: enhancedRecommendations,
      count: enhancedRecommendations.length,
      context,
      userId: finalUserId,
    });
  } catch (error: any) {
    console.error('Contextual recommendations error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get contextual recommendations',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Build context-aware query string
 */
function buildContextQuery(context: any): string {
  const parts: string[] = [];

  // Time-based context
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) {
    parts.push('breakfast');
  } else if (hour >= 12 && hour < 17) {
    parts.push('lunch');
  } else if (hour >= 17 && hour < 21) {
    parts.push('dinner');
  } else {
    parts.push('nightlife');
  }

  // Weather context
  if (context.weather) {
    if (context.weather.includes('rain') || context.weather.includes('cloud')) {
      parts.push('indoor');
    } else if (context.weather.includes('sun') || context.weather.includes('clear')) {
      parts.push('outdoor');
    }
  }

  // Event context
  if (context.events && context.events.length > 0) {
    parts.push('near events');
  }

  return parts.join(' ');
}

/**
 * Calculate context score for a recommendation
 */
function calculateContextScore(recommendation: any, context: any): number {
  let score = 0.5; // Base score

  // Time-based scoring
  const hour = new Date().getHours();
  const category = recommendation.category?.toLowerCase() || '';
  
  if (hour >= 6 && hour < 12 && (category.includes('cafe') || category.includes('breakfast'))) {
    score += 0.3;
  } else if (hour >= 12 && hour < 17 && category.includes('lunch')) {
    score += 0.3;
  } else if (hour >= 17 && hour < 21 && category.includes('dining')) {
    score += 0.3;
  } else if (hour >= 21 && category.includes('nightlife')) {
    score += 0.3;
  }

  // Weather-based scoring
  if (context.weather) {
    const tags = recommendation.tags || [];
    if (context.weather.includes('rain') && tags.includes('indoor')) {
      score += 0.2;
    } else if (context.weather.includes('sun') && tags.includes('outdoor')) {
      score += 0.2;
    }
  }

  // Rating boost
  if (recommendation.rating >= 4.5) {
    score += 0.2;
  }

  return Math.min(score, 1.0);
}

/**
 * Get human-readable context reason
 */
function getContextReason(recommendation: any, context: any): string {
  const reasons: string[] = [];

  const hour = new Date().getHours();
  const category = recommendation.category?.toLowerCase() || '';

  if (hour >= 6 && hour < 12 && (category.includes('cafe') || category.includes('breakfast'))) {
    reasons.push('Perfect for breakfast');
  } else if (hour >= 12 && hour < 17 && category.includes('lunch')) {
    reasons.push('Great for lunch');
  } else if (hour >= 17 && hour < 21 && category.includes('dining')) {
    reasons.push('Ideal for dinner');
  }

  if (recommendation.rating >= 4.5) {
    reasons.push('Highly rated');
  }

  if (context.weather) {
    const tags = recommendation.tags || [];
    if (context.weather.includes('rain') && tags.includes('indoor')) {
      reasons.push('Indoor option for rainy weather');
    }
  }

  return reasons.join(' • ') || 'Recommended for you';
}

