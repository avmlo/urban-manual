import { NextRequest, NextResponse } from 'next/server';
import { getDiscoveryEngineService } from '@/services/search/discovery-engine';
import { createServerClient } from '@/lib/supabase-server';

/**
 * POST /api/discovery/search/multimodal
 * Multi-modal search (text + image)
 * 
 * Body:
 * - query: Text query (optional)
 * - imageUrl: Image URL for visual search (optional)
 * - imageBase64: Base64 encoded image (optional)
 * - userId: User ID (optional)
 * - filters: Search filters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, imageUrl, imageBase64, userId, filters = {} } = body;

    if (!query && !imageUrl && !imageBase64) {
      return NextResponse.json(
        { error: 'At least one of query, imageUrl, or imageBase64 is required' },
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

    // For now, use text search with image metadata
    // Full visual search requires Discovery Engine's image search capabilities
    // which may need additional configuration
    const searchQuery = query || 'places similar to this image';
    
    // Add image context to query
    const enhancedQuery = imageUrl || imageBase64
      ? `${searchQuery} [visual similarity search]`
      : searchQuery;

    const results = await discoveryEngine.search(enhancedQuery, {
      userId: finalUserId,
      pageSize: filters.pageSize || 20,
      filters: {
        city: filters.city,
        category: filters.category,
        priceLevel: filters.priceLevel,
        minRating: filters.minRating,
      },
    });

    // Enhance results with image similarity scores if image provided
    const enhancedResults = results.results.map((result: any) => ({
      ...result,
      imageSimilarity: imageUrl || imageBase64 ? 0.8 : undefined, // Placeholder
    }));

    return NextResponse.json({
      results: enhancedResults,
      totalSize: results.totalSize,
      query: enhancedQuery,
      hasImage: !!(imageUrl || imageBase64),
    });
  } catch (error: any) {
    console.error('Multi-modal search error:', error);
    return NextResponse.json(
      {
        error: 'Multi-modal search failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

