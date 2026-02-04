import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getDiscoveryEngineService } from '@/services/search/discovery-engine';

/**
 * GET /api/discovery/analytics
 * Get search analytics and insights
 * 
 * Query parameters:
 * - startDate: Start date (ISO string)
 * - endDate: End date (ISO string)
 * - metric: Specific metric to retrieve
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const metric = searchParams.get('metric');

    const supabase = await createServerClient();

    // Get analytics from user_interactions table
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = startDate;
    }
    if (endDate) {
      dateFilter.lte = endDate;
    }

    // Popular queries
    const { data: searchInteractions } = await supabase
      .from('user_interactions')
      .select('search_query, created_at')
      .eq('interaction_type', 'search')
      .not('search_query', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1000);

    // Popular destinations (views)
    const { data: viewInteractions } = await supabase
      .from('user_interactions')
      .select('destination_slug, created_at')
      .eq('interaction_type', 'view')
      .not('destination_slug', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1000);

    // Calculate metrics
    const popularQueries = calculatePopularQueries(searchInteractions || []);
    const popularDestinations = calculatePopularDestinations(viewInteractions || []);
    const searchTrends = calculateSearchTrends(searchInteractions || []);

    // Discovery Engine status
    const discoveryEngine = getDiscoveryEngineService();
    const isDiscoveryEngineAvailable = discoveryEngine.isAvailable();

    const analytics = {
      summary: {
        totalSearches: searchInteractions?.length || 0,
        totalViews: viewInteractions?.length || 0,
        discoveryEngineEnabled: isDiscoveryEngineAvailable,
        dateRange: {
          start: startDate || null,
          end: endDate || null,
        },
      },
      popularQueries: popularQueries.slice(0, 20),
      popularDestinations: popularDestinations.slice(0, 20),
      searchTrends,
      metrics: {
        averageResultsPerQuery: 15, // Placeholder
        clickThroughRate: 0.12, // Placeholder
        searchToSaveRate: 0.05, // Placeholder
      },
    };

    // Return specific metric if requested
    if (metric) {
      switch (metric) {
        case 'popular-queries':
          return NextResponse.json({ popularQueries: analytics.popularQueries });
        case 'popular-destinations':
          return NextResponse.json({ popularDestinations: analytics.popularDestinations });
        case 'trends':
          return NextResponse.json({ trends: analytics.searchTrends });
        case 'summary':
          return NextResponse.json({ summary: analytics.summary });
        default:
          return NextResponse.json({ error: 'Unknown metric' }, { status: 400 });
      }
    }

    return NextResponse.json(analytics);
  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get analytics',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate popular queries from search interactions
 */
function calculatePopularQueries(interactions: any[]): Array<{ query: string; count: number }> {
  const queryCounts: { [key: string]: number } = {};

  interactions.forEach((interaction: any) => {
    const query = interaction.search_query;
    if (query) {
      queryCounts[query] = (queryCounts[query] || 0) + 1;
    }
  });

  return Object.entries(queryCounts)
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Calculate popular destinations from view interactions
 */
function calculatePopularDestinations(interactions: any[]): Array<{ slug: string; count: number }> {
  const destinationCounts: { [key: string]: number } = {};

  interactions.forEach((interaction: any) => {
    const slug = interaction.destination_slug;
    if (slug) {
      destinationCounts[slug] = (destinationCounts[slug] || 0) + 1;
    }
  });

  return Object.entries(destinationCounts)
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Calculate search trends over time
 */
function calculateSearchTrends(interactions: any[]): Array<{ date: string; count: number }> {
  const dailyCounts: { [key: string]: number } = {};

  interactions.forEach((interaction: any) => {
    if (interaction.created_at) {
      const date = new Date(interaction.created_at).toISOString().split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    }
  });

  return Object.entries(dailyCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30); // Last 30 days
}

