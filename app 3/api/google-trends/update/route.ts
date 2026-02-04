/**
 * API Route: Update Google Trends Data
 * Background job to fetch and update Google Trends data for destinations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { fetchBatchGoogleTrends } from '@/lib/google-trends';

export const maxDuration = 300; // 5 minutes for batch processing

export async function POST(request: NextRequest) {
  try {
    // Check for API key to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.GOOGLE_TRENDS_UPDATE_KEY;
    
    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { limit = 50, city, category } = body;

    const supabase = createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client not available' },
        { status: 500 }
      );
    }

    // Build query to get destinations that need updating
    let query = supabase
      .from('destinations')
      .select('id, name, city, category, google_trends_updated_at')
      .limit(limit);

    // Only update destinations that haven't been updated in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    query = query.or(`google_trends_updated_at.is.null,google_trends_updated_at.lt.${oneDayAgo}`);

    if (city) {
      query = query.eq('city', city);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data: destinations, error } = await query;

    if (error) {
      console.error('Error fetching destinations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch destinations', details: error.message },
        { status: 500 }
      );
    }

    if (!destinations || destinations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No destinations need updating',
        updated: 0,
      });
    }

    // Fetch Google Trends data for all destinations
    const trendsData = await fetchBatchGoogleTrends(
      destinations.map(d => ({
        id: d.id,
        name: d.name,
        city: d.city,
      }))
    );

    // Update destinations with Google Trends data
    let updatedCount = 0;
    const errors: string[] = [];

    for (const [destinationId, trendData] of trendsData.entries()) {
      try {
        const { error: updateError } = await supabase.rpc('update_google_trends', {
          destination_id_param: destinationId,
          interest_value: trendData.searchInterest,
          direction_value: trendData.trendDirection,
          related_queries_value: trendData.relatedQueries || null,
        });

        if (updateError) {
          errors.push(`Failed to update destination ${destinationId}: ${updateError.message}`);
        } else {
          updatedCount++;
        }
      } catch (error: any) {
        errors.push(`Error updating destination ${destinationId}: ${error.message}`);
      }
    }

    // Recompute trending scores with new Google Trends data
    try {
      const { error: computeError } = await supabase.rpc('compute_enhanced_trending_scores');
      if (computeError) {
        console.error('Error computing enhanced trending scores:', computeError);
      }
    } catch (error) {
      console.error('Error calling compute_enhanced_trending_scores:', error);
    }

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      total: destinations.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Error updating Google Trends:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

