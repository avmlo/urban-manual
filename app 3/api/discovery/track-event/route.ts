import { NextRequest, NextResponse } from 'next/server';
import { getDiscoveryEngineService } from '@/services/search/discovery-engine';
import { createServerClient } from '@/lib/supabase-server';

/**
 * POST /api/discovery/track-event
 * Track user events for Discovery Engine personalization
 * 
 * Body:
 * - userId: User ID (optional, will use session if not provided)
 * - eventType: 'search' | 'view' | 'click' | 'save' | 'visit'
 * - documentId: Destination ID/slug (optional)
 * - searchQuery: Search query (optional, for search events)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, eventType, documentId, searchQuery } = body;

    if (!eventType || !['search', 'view', 'click', 'save', 'visit'].includes(eventType)) {
      return NextResponse.json(
        { error: 'eventType is required and must be one of: search, view, click, save, visit' },
        { status: 400 }
      );
    }

    const discoveryEngine = getDiscoveryEngineService();

    if (!discoveryEngine.isAvailable()) {
      // Silently succeed if not configured - event tracking is optional
      return NextResponse.json({ success: true, message: 'Discovery Engine not configured, event skipped' });
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

    await discoveryEngine.trackEvent({
      userId: finalUserId,
      eventType,
      documentId,
      searchQuery,
    });

    return NextResponse.json({ 
      success: true,
      eventType,
      userId: finalUserId,
    });
  } catch (error: any) {
    console.error('Discovery Engine event tracking error:', error);
    // Don't fail the request if event tracking fails
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

