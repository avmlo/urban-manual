import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { embedText } from '@/lib/llm';
import { rerankDestinations } from '@/lib/search/reranker';
import { generateSearchResponseContext } from '@/lib/search/generateSearchContext';
import { generateSuggestions } from '@/lib/search/generateSuggestions';
import { getUserLocation } from '@/lib/location/getUserLocation';
import { expandNearbyLocations, getLocationContext, findLocationByName } from '@/lib/search/expandLocations';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const city = searchParams.get('city');
  const category = searchParams.get('category');
  const openNow = searchParams.get('open_now') === 'true';

  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

  try {
    // Extract location from query if not explicitly provided
    let searchCity = city;
    let locationName: string | null = null;
    
    if (!searchCity) {
      // Try to find location in query
      const lowerQuery = query.toLowerCase();
      locationName = await findLocationByName(lowerQuery);
      if (locationName) {
        // Extract parent city from location if available
        const locationContext = await getLocationContext(locationName);
        // For now, use the location name itself as city filter
        // (destinations.city might match neighborhood names)
        searchCity = locationName;
      }
    } else {
      // If city is provided, check if it's actually a neighborhood
      locationName = await findLocationByName(searchCity);
    }

    // Generate embedding for search query
    const embedding = await embedText(query);

    if (!embedding) {
      return NextResponse.json({ error: 'Failed to generate embedding' }, { status: 500 });
    }

    // Intelligent search
    const { data: results, error } = await supabase.rpc(
      'search_destinations_intelligent',
      {
        query_embedding: `[${embedding.join(',')}]`,
        user_id_param: session?.user?.id || null,
        city_filter: searchCity,
        category_filter: category,
        open_now_filter: openNow,
        limit_count: 1000,
      }
    );

    if (error) {
      console.error('Search error:', error);
      throw error;
    }

    // If few results and we have a location, expand to nearby neighborhoods
    let expandedResults = results || [];
    let expandedLocations: string[] = [];
    
    if ((expandedResults.length < 5) && locationName) {
      const nearbyLocations = await expandNearbyLocations(locationName, 15);
      expandedLocations = nearbyLocations.slice(1); // Exclude original
      
      if (expandedLocations.length > 0) {
        // Re-search with expanded locations
        // We'll search each location and combine results
        const allExpandedResults: any[] = [];
        
        for (const nearbyLoc of expandedLocations) {
          const { data: nearbyResults } = await supabase.rpc(
            'search_destinations_intelligent',
            {
              query_embedding: `[${embedding.join(',')}]`,
              user_id_param: session?.user?.id || null,
              city_filter: nearbyLoc,
              category_filter: category,
              open_now_filter: openNow,
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
      query,
      queryIntent: {
        city: searchCity || undefined,
        category: category || undefined,
      },
      userId: session?.user?.id,
      boostPersonalized: !!session?.user?.id,
    });

    const limited = (rerankedResults || []).slice(0, 1000);
    const userLocation = await getUserLocation(request);
    
    // Generate context response (always ensure it's a string)
    let contextResponse: string = '';
    try {
      contextResponse = await generateSearchResponseContext({
        query,
        results: limited,
        filters: { openNow },
        userLocation: userLocation || undefined,
      }) || '';
      
      // Add nearby locations context if applicable
      if (expandedLocations.length > 0 && limited.length > 0) {
        const locationContext = locationName ? await getLocationContext(locationName) : null;
        if (locationContext) {
          const walkingTimes = expandedLocations
            .map(loc => {
              const time = locationContext.walking_time[loc];
              return time ? `${loc} (${time} min walk)` : loc;
            })
            .slice(0, 3); // Limit to 3 nearby mentions
          
          if (walkingTimes.length > 0) {
            const originalCount = (results || []).length;
            const additionalCount = limited.length - originalCount;
            if (additionalCount > 0) {
              contextResponse += ` Found ${additionalCount} more in nearby ${walkingTimes.join(', ')}.`;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error generating context response:', error);
      // Fallback to simple message
      contextResponse = `Found ${limited.length} ${limited.length === 1 ? 'place' : 'places'}.`;
    }
    
    // Generate suggestions (always ensure it's an array)
    let suggestions: Array<{ label: string; refinement: string }> = [];
    try {
      suggestions = await generateSuggestions({ 
        query, 
        results: limited, 
        filters: { openNow },
        refinements: [],
      }) || [];
    } catch (error) {
      console.error('Error generating suggestions:', error);
      // Fallback to empty array
      suggestions = [];
    }

    // Log search interaction (best-effort)
    try {
      await supabase.from('user_interactions').insert({
        interaction_type: 'search',
        user_id: session?.user?.id || null,
        destination_id: null,
        metadata: {
          query,
          filters: { city, category, openNow },
          count: limited.length,
          source: 'api/search/intelligent',
        }
      });
    } catch {}

    return NextResponse.json({
      results: limited,
      contextResponse,
      suggestions,
      meta: {
        query,
        filters: { city, category, openNow },
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
    console.error('Search error:', error);
    return NextResponse.json(
      { 
        error: 'Search failed', 
        details: error.message,
        results: [],
        contextResponse: 'Sorry, there was an error processing your search. Please try again.',
        suggestions: [],
      },
      { status: 500 }
    );
  }
}

