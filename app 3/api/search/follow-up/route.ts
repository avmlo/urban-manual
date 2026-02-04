import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { embedText } from '@/lib/llm';
import { rerankDestinations } from '@/lib/search/reranker';
import { generateSearchResponseContext } from '@/lib/search/generateSearchContext';
import { generateSuggestions } from '@/lib/search/generateSuggestions';
import { getUserLocation } from '@/lib/location/getUserLocation';
import { expandNearbyLocations, getLocationContext, findLocationByName } from '@/lib/search/expandLocations';

/**
 * POST /api/search/follow-up
 * 
 * Handles conversational follow-up queries that build on previous search context.
 * Combines the original query with the follow-up message for better understanding.
 * 
 * Request body:
 * {
 *   originalQuery: string;
 *   followUpMessage: string;
 *   conversationHistory?: Array<{role: 'user' | 'assistant', content: string}>;
 *   currentResults?: Array<{id: number}>; // Optional: current filtered results
 *   refinements?: string[]; // Optional: applied refinements so far
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      originalQuery,
      followUpMessage,
      conversationHistory = [],
      currentResults = [],
      refinements = [],
      intent = null, // Original intent from the first search
    } = body;

    if (!originalQuery || !followUpMessage) {
      return NextResponse.json(
        { error: 'originalQuery and followUpMessage are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();

    // Combine original query with follow-up for better context
    // If follow-up is a refinement (like "only open now"), combine it intelligently
    const combinedQuery = combineQueries(originalQuery, followUpMessage, refinements);

    // Generate embedding for the combined query
    const embedding = await embedText(combinedQuery);

    if (!embedding) {
      return NextResponse.json(
        { error: 'Failed to generate embedding' },
        { status: 500 }
      );
    }

    // Extract location and category from combined query
    let searchCity: string | undefined;
    let locationName: string | null = null;

    // Try to find location in the combined query
    const lowerQuery = combinedQuery.toLowerCase();
    locationName = await findLocationByName(lowerQuery);
    if (locationName) {
      searchCity = locationName;
    }

    // Fall back to intent city if not found in query
    if (!searchCity && intent?.city) {
      searchCity = intent.city;
      locationName = intent.city;
    }

    // Extract category from combined query (not just follow-up)
    // This preserves category context when user responds with budget/refinements
    let category = extractCategoryFromFollowUp(combinedQuery);

    // CRITICAL FIX: If no category found in combined query, use original intent category
    // This prevents "cheap" from losing the "hotel" context
    if (!category && intent?.category) {
      // Normalize intent category to match our database categories
      const categorySynonyms: Record<string, string> = {
        'restaurant': 'Restaurant',
        'dining': 'Restaurant',
        'hotel': 'Hotel',
        'cafe': 'Cafe',
        'bar': 'Bar',
        'museum': 'Culture',
        'gallery': 'Culture',
      };
      category = categorySynonyms[intent.category.toLowerCase()] || intent.category;
    }

    // Intelligent search
    const { data: results, error } = await supabase.rpc(
      'search_destinations_intelligent',
      {
        query_embedding: `[${embedding.join(',')}]`,
        user_id_param: session?.user?.id || null,
        city_filter: searchCity,
        category_filter: category,
        open_now_filter: isOpenNowRefinement(followUpMessage),
        limit_count: 1000,
      }
    );

    if (error) {
      console.error('Follow-up search error:', error);
      throw error;
    }

    // If few results and we have a location, expand to nearby neighborhoods
    let expandedResults = results || [];
    let expandedLocations: string[] = [];
    
    if ((expandedResults.length < 5) && locationName) {
      const nearbyLocations = await expandNearbyLocations(locationName, 15);
      expandedLocations = nearbyLocations.slice(1);
      
      if (expandedLocations.length > 0) {
        const allExpandedResults: any[] = [];
        
        for (const nearbyLoc of expandedLocations) {
          const { data: nearbyResults } = await supabase.rpc(
            'search_destinations_intelligent',
            {
              query_embedding: `[${embedding.join(',')}]`,
              user_id_param: session?.user?.id || null,
              city_filter: nearbyLoc,
              category_filter: category,
              open_now_filter: isOpenNowRefinement(followUpMessage),
              limit_count: 1000,
            }
          );
          
          if (nearbyResults) {
            allExpandedResults.push(...nearbyResults);
          }
        }
        
        // Combine original + expanded, deduplicate by slug
        const seen = new Set((expandedResults || []).map((r: any) => r.slug));
        for (const result of allExpandedResults) {
          if (!seen.has(result.slug)) {
            expandedResults.push(result);
            seen.add(result.slug);
          }
        }
      }
    }

    // Apply enhanced re-ranking
    const rerankedResults = rerankDestinations(expandedResults, {
      query: combinedQuery,
      queryIntent: {
        city: searchCity || undefined,
        category: category || undefined,
      },
      userId: session?.user?.id,
      boostPersonalized: !!session?.user?.id,
    });

    const limited = (rerankedResults || []).slice(0, 1000);
    const userLocation = await getUserLocation(request);
    
    // Generate contextual response
    let contextResponse = await generateSearchResponseContext({
      query: combinedQuery,
      results: limited,
      filters: {
        openNow: isOpenNowRefinement(followUpMessage),
      },
      userLocation: userLocation || undefined,
    });
    
    // Add nearby locations context if applicable
    if (expandedLocations.length > 0 && limited.length > 0) {
      const locationContext = locationName ? await getLocationContext(locationName) : null;
      if (locationContext) {
        const walkingTimes = expandedLocations
          .map(loc => {
            const time = locationContext.walking_time[loc];
            return time ? `${loc} (${time} min walk)` : loc;
          })
          .slice(0, 3);
        
        if (walkingTimes.length > 0) {
          const originalCount = (results || []).length;
          const additionalCount = limited.length - originalCount;
          if (additionalCount > 0) {
            contextResponse += ` Found ${additionalCount} more in nearby ${walkingTimes.join(', ')}.`;
          }
        }
      }
    }

    const suggestions = await generateSuggestions({
      query: combinedQuery,
      results: limited,
      filters: {
        openNow: isOpenNowRefinement(followUpMessage),
      },
    });

    // Log search interaction
    try {
      await supabase.from('user_interactions').insert({
        interaction_type: 'search',
        user_id: session?.user?.id || null,
        destination_id: null,
        metadata: {
          query: combinedQuery,
          originalQuery,
          followUpMessage,
          refinements: [...refinements, followUpMessage],
          count: limited.length,
          source: 'api/search/follow-up',
        }
      });
    } catch {}

    return NextResponse.json({
      results: limited,
      contextResponse,
      suggestions,
      meta: {
        query: combinedQuery,
        originalQuery,
        followUpMessage,
        refinements: [...refinements, followUpMessage],
        filters: { city: searchCity, category, openNow: isOpenNowRefinement(followUpMessage) },
        count: limited.length,
        reranked: true,
      },
      userLocation: userLocation
        ? {
            city: userLocation.city,
            timezone: userLocation.timezone,
          }
        : undefined,
    });
  } catch (error: any) {
    console.error('Follow-up search error:', error);
    return NextResponse.json(
      { error: 'Follow-up search failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Intelligently combine original query with follow-up message
 */
function combineQueries(
  originalQuery: string,
  followUp: string,
  refinements: string[]
): string {
  const lower = followUp.toLowerCase().trim();
  
  // If follow-up is a refinement (like "only open now", "with terrace", "under $50")
  // combine it with the original query
  if (
    lower.includes('only') ||
    lower.includes('just') ||
    lower.includes('with') ||
    lower.includes('under') ||
    lower.includes('over') ||
    lower.includes('cheap') ||
    lower.includes('luxury')
  ) {
    return `${originalQuery} ${followUp}`;
  }
  
  // If follow-up is a question or clarification, use it as the new query
  if (lower.includes('?') || lower.includes('what') || lower.includes('where') || lower.includes('show')) {
    // Combine with original for context
    return `${originalQuery}. ${followUp}`;
  }
  
  // Otherwise, treat as a refinement
  return `${originalQuery} ${followUp}`;
}

/**
 * Extract category from follow-up message
 */
function extractCategoryFromFollowUp(followUp: string): string | undefined {
  const lower = followUp.toLowerCase();
  const categoryMap: Record<string, string> = {
    'restaurant': 'Restaurant',
    'hotel': 'Hotel',
    'cafe': 'Cafe',
    'bar': 'Bar',
    'museum': 'Culture',
    'gallery': 'Culture',
  };
  
  for (const [key, value] of Object.entries(categoryMap)) {
    if (lower.includes(key)) {
      return value;
    }
  }
  
  return undefined;
}

/**
 * Check if follow-up message is requesting "open now" filter
 */
function isOpenNowRefinement(followUp: string): boolean {
  const lower = followUp.toLowerCase();
  return (
    lower.includes('open now') ||
    lower.includes('open right now') ||
    lower.includes('currently open') ||
    lower.includes('open today')
  );
}
