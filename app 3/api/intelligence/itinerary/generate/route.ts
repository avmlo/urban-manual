import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { conversationItineraryService } from '@/services/intelligence/conversation-itinerary';
import { multiDayTripPlanningService } from '@/services/intelligence/multi-day-planning';
import { itineraryIntelligenceService } from '@/services/intelligence/itinerary';

/**
 * POST /api/intelligence/itinerary/generate
 * Generate itinerary (supports conversation-based, multi-day, and traditional modes)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const {
      mode, // 'conversation' or 'traditional' or 'multi-day'
      userId,
      sessionId,
      conversationHistory,
      currentQuery,
      city,
      durationDays,
      duration_days, // Support both naming conventions
      startDate,
      endDate,
      preferences,
      save,
    } = body;

    // Conversation-based generation
    if (mode === 'conversation') {
      if (!userId || !sessionId || !conversationHistory || !currentQuery) {
        return NextResponse.json(
          { error: 'Missing required fields for conversation mode: userId, sessionId, conversationHistory, currentQuery' },
          { status: 400 }
        );
      }

      const result = await conversationItineraryService.generateFromConversation({
        userId: userId || user?.id || '',
        sessionId,
        conversationHistory,
        currentQuery,
      });

      return NextResponse.json(result);
    }

    // Multi-day planning
    if (startDate && endDate) {
      if (!city) {
        return NextResponse.json(
          { error: 'city is required for multi-day planning' },
          { status: 400 }
        );
      }

      const plan = await multiDayTripPlanningService.generateMultiDayPlan(
        city,
        new Date(startDate),
        new Date(endDate),
        preferences,
        userId || user?.id
      );

      if (!plan) {
        return NextResponse.json(
          { error: 'Failed to generate trip plan' },
          { status: 500 }
        );
      }

      return NextResponse.json(plan);
    }

    // Traditional generation
    const finalDurationDays = durationDays || duration_days;
    if (!city || !finalDurationDays) {
      return NextResponse.json(
        { error: 'city and durationDays are required for traditional mode' },
        { status: 400 }
      );
    }

    const itinerary = await itineraryIntelligenceService.generateItinerary(
      city,
      finalDurationDays,
      preferences,
      userId || user?.id
    );

    if (!itinerary) {
      return NextResponse.json(
        { error: 'Unable to generate itinerary. No destinations found.' },
        { status: 404 }
      );
    }

    // Save if requested
    let savedId = null;
    if (save && user) {
      savedId = await itineraryIntelligenceService.saveItinerary(itinerary, user.id);
    }

    return NextResponse.json({
      itinerary,
      saved_id: savedId,
    });
  } catch (error: any) {
    console.error('Error generating itinerary:', error);
    return NextResponse.json(
      { error: 'Failed to generate itinerary', details: error.message },
      { status: 500 }
    );
  }
}

