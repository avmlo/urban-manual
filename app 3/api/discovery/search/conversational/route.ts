import { NextRequest, NextResponse } from 'next/server';
import { getDiscoveryEngineService } from '@/services/search/discovery-engine';
import { createServerClient } from '@/lib/supabase-server';

/**
 * POST /api/discovery/search/conversational
 * Conversational search with context preservation
 * 
 * Body:
 * - query: Current search query
 * - conversationHistory: Array of previous queries in the conversation
 * - userId: User ID (optional)
 * - context: Additional context (city, category, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, conversationHistory = [], userId, context = {} } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'query is required' },
        { status: 400 }
      );
    }

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
        // Continue without user ID
      }
    }

    // Build enhanced query with conversation context
    let enhancedQuery = query;
    if (conversationHistory.length > 0) {
      // Add context from previous queries
      const recentQueries = conversationHistory.slice(-3).join(' ');
      enhancedQuery = `${query} (context: ${recentQueries})`;
    }

    // Add context filters
    const filters: any = {};
    if (context.city) filters.city = context.city;
    if (context.category) filters.category = context.category;
    if (context.priceLevel !== undefined) filters.priceLevel = context.priceLevel;
    if (context.minRating !== undefined) filters.minRating = context.minRating;

    // Perform search
    const results = await discoveryEngine.search(enhancedQuery, {
      userId: finalUserId,
      pageSize: context.pageSize || 20,
      filters,
    });

    // Track conversational search event
    if (finalUserId) {
      discoveryEngine.trackEvent({
        userId: finalUserId,
        eventType: 'search',
        searchQuery: query,
      }).catch((error) => {
        console.warn('Failed to track conversational search event:', error);
      });
    }

    return NextResponse.json({
      results: results.results,
      totalSize: results.totalSize,
      query,
      enhancedQuery,
      conversationHistory: [...conversationHistory, query],
    });
  } catch (error: any) {
    console.error('Conversational search error:', error);
    return NextResponse.json(
      {
        error: 'Conversational search failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

