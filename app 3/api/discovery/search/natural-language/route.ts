import { NextRequest, NextResponse } from 'next/server';
import { getDiscoveryEngineService } from '@/services/search/discovery-engine';
import { createServerClient } from '@/lib/supabase-server';

/**
 * POST /api/discovery/search/natural-language
 * Natural language search with advanced filtering
 * Parses natural language queries like:
 * - "romantic restaurants with outdoor seating under $50"
 * - "museums open now near the Eiffel Tower"
 * - "cafes with wifi and good reviews"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, userId, pageSize = 20 } = body;

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

    // Parse natural language query for filters
    const parsedFilters = parseNaturalLanguageFilters(query);
    
    // Clean query (remove filter keywords)
    const cleanQuery = cleanNaturalLanguageQuery(query);

    // Perform search with parsed filters
    const results = await discoveryEngine.search(cleanQuery, {
      userId: finalUserId,
      pageSize,
      filters: parsedFilters,
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
        console.warn('Failed to track natural language search event:', error);
      });
    }

    return NextResponse.json({
      results: results.results,
      totalSize: results.totalSize,
      query: cleanQuery,
      parsedFilters,
      originalQuery: query,
    });
  } catch (error: any) {
    console.error('Natural language search error:', error);
    return NextResponse.json(
      {
        error: 'Natural language search failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Parse natural language query to extract filters
 */
function parseNaturalLanguageFilters(query: string): {
  city?: string;
  category?: string;
  priceLevel?: number;
  minRating?: number;
} {
  const filters: any = {};
  const lowerQuery = query.toLowerCase();

  // Price level detection
  if (lowerQuery.includes('under $') || lowerQuery.includes('cheap') || lowerQuery.includes('budget')) {
    filters.priceLevel = 2;
  } else if (lowerQuery.includes('affordable') || lowerQuery.includes('moderate')) {
    filters.priceLevel = 3;
  } else if (lowerQuery.includes('expensive') || lowerQuery.includes('fine dining') || lowerQuery.includes('luxury')) {
    filters.priceLevel = 4;
  }

  // Rating detection
  if (lowerQuery.includes('highly rated') || lowerQuery.includes('best') || lowerQuery.includes('top rated')) {
    filters.minRating = 4.5;
  } else if (lowerQuery.includes('good reviews') || lowerQuery.includes('well reviewed')) {
    filters.minRating = 4.0;
  }

  // Category detection (basic)
  const categoryKeywords: { [key: string]: string } = {
    restaurant: 'dining',
    cafe: 'dining',
    museum: 'culture',
    gallery: 'culture',
    park: 'outdoor',
    bar: 'nightlife',
    club: 'nightlife',
    hotel: 'accommodation',
  };

  for (const [keyword, category] of Object.entries(categoryKeywords)) {
    if (lowerQuery.includes(keyword)) {
      filters.category = category;
      break;
    }
  }

  // City detection (basic - would need more sophisticated NLP in production)
  const cityPatterns = [
    /\b(paris|tokyo|new york|london|berlin|rome|barcelona|amsterdam|vienna|prague)\b/i,
  ];

  for (const pattern of cityPatterns) {
    const match = query.match(pattern);
    if (match) {
      filters.city = match[1].toLowerCase();
      break;
    }
  }

  return filters;
}

/**
 * Clean natural language query by removing filter keywords
 */
function cleanNaturalLanguageQuery(query: string): string {
  // Remove common filter phrases
  const filterPhrases = [
    /\bunder \$\d+\b/gi,
    /\bcheap\b/gi,
    /\bbudget\b/gi,
    /\baffordable\b/gi,
    /\bexpensive\b/gi,
    /\bfine dining\b/gi,
    /\bluxury\b/gi,
    /\bhighly rated\b/gi,
    /\btop rated\b/gi,
    /\bgood reviews\b/gi,
    /\bwell reviewed\b/gi,
    /\bopen now\b/gi,
    /\bwith (wifi|parking|outdoor seating)\b/gi,
  ];

  let cleaned = query;
  for (const phrase of filterPhrases) {
    cleaned = cleaned.replace(phrase, '').trim();
  }

  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned || query; // Return original if cleaned is empty
}

