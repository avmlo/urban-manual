/**
 * Behavior Tracking API
 *
 * Receives behavior events from the frontend and stores them
 * for algorithm training.
 *
 * This is the data pipeline that feeds TasteDNA and other algorithms.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling } from '@/lib/errors';
import { dispatchInteractionRecord, isInngestConfigured } from '@/lib/inngest/dispatch';

// ============================================
// TYPES
// ============================================

interface BehaviorEvent {
  event_type: string;
  destination_slug?: string;
  destination_id?: number;
  timestamp: string;
  context: Record<string, any>;
}

interface TrackingPayload {
  user_id?: string;
  events: BehaviorEvent[];
}

// Event types that map to user_interactions table
const INTERACTION_TYPES = ['view', 'click', 'save', 'search'];

// ============================================
// POST - Receive behavior events
// ============================================

export const POST = withErrorHandling(async (request: NextRequest) => {
  try {
    const supabase = await createServerClient();

    // Get authenticated user (optional - we track anonymous too)
    const { data: { session } } = await supabase.auth.getSession();
    const authenticatedUserId = session?.user?.id;

    const payload: TrackingPayload = await request.json();
    const { events } = payload;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No events provided',
      }, { status: 400 });
    }

    // Use authenticated user ID if available, otherwise use provided ID
    const userId = authenticatedUserId || payload.user_id;

    // Process events in parallel for better throughput
    const results = await Promise.allSettled(
      events.map(event => processEvent(supabase, userId, event))
    );

    const processedEvents: any[] = [];
    const errors: any[] = [];

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value) {
        processedEvents.push(result.value);
      } else if (result.status === 'rejected') {
        errors.push({
          event_type: events[idx].event_type,
          error: result.reason?.message || 'Unknown error',
        });
      }
    });

    // Store raw events in parallel with response (fire-and-forget)
    storeRawEvents(supabase, userId, events).catch(() => {});

    return NextResponse.json({
      success: true,
      data: {
        processed: processedEvents.length,
        errors: errors.length,
        error_details: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error: any) {
    console.error('[Behavior Track] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to track behavior',
    }, { status: 500 });
  }
});

// ============================================
// HELPERS
// ============================================

async function processEvent(
  supabase: any,
  userId: string | undefined,
  event: BehaviorEvent
): Promise<any | null> {
  const { event_type, destination_slug, destination_id, context } = event;

  // Map event types to user_interactions
  if (event_type === 'destination_view') {
    return await recordInteraction(supabase, userId, destination_id, 'view', context);
  }

  if (event_type === 'destination_click') {
    return await recordInteraction(supabase, userId, destination_id, 'click', context);
  }

  if (event_type === 'destination_save') {
    return await recordInteraction(supabase, userId, destination_id, 'save', context);
  }

  if (event_type === 'search_query') {
    return await recordInteraction(supabase, userId, null, 'search', context);
  }

  // Update destination metrics for engagement signals
  if (destination_slug && (event_type === 'destination_view' || event_type === 'destination_click')) {
    await updateDestinationMetrics(supabase, destination_slug, event_type);
  }

  return null;
}

async function recordInteraction(
  supabase: any,
  userId: string | undefined,
  destinationId: number | null | undefined,
  interactionType: string,
  context: Record<string, any>
): Promise<any> {
  if (!userId) {
    // Anonymous users - still track but don't store in user_interactions
    return { anonymous: true, type: interactionType };
  }

  // Calculate engagement score based on context
  const engagementScore = calculateEngagementScore(interactionType, context);

  const { data, error } = await supabase
    .from('user_interactions')
    .insert({
      user_id: userId,
      destination_id: destinationId,
      interaction_type: interactionType,
      engagement_score: engagementScore,
      context: context,
    })
    .select()
    .single();

  if (error) {
    console.error('[Behavior Track] Insert error:', error);
    throw error;
  }

  // Dispatch background job for taste profile update (for significant interactions)
  if (isInngestConfigured() && destinationId && ['save', 'visit'].includes(interactionType)) {
    try {
      // Get destination details for the background job
      const { data: destination } = await supabase
        .from('destinations')
        .select('slug, name, city, category')
        .eq('id', destinationId)
        .single();

      if (destination) {
        await dispatchInteractionRecord(userId, {
          type: interactionType as 'save' | 'visit',
          destination: {
            id: destinationId,
            slug: destination.slug,
            name: destination.name,
            city: destination.city,
            category: destination.category,
          },
        });
      }
    } catch (jobError) {
      // Non-critical - log but don't fail the request
      console.warn('[Behavior Track] Failed to dispatch taste profile job:', jobError);
    }
  }

  return data;
}

function calculateEngagementScore(
  interactionType: string,
  context: Record<string, any>
): number {
  // Base scores by interaction type
  const baseScores: Record<string, number> = {
    view: 1,
    click: 2,
    save: 5,
    search: 1,
  };

  let score = baseScores[interactionType] || 1;

  // Boost for dwell time
  const dwellTime = context.dwell_time_ms || 0;
  if (dwellTime > 30000) score += 3;       // 30+ seconds
  else if (dwellTime > 10000) score += 2;  // 10-30 seconds
  else if (dwellTime > 3000) score += 1;   // 3-10 seconds

  // Boost for scroll depth
  const scrollDepth = context.max_scroll_depth || 0;
  if (scrollDepth >= 75) score += 2;
  else if (scrollDepth >= 50) score += 1;

  return Math.min(score, 10); // Cap at 10
}

async function updateDestinationMetrics(
  supabase: any,
  destinationSlug: string,
  eventType: string
): Promise<void> {
  try {
    if (eventType === 'destination_view') {
      await supabase.rpc('increment_views_by_slug', { dest_slug: destinationSlug });
    }
  } catch (error) {
    console.warn('[Behavior Track] Failed to update metrics:', error);
  }
}

async function storeRawEvents(
  supabase: any,
  userId: string | undefined,
  events: BehaviorEvent[]
): Promise<void> {
  try {
    // Store in a raw events table for algorithm training
    // This preserves all context even if we don't process it immediately

    const rawEvents = events.map(event => ({
      user_id: userId,
      event_type: event.event_type,
      destination_slug: event.destination_slug,
      destination_id: event.destination_id,
      event_context: event.context,
      created_at: event.timestamp,
    }));

    // Try to insert, but don't fail if table doesn't exist
    const { error } = await supabase
      .from('behavior_events')
      .insert(rawEvents);

    if (error && !error.message?.includes('does not exist')) {
      console.warn('[Behavior Track] Raw events storage warning:', error);
    }
  } catch (error) {
    // Non-critical - just log
    console.warn('[Behavior Track] Raw events storage error:', error);
  }
}
