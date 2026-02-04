import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const includeGoogleTrends = searchParams.get('include_google_trends') === 'true';

    const supabase = await createServerClient();

    // Build query with enhanced filtering
    let query = supabase
      .from('destinations')
      .select(includeGoogleTrends 
        ? '*, google_trends_interest, google_trends_direction, google_trends_related_queries'
        : '*'
      )
      .gt('trending_score', 0)
      .gte('rating', 4.0);

    if (city) query = query.eq('city', city);
    if (category) query = query.eq('category', category);

    // Prioritize destinations with rising Google Trends
    const { data: trending, error } = await query
      .order('trending_score', { ascending: false })
      .order('google_trends_direction', { ascending: false }) // 'rising' comes before 'stable'/'falling'
      .order('google_trends_interest', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const response = NextResponse.json({
      trending: trending || [],
      meta: {
        filters: { city, category },
        count: trending?.length || 0,
        period: 'Past 14 days (enhanced with Google Trends)',
        includesGoogleTrends: includeGoogleTrends,
      },
    });

    // Add cache headers (5 minutes for trending data)
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    return response;
  } catch (e: any) {
    console.error('Trending error:', e);
    return NextResponse.json(
      { error: 'Failed to load trending', details: e.message },
      { status: 500 }
    );
  }
}


