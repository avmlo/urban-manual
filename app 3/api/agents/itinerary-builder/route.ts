import { NextRequest, NextResponse } from 'next/server';
import { ItineraryBuilderAgent } from '@/lib/agents/itinerary-builder-agent';
import { createServerClient } from '@/lib/supabase-server';

/**
 * POST /api/agents/itinerary-builder
 * Smart Itinerary Builder Agent - Automatically builds optimized itineraries
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { destinations, days, preferences } = body;

    if (!destinations || !Array.isArray(destinations) || destinations.length === 0) {
      return NextResponse.json(
        { error: 'destinations array is required' },
        { status: 400 }
      );
    }

    if (!days || days < 1) {
      return NextResponse.json(
        { error: 'days must be at least 1' },
        { status: 400 }
      );
    }

    // Fetch full destination data
    const destinationIds = destinations.map((d: any) => d.id || d.destination_id);
    const { data: destinationData, error: destError } = await supabase
      .from('destinations')
      .select('id, name, city, category, latitude, longitude, opening_hours')
      .in('id', destinationIds);

    if (destError) {
      return NextResponse.json(
        { error: 'Failed to fetch destinations', details: destError.message },
        { status: 500 }
      );
    }

    // Map to agent format
    const agentDestinations = (destinationData || []).map((dest: any) => ({
      id: dest.id,
      name: dest.name,
      city: dest.city,
      category: dest.category,
      latitude: dest.latitude,
      longitude: dest.longitude,
      opening_hours: dest.opening_hours,
    }));

    // Create agent and execute
    const agent = new ItineraryBuilderAgent();
    const result = await agent.execute({
      destinations: agentDestinations,
      days,
      preferences: preferences || {},
      userId: user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to build itinerary' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      itinerary: result.data,
      steps: result.steps,
    });
  } catch (error: any) {
    console.error('[Itinerary Builder Agent] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

