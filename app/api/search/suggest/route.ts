/**
 * Search Suggest API Route
 * 
 * GET /api/search/suggest?q=paris
 * 
 * Fast typeahead suggestions using keyword matching.
 * Returns destination names, cities, and categories that match the query.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withErrorHandling } from '@/lib/errors';
import { sanitizeForIlike } from '@/lib/sanitize';
import {
  searchRatelimit,
  memorySearchRatelimit,
  enforceRateLimit,
} from '@/lib/rate-limit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('[Search Suggest] SUPABASE_SERVICE_ROLE_KEY is required');
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  // Rate limiting (IP-based as this is a public endpoint)
  const rateLimitResponse = await enforceRateLimit({
    request,
    userId: null, // Public endpoint, use IP
    message: 'Too many search requests',
    limiter: searchRatelimit,
    memoryLimiter: memorySearchRatelimit,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (!supabaseKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Sanitize query to prevent SQL injection via ILIKE wildcards
    const safeQuery = sanitizeForIlike(query);

    // Fast keyword search on name, city, and category
    // Using PostgreSQL's ILIKE for case-insensitive matching
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('id, name, slug, city, country, category, image, michelin_stars')
      .or(`name.ilike.%${safeQuery}%,city.ilike.%${safeQuery}%,category.ilike.%${safeQuery}%`)
      .order('popularity_score', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch suggestions' },
        { status: 500 }
      );
    }

    // Group results by type for better UI
    const suggestions = {
      destinations: destinations || [],
      cities: Array.from(new Set(
        (destinations || [])
          .filter((d: any) => d.city?.toLowerCase().includes(query.toLowerCase()))
          .map((d: any) => ({ city: d.city, country: d.country }))
      )).slice(0, 5),
      categories: Array.from(new Set(
        (destinations || [])
          .filter((d: any) => d.category?.toLowerCase().includes(query.toLowerCase()))
          .map((d: any) => d.category)
      )).slice(0, 5),
    };

    return NextResponse.json({
      query,
      suggestions,
      total: destinations?.length || 0,
    });

  } catch (error) {
    console.error('Suggest API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
