import { NextRequest, NextResponse } from 'next/server';
import { getDiscoveryEngineService } from '@/services/search/discovery-engine';
import { createServerClient } from '@/lib/supabase-server';

/**
 * POST /api/discovery/events/batch
 * Batch track multiple user events for Discovery Engine personalization
 * 
 * Body:
 * - userId: User ID (optional, will use session if not provided)
 * - events: Array of events to track
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, events } = body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'events array is required and must not be empty' },
        { status: 400 }
      );
    }

    const discoveryEngine = getDiscoveryEngineService();

    if (!discoveryEngine.isAvailable()) {
      return NextResponse.json({ success: true, message: 'Discovery Engine not configured, events skipped' });
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
          { error: 'User authentication required for event tracking' },
          { status: 401 }
        );
      }
    }

    if (!finalUserId) {
      return NextResponse.json(
        { error: 'User ID is required for event tracking' },
        { status: 400 }
      );
    }

    // Track all events
    const results = await Promise.allSettled(
      events.map((event: any) =>
        discoveryEngine.trackEvent({
          userId: finalUserId!,
          eventType: event.eventType,
          documentId: event.documentId,
          searchQuery: event.searchQuery,
        })
      )
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      tracked: successful,
      failed,
      total: events.length,
    });
  } catch (error: any) {
    console.error('Batch event tracking error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Event tracking failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

