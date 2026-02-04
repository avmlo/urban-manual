import { NextRequest, NextResponse } from 'next/server';
import { getDiscoveryEngineService } from '@/services/search/discovery-engine';
import { createServerClient } from '@/lib/supabase-server';
import { getFeatureFlags, getABTestVariant } from '@/lib/discovery-engine/feature-flags';
import { withCache, getDiscoveryEngineCache } from '@/lib/discovery-engine/cache';
import { withPerformanceMonitoring } from '@/lib/discovery-engine/performance';

/**
 * POST /api/search/discovery
 * Search destinations using Google Discovery Engine
 * 
 * Query parameters:
 * - query: Search query string (required)
 * - city: Filter by city (optional)
 * - category: Filter by category (optional)
 * - priceLevel: Filter by max price level (optional)
 * - minRating: Filter by minimum rating (optional)
 * - pageSize: Number of results (default: 20)
 * - pageToken: Pagination token (optional)
 * 
 * Body:
 * - userId: User ID for personalization (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, userId, filters, pageSize, pageToken } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'query is required' },
        { status: 400 }
      );
    }

    const discoveryEngine = getDiscoveryEngineService();
    const flags = getFeatureFlags();
    
    // Check if Discovery Engine is available
    const isAvailable = discoveryEngine.isAvailable();
    
    if (!isAvailable) {
      // Discovery Engine not configured is expected - use debug log
      console.debug('[Discovery Engine API] Status check:', {
        isAvailable,
        useDiscoveryEngine: flags.useDiscoveryEngine,
        projectId: process.env.DISCOVERY_ENGINE_PROJECT_ID ? 'set' : 'missing',
        location: process.env.DISCOVERY_ENGINE_LOCATION ? 'set' : 'missing',
        dataStoreId: process.env.DISCOVERY_ENGINE_DATA_STORE_ID ? 'set' : 'missing',
      });
      console.debug('[Discovery Engine API] Discovery Engine is not available - returning 503 (expected fallback)');
      return NextResponse.json(
        { 
          error: 'Discovery Engine is not configured',
          fallback: true,
          source: 'fallback',
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
        // User not authenticated - continue without personalization
      }
    }

    // A/B testing: Check if user should use Discovery Engine or fallback
    let useDiscoveryEngine = flags.useDiscoveryEngine;
    if (finalUserId && flags.abTests.some((t) => t.name === 'search_quality' && t.enabled)) {
      const variant = getABTestVariant(finalUserId, 'search_quality');
      useDiscoveryEngine = variant === 'discovery_engine';
    }
    
    console.debug('[Discovery Engine API] Request:', {
      query,
      userId: finalUserId || 'anonymous',
      useDiscoveryEngine,
      pageSize: pageSize || 20,
    });

    // Generate cache key
    const cache = getDiscoveryEngineCache();
    const cacheKey = cache.generateSearchKey(query, filters || {}, finalUserId);

    // Perform search with caching and performance monitoring
    const searchStartTime = Date.now();
    const results = await withPerformanceMonitoring(
      '/api/search/discovery',
      'POST',
      () => withCache(
        cacheKey,
        () => discoveryEngine.search(query, {
          userId: finalUserId,
          pageSize: pageSize || 20,
          pageToken,
          filters: filters || {},
          boostSpec: [
            {
              condition: 'michelin_stars > 0',
              boost: 1.5,
            },
            {
              condition: 'rating >= 4.5',
              boost: 1.2,
            },
          ],
        }),
        5 * 60 * 1000 // 5 minute cache
      )
    );
    const searchElapsed = Date.now() - searchStartTime;

    console.log('[Discovery Engine API] Search completed:', {
      resultCount: results.results.length,
      totalSize: results.totalSize,
      elapsed: `${searchElapsed}ms`,
      source: 'discovery_engine',
      fallback: false,
    });

    // Track search event for personalization
    if (finalUserId) {
      discoveryEngine.trackEvent({
        userId: finalUserId,
        eventType: 'search',
        searchQuery: query,
      }).catch((error) => {
        console.warn('Failed to track search event:', error);
      });
    }

    return NextResponse.json({
      results: results.results,
      totalSize: results.totalSize,
      nextPageToken: results.nextPageToken,
      query,
      source: 'discovery_engine',
      fallback: false,
    });
  } catch (error: any) {
    console.error('Discovery Engine search error:', error);
    return NextResponse.json(
      { 
        error: 'Search failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/search/discovery
 * Search destinations using Google Discovery Engine (GET version)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const city = searchParams.get('city') || undefined;
    const category = searchParams.get('category') || undefined;
    const priceLevel = searchParams.get('priceLevel') ? parseInt(searchParams.get('priceLevel')!) : undefined;
    const minRating = searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : undefined;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 20;
    const pageToken = searchParams.get('pageToken') || undefined;
    const userId = searchParams.get('userId') || undefined;

    if (!query) {
      return NextResponse.json(
        { error: 'query parameter is required' },
        { status: 400 }
      );
    }

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
        // User not authenticated - continue without personalization
      }
    }

    const results = await discoveryEngine.search(query, {
      userId: finalUserId,
      pageSize,
      pageToken,
      filters: {
        city,
        category,
        priceLevel,
        minRating,
      },
      boostSpec: [
        {
          condition: 'michelin_stars > 0',
          boost: 1.5,
        },
        {
          condition: 'rating >= 4.5',
          boost: 1.2,
        },
      ],
    });

    // Track search event
    if (finalUserId) {
      discoveryEngine.trackEvent({
        userId: finalUserId,
        eventType: 'search',
        searchQuery: query,
      }).catch((error) => {
        console.warn('Failed to track search event:', error);
      });
    }

    return NextResponse.json({
      results: results.results,
      totalSize: results.totalSize,
      nextPageToken: results.nextPageToken,
      query,
    });
  } catch (error: any) {
    console.error('Discovery Engine search error:', error);
    return NextResponse.json(
      { 
        error: 'Search failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

