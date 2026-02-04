import { NextRequest, NextResponse } from 'next/server';
import { ProactiveRecommendationAgent } from '@/lib/agents/proactive-recommendation-agent';
import { createServerClient } from '@/lib/supabase-server';

/**
 * POST /api/agents/proactive-recommendations
 * Proactive Recommendation Agent - Context-aware recommendations
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { location, context } = body;

    // Create agent and execute
    const agent = new ProactiveRecommendationAgent();
    const result = await agent.execute({
      userId: user.id,
      location,
      context,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate recommendations' },
        { status: 500 }
      );
    }

    // Fetch full destination data for suggestions
    if (result.data?.suggestions && result.data.suggestions.length > 0) {
      const destinationIds = result.data.suggestions.map((s: any) => s.destination_id);
      const { data: destinations, error: destError } = await supabase
        .from('destinations')
        .select('*')
        .in('id', destinationIds);

      if (!destError && destinations) {
        // Enrich suggestions with full destination data
        const enriched = result.data.suggestions.map((suggestion: any) => {
          const destination = destinations.find((d: any) => d.id === suggestion.destination_id);
          return {
            ...suggestion,
            destination,
          };
        });

        return NextResponse.json({
          suggestions: enriched,
          context: result.data.context,
          steps: result.steps,
        });
      }
    }

    return NextResponse.json({
      suggestions: result.data?.suggestions || [],
      context: result.data?.context,
      steps: result.steps,
    });
  } catch (error: any) {
    console.error('[Proactive Recommendation Agent] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents/proactive-recommendations
 * Get proactive recommendations (uses current location if available)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    const location = lat && lng
      ? { lat: parseFloat(lat), lng: parseFloat(lng) }
      : undefined;

    // Create agent and execute
    const agent = new ProactiveRecommendationAgent();
    const result = await agent.execute({
      userId: user.id,
      location,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate recommendations' },
        { status: 500 }
      );
    }

    // Fetch full destination data
    if (result.data?.suggestions && result.data.suggestions.length > 0) {
      const destinationIds = result.data.suggestions.map((s: any) => s.destination_id);
      const { data: destinations } = await supabase
        .from('destinations')
        .select('*')
        .in('id', destinationIds);

      if (destinations) {
        const enriched = result.data.suggestions.map((suggestion: any) => {
          const destination = destinations.find((d: any) => d.id === suggestion.destination_id);
          return {
            ...suggestion,
            destination,
          };
        });

        return NextResponse.json({
          suggestions: enriched,
          context: result.data.context,
          steps: result.steps,
        });
      }
    }

    return NextResponse.json({
      suggestions: result.data?.suggestions || [],
      context: result.data?.context,
      steps: result.steps,
    });
  } catch (error: any) {
    console.error('[Proactive Recommendation Agent] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

