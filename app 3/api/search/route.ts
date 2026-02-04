import { NextRequest, NextResponse } from 'next/server';
import { embedText } from '@/lib/llm';
import {
  searchRatelimit,
  memorySearchRatelimit,
  getIdentifier,
  createRateLimitResponse,
  isUpstashConfigured,
} from '@/lib/rate-limit';
import { createServerClient } from '@/lib/supabase/server';

// Generate embedding for a query using OpenAI embeddings via provider-agnostic helper
async function generateEmbedding(query: string): Promise<number[] | null> {
  try {
    const embedding = await embedText(query);
    return embedding || null;
  } catch (error) {
    console.error('[Search API] Error generating embedding:', error);
    return null;
  }
}

// AI-powered query understanding (kept for filter extraction)
async function understandQuery(query: string): Promise<{
  keywords: string[];
  city?: string;
  category?: string;
  brand?: string;
  filters?: {
    openNow?: boolean;
    priceLevel?: number;
    rating?: number;
    michelinStar?: number;
  };
}> {
  // For now, prefer lightweight, deterministic parsing to avoid external deps
  return parseQueryFallback(query);
}

// Fallback parser if AI is unavailable
function parseQueryFallback(query: string): {
  keywords: string[];
  city?: string;
  category?: string;
  brand?: string;
  filters?: any;
} {
  const lowerQuery = query.toLowerCase();
  const words = query.split(/\s+/);

  const cities = ['tokyo', 'paris', 'new york', 'london', 'rome', 'barcelona', 'berlin', 'amsterdam', 'sydney', 'dubai'];
  const categories = ['restaurant', 'cafe', 'hotel', 'bar', 'shop', 'museum', 'park', 'temple', 'shrine'];

  // Common hotel/restaurant brands
  const brands = [
    'aman', 'four seasons', 'ritz-carlton', 'ritz carlton', 'mandarin oriental',
    'peninsula', 'park hyatt', 'rosewood', 'bulgari', 'belmond',
    'six senses', 'one&only', 'shangri-la', 'st regis', 'raffles',
    'como', 'w hotels', 'edition', 'soho house', 'ace hotel',
    'marriott', 'hilton', 'hyatt', 'intercontinental', 'fairmont'
  ];

  let city: string | undefined;
  let category: string | undefined;
  let brand: string | undefined;
  const keywords: string[] = [];

  for (const cityName of cities) {
    if (lowerQuery.includes(cityName)) {
      city = cityName;
      break;
    }
  }

  for (const cat of categories) {
    if (lowerQuery.includes(cat)) {
      category = cat;
      break;
    }
  }

  // Check for brand names in query
  for (const brandName of brands) {
    if (lowerQuery.includes(brandName)) {
      brand = brandName;
      break;
    }
  }

  for (const word of words) {
    const lowerWord = word.toLowerCase();
    if (!city?.includes(lowerWord) && !category?.includes(lowerWord) && !brand?.includes(lowerWord)) {
      if (word.length > 2) {
        keywords.push(word);
      }
    }
  }

  return { keywords, city, category, brand };
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  try {
    const body = await request.json();
    const { query, filters = {}, userId, session_token } = body;
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();
    const PAGE_SIZE = 10;

    // Try to get userId from cookies/auth if not provided
    let authenticatedUserId = userId || supabaseUser?.id;

    // Rate limiting: 20 requests per 10 seconds for search
    const identifier = getIdentifier(request, authenticatedUserId);
    const ratelimit = isUpstashConfigured() ? searchRatelimit : memorySearchRatelimit;
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

    if (!success) {
      return createRateLimitResponse(
        'Too many search requests. Please wait a moment.',
        limit,
        remaining,
        reset
      );
    }
    let conversationContext: any = null;

    // Get conversation context if available
    try {
      const { getOrCreateSession } = await import('@/app/api/conversation/utils/contextHandler');
      const session = await getOrCreateSession(authenticatedUserId, session_token);
      if (session) {
        conversationContext = session.context;
      }
    } catch {
      // Context is optional
    }

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ 
        results: [], 
        searchTier: 'basic',
        error: 'Query too short' 
      });
    }

    // Extract structured filters using AI (with conversation context)
    const intent = await understandQuery(query);
    
    // Enhance intent with conversation context if available
    if (conversationContext) {
      if (conversationContext.city && !intent.city) intent.city = conversationContext.city;
      if (conversationContext.category && !intent.category) intent.category = conversationContext.category;
      if (conversationContext.brand && !intent.brand) intent.brand = conversationContext.brand;
      if (conversationContext.mood) {
        intent.filters = intent.filters || {};
        // Map mood to search filters (could enhance further)
      }
    }
    
    // Map category synonyms to database categories
    const categorySynonyms: Record<string, string> = {
      'restaurant': 'Restaurant',
      'dining': 'Restaurant',
      'food': 'Restaurant',
      'eat': 'Restaurant',
      'meal': 'Restaurant',
      'hotel': 'Hotel',
      'stay': 'Hotel',
      'accommodation': 'Hotel',
      'lodging': 'Hotel',
      'cafe': 'Cafe',
      'coffee': 'Cafe',
      'bar': 'Bar',
      'drink': 'Bar',
      'cocktail': 'Bar',
      'nightlife': 'Bar',
      'culture': 'Culture',
      'museum': 'Culture',
      'art': 'Culture',
      'gallery': 'Culture'
    };
    
    // Normalize category
    if (intent.category) {
      const normalized = categorySynonyms[intent.category.toLowerCase()];
      if (normalized) {
        intent.category = normalized;
      }
    }
    
    console.log('[Search API] Query:', query, 'Intent:', JSON.stringify(intent, null, 2));

    // Generate embedding for vector search
    const queryEmbedding = await generateEmbedding(query);

    let results: any[] = [];
    let searchTier = 'basic';

    // Strategy 1: Vector similarity search (if embeddings available)
    if (queryEmbedding) {
      try {
        const { data: vectorResults, error: vectorError } = await supabase.rpc('match_destinations', {
          query_embedding: queryEmbedding,
          match_threshold: 0.7, // Cosine similarity threshold
          match_count: PAGE_SIZE,
          filter_city: intent.city || filters.city || null,
          filter_category: intent.category || filters.category || null,
          filter_michelin_stars: intent.filters?.michelinStar || filters.michelinStar || null,
          filter_min_rating: intent.filters?.rating || filters.rating || null,
          filter_max_price_level: intent.filters?.priceLevel || filters.priceLevel || null,
          filter_brand: intent.brand || filters.brand || null,
          search_query: query // For full-text search ranking boost
        });

        if (!vectorError && vectorResults && vectorResults.length > 0) {
          results = vectorResults;
          searchTier = 'vector-semantic';
          console.log('[Search API] Vector search found', results.length, 'results');
        } else if (vectorError) {
          // If function doesn't exist or embeddings not ready, silently fall through to next strategy
          if (vectorError.code === '42883' || vectorError.message?.includes('does not exist') || 
              vectorError.message?.includes('embedding') || vectorError.code === 'P0001') {
            console.log('[Search API] Vector search not available (embeddings may not be generated yet), using fallback');
          } else {
            console.error('[Search API] Vector search error:', vectorError);
          }
        }
      } catch (error: any) {
        // Handle gracefully if vector search isn't ready
        if (error.message?.includes('match_destinations') || error.message?.includes('embedding')) {
          console.log('[Search API] Vector search not available, using fallback');
        } else {
          console.error('[Search API] Vector search exception:', error);
        }
      }
    }

    // Strategy 2: Full-text search on search_text column (if vector search didn't return results or as fallback)
    if (results.length === 0) {
      try {
        let fullTextQuery = supabase
          .from('destinations')
          .select('slug, name, city, category, micro_description, description, content, image, michelin_stars, crown, rating, price_level, brand')
          .limit(PAGE_SIZE);

        // Full-text search - use ILIKE on search_text as fallback (textSearch requires tsvector column)
        // If search_text column exists but no tsvector, use pattern matching
        fullTextQuery = fullTextQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%,content.ilike.%${query}%,search_text.ilike.%${query}%`);

        // Apply filters
        if (intent.city || filters.city) {
          const cityFilter = intent.city || filters.city;
          fullTextQuery = fullTextQuery.ilike('city', `%${cityFilter}%`);
        }

        if (intent.category || filters.category) {
          const categoryFilter = intent.category || filters.category;
          fullTextQuery = fullTextQuery.ilike('category', `%${categoryFilter}%`);
        }

        if (intent.brand || filters.brand) {
          const brandFilter = intent.brand || filters.brand;
          fullTextQuery = fullTextQuery.ilike('brand', `%${brandFilter}%`);
        }

        if (intent.filters?.rating || filters.rating) {
          fullTextQuery = fullTextQuery.gte('rating', intent.filters?.rating || filters.rating);
        }

        if (intent.filters?.priceLevel || filters.priceLevel) {
          fullTextQuery = fullTextQuery.lte('price_level', intent.filters?.priceLevel || filters.priceLevel);
        }

        if (intent.filters?.michelinStar || filters.michelinStar) {
          fullTextQuery = fullTextQuery.gte('michelin_stars', intent.filters?.michelinStar || filters.michelinStar);
        }

        const { data: fullTextResults, error: fullTextError } = await fullTextQuery;

        if (!fullTextError && fullTextResults) {
          results = fullTextResults;
          searchTier = 'fulltext';
          console.log('[Search API] Full-text search found', results.length, 'results');
        } else if (fullTextError) {
          console.error('[Search API] Full-text search error:', fullTextError);
        }
      } catch (error) {
        console.error('[Search API] Full-text search exception:', error);
      }
    }

    // Strategy 3: AI field search (vibe_tags, keywords, search_keywords) if still no results
    if (results.length === 0) {
      try {
        const { data: aiFieldResults, error: aiFieldError } = await supabase.rpc('search_by_ai_fields', {
          search_term: query,
          match_count: PAGE_SIZE
        });

        if (!aiFieldError && aiFieldResults && aiFieldResults.length > 0) {
          // Fetch full destination data for AI field matches
          const slugs = aiFieldResults.map((r: any) => r.slug);
          const { data: fullData } = await supabase
            .from('destinations')
            .select('slug, name, city, category, micro_description, description, content, image, michelin_stars, crown, rating, price_level, brand')
            .in('slug', slugs)
            .limit(PAGE_SIZE);

          if (fullData) {
            // Preserve similarity order from AI field search
            const orderedResults = slugs
              .map((slug: string) => fullData.find((d: any) => d.slug === slug))
              .filter(Boolean);
            
            results = orderedResults;
            searchTier = 'ai-fields';
            console.log('[Search API] AI field search found', results.length, 'results');
          }
        } else if (aiFieldError) {
          // Handle gracefully if function doesn't exist
          if (aiFieldError.code === '42883' || aiFieldError.message?.includes('does not exist')) {
            console.log('[Search API] AI field search function not available, using fallback');
          } else {
            console.error('[Search API] AI field search error:', aiFieldError);
          }
        }
      } catch (error: any) {
        // Handle gracefully if RPC doesn't exist
        if (error.message?.includes('search_by_ai_fields') || error.code === '42883') {
          console.log('[Search API] AI field search not available, using fallback');
        } else {
          console.error('[Search API] AI field search exception:', error);
        }
      }
    }

    // Strategy 4: Fallback to keyword matching (original method)
    if (results.length === 0) {
      let fallbackQuery = supabase
        .from('destinations')
        .select('slug, name, city, category, micro_description, description, content, image, michelin_stars, crown, rating, price_level, brand')
        .limit(PAGE_SIZE);

      // Apply filters
      if (intent.city || filters.city) {
        const cityFilter = intent.city || filters.city;
        fallbackQuery = fallbackQuery.ilike('city', `%${cityFilter}%`);
      }

      if (intent.category || filters.category) {
        const categoryFilter = intent.category || filters.category;
        fallbackQuery = fallbackQuery.ilike('category', `%${categoryFilter}%`);
      }

      if (intent.brand || filters.brand) {
        const brandFilter = intent.brand || filters.brand;
        fallbackQuery = fallbackQuery.ilike('brand', `%${brandFilter}%`);
      }

      // Keyword matching
      if (intent.keywords && intent.keywords.length > 0) {
        const conditions: string[] = [];
        for (const keyword of intent.keywords) {
          conditions.push(`name.ilike.%${keyword}%`);
          conditions.push(`description.ilike.%${keyword}%`);
          conditions.push(`content.ilike.%${keyword}%`);
        }
        if (conditions.length > 0) {
          fallbackQuery = fallbackQuery.or(conditions.join(','));
        }
      } else {
        fallbackQuery = fallbackQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%,content.ilike.%${query}%`);
      }

      if (intent.filters?.rating || filters.rating) {
        fallbackQuery = fallbackQuery.gte('rating', intent.filters?.rating || filters.rating);
      }

      if (intent.filters?.priceLevel || filters.priceLevel) {
        fallbackQuery = fallbackQuery.lte('price_level', intent.filters?.priceLevel || filters.priceLevel);
      }

      if (intent.filters?.michelinStar || filters.michelinStar) {
        fallbackQuery = fallbackQuery.gte('michelin_stars', intent.filters?.michelinStar || filters.michelinStar);
      }

      const { data: fallbackResults, error: fallbackError } = await fallbackQuery;

      if (!fallbackError && fallbackResults) {
        results = fallbackResults;
        searchTier = 'keyword';
        console.log('[Search API] Keyword search found', results.length, 'results');
      }
    }

    // Get personalized recommendations for user (if authenticated)
    let personalizedScores: Map<number, number> = new Map();
    if (authenticatedUserId) {
      try {
        const { AIRecommendationEngine } = await import('@/lib/ai-recommendations/engine');
        const engine = new AIRecommendationEngine(authenticatedUserId);
        const recommendations = await engine.getCachedRecommendations(50);

        recommendations.forEach(rec => {
          personalizedScores.set(rec.destinationId, rec.score);
        });
      } catch (error) {
        // Silently fail - personalization is optional
        console.log('[Search] Could not fetch personalized scores:', error);
      }
    }

    // Rank and sort results
    const lowerQuery = query.toLowerCase();
    const rankedResults = results
      .map((dest: any) => {
        let score = dest.similarity || dest.rank || 0;
        const lowerName = (dest.name || '').toLowerCase();
        const lowerDesc = (dest.description || '').toLowerCase();
        const lowerCategory = (dest.category || '').toLowerCase();

        // Boost for exact matches
        if (lowerName.includes(lowerQuery)) score += 0.2;
        if (lowerDesc.includes(lowerQuery)) score += 0.1;

        // Boost for category match
        if (intent.category && lowerCategory.includes(intent.category.toLowerCase())) {
          score += 0.15;
        }

        // Boost for city match
        if (intent.city && dest.city && dest.city.toLowerCase().includes(intent.city.toLowerCase())) {
          score += 0.1;
        }

        // Boost for Michelin stars
        if (dest.michelin_stars) score += dest.michelin_stars * 0.05;

        // Boost for high ratings
        if (dest.rating && dest.rating >= 4.5) score += 0.05;

        // Boost personalized recommendations (strong boost)
        const personalizationScore = personalizedScores.get(dest.id);
        if (personalizationScore) {
          score += personalizationScore * 0.3; // 30% boost from personalization
        }

        return { ...dest, _score: score };
      })
      .sort((a: any, b: any) => b._score - a._score)
      .slice(0, PAGE_SIZE)
      .map(({ _score, similarity, rank, ...rest }: any) => rest);

    // Generate suggestions
    const suggestions: string[] = [];
    if (intent.city && !intent.category) {
      suggestions.push(`Try "best restaurants in ${intent.city}"`);
      suggestions.push(`Try "top cafes in ${intent.city}"`);
    }
    if (intent.category && !intent.city) {
      suggestions.push(`Try "best ${intent.category}s in Tokyo"`);
      suggestions.push(`Try "best ${intent.category}s in Paris"`);
    }

    // Generate AI insight banner if conversation context exists
    let aiInsightBanner: string | null = null;
    if (conversationContext && (conversationContext.city || conversationContext.category)) {
      const contextParts: string[] = [];
      if (conversationContext.city) contextParts.push(conversationContext.city);
      if (conversationContext.category) contextParts.push(conversationContext.category);
      if (conversationContext.mood) contextParts.push(conversationContext.mood);
      aiInsightBanner = `Tailored for ${contextParts.join(', ')}`;
    }

    // Log search interaction (best-effort)
    if (authenticatedUserId) {
      try {
        await supabase.from('user_interactions').insert({
          interaction_type: 'search',
          user_id: authenticatedUserId,
          destination_id: null,
          metadata: {
            query,
            intent,
            count: rankedResults.length,
            source: 'api/search',
          }
        });
      } catch {}
    }

    return NextResponse.json({
      results: rankedResults,
      searchTier: searchTier,
      conversationContext: conversationContext || undefined,
      aiInsightBanner: aiInsightBanner || undefined,
      intent,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    });

  } catch (error: any) {
    console.error('Search API error:', error);
    return NextResponse.json({
      results: [],
      searchTier: 'basic',
      error: error.message || 'Search failed',
    }, { status: 500 });
  }
}