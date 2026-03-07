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
import { searchRatelimit, memorySearchRatelimit, getIdentifier, createRateLimitResponse, isUpstashConfigured } from '@/lib/rate-limit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('[Search Suggest] SUPABASE_SERVICE_ROLE_KEY is required');
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  // SECURITY: Apply rate limiting to this public endpoint that uses Service Role key
  const identifier = getIdentifier(request);
  const limiter = isUpstashConfigured() ? searchRatelimit : memorySearchRatelimit;
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    return createRateLimitResponse('Rate limit exceeded. Please try again later.', limit, remaining, reset);
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

    // Type definition for destination
    type Destination = {
      id: number;
      name: string;
      slug: string;
      city: string | null;
      country: string | null;
      category: string | null;
      image: string | null;
      michelin_stars: number | null;
    };

    const validDestinations = (destinations || []) as Destination[];

    // Group results by type for better UI
    const suggestions = {
      destinations: validDestinations,
      cities: Array.from(new Set(
        validDestinations
          .filter((d) => d.city?.toLowerCase().includes(query.toLowerCase()))
          .map((d) => JSON.stringify({ city: d.city, country: d.country }))
      )).slice(0, 5).map(s => JSON.parse(s)),
      categories: Array.from(new Set(
        validDestinations
          .filter((d) => d.category?.toLowerCase().includes(query.toLowerCase()))
          .map((d) => d.category)
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
