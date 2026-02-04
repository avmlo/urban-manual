import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getSeasonalContext, getAllSeasonalEvents } from '@/services/seasonality';

/**
 * GET /api/account/insights
 * Get travel insights: upcoming peak windows, visited vs wishlist stats, taste alignment
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's saved and visited places using RPC functions for better joins
    const [savedResult, visitedResult, profileResult] = await Promise.all([
      supabase.rpc('get_user_saved_destinations', { target_user_id: user.id }),
      supabase.rpc('get_user_visited_destinations', { target_user_id: user.id }),
      supabase
        .from('user_profiles')
        .select('favorite_cities, favorite_categories, interests, travel_style')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    // Handle errors gracefully - tables might not exist or RLS might block
    const saved = savedResult.error ? [] : (savedResult.data || []);
    const visited = visitedResult.error ? [] : (visitedResult.data || []);
    const profile = profileResult.error ? null : profileResult.data;

    // Get favorite cities
    const favoriteCities = profile?.favorite_cities || [];
    const savedCities = Array.from(new Set(saved.map((s: any) => s.city).filter(Boolean)));
    const visitedCities = Array.from(new Set(visited.map((v: any) => v.city).filter(Boolean)));
    
    // Get upcoming peak windows for favorite cities
    const upcomingPeakWindows: Array<{
      city: string;
      event: string;
      text: string;
      start: string;
      end: string;
    }> = [];

    const allCities = Array.from(new Set([...favoriteCities, ...savedCities, ...visitedCities]));
    
    for (const city of allCities.slice(0, 10)) {
      const context = getSeasonalContext(city);
      if (context) {
        const now = new Date();
        // Only show upcoming or current events
        if (new Date(context.start) >= now || (new Date(context.start) <= now && new Date(context.end) >= now)) {
          upcomingPeakWindows.push({
            city,
            event: context.event,
            text: context.text,
            start: context.start.toISOString(),
            end: context.end.toISOString(),
          });
        }
      }
    }

    // Category stats
    const visitedByCategory: Record<string, number> = {};
    const savedByCategory: Record<string, number> = {};

    visited.forEach((v: any) => {
      const category = v.category || 'Other';
      visitedByCategory[category] = (visitedByCategory[category] || 0) + 1;
    });

    saved.forEach((s: any) => {
      const category = s.category || 'Other';
      savedByCategory[category] = (savedByCategory[category] || 0) + 1;
    });

    // Taste alignment - analyze visited places tags vs user interests
    const userInterests = profile?.interests || [];
    const visitedTags: Record<string, number> = {};
    
    // Collect tags from visited destinations
    visited.forEach((v: any) => {
      const tags = v.tags || [];
      tags.forEach((tag: string) => {
        const tagLower = tag.toLowerCase();
        visitedTags[tagLower] = (visitedTags[tagLower] || 0) + 1;
      });
    });

    // Also collect tags from saved destinations for broader analysis
    const savedTags: Record<string, number> = {};
    saved.forEach((s: any) => {
      const tags = s.tags || [];
      tags.forEach((tag: string) => {
        const tagLower = tag.toLowerCase();
        savedTags[tagLower] = (savedTags[tagLower] || 0) + 1;
      });
    });

    // Combine tags for taste alignment analysis
    const allTags = { ...visitedTags, ...savedTags };

    const tasteAlignment: Array<{ interest: string; percentage: number }> = [];
    userInterests.forEach((interest: string) => {
      const matchingTags = Object.keys(allTags).filter(tag => 
        tag.includes(interest.toLowerCase()) || interest.toLowerCase().includes(tag)
      );
      const matchCount = matchingTags.reduce((sum, tag) => sum + allTags[tag], 0);
      const totalDestinations = visited.length + saved.length;
      const percentage = totalDestinations > 0 ? Math.round((matchCount / totalDestinations) * 100) : 0;
      tasteAlignment.push({ interest, percentage });
    });

    // Calculate top tags from all destinations
    const allTagCounts: Record<string, number> = {};
    [...saved, ...visited].forEach((item: any) => {
      const tags = item.tags || [];
      tags.forEach((tag: string) => {
        allTagCounts[tag] = (allTagCounts[tag] || 0) + 1;
      });
    });
    
    const topTags = Object.entries(allTagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    return NextResponse.json({
      upcomingPeakWindows: upcomingPeakWindows.slice(0, 5),
      visitedByCategory,
      savedByCategory,
      tasteAlignment,
      topTags,
      stats: {
        totalSaved: saved.length,
        totalVisited: visited.length,
        citiesExplored: visitedCities.length,
        citiesSaved: savedCities.length,
      },
    });
  } catch (error: any) {
    console.error('Insights API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
