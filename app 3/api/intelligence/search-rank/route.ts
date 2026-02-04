import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { searchRankingAlgorithm } from '@/services/intelligence/search-ranking';

/**
 * POST /api/intelligence/search-rank
 * Enhanced search ranking with Manual Score
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { results, query, intent, userId, weights } = await request.json();

    if (!results || !Array.isArray(results)) {
      return NextResponse.json(
        { error: 'results array is required' },
        { status: 400 }
      );
    }

    if (!query) {
      return NextResponse.json(
        { error: 'query is required' },
        { status: 400 }
      );
    }

    const ranked = await searchRankingAlgorithm.rankResults(
      results,
      query,
      userId || user?.id,
      intent,
      weights
    );

    return NextResponse.json({
      ranked: ranked.map((r) => ({
        ...r.destination,
        _ranking: {
          score: r.score,
          factors: r.factors,
          explanation: r.explanation,
        },
      })),
      count: ranked.length,
    });
  } catch (error: any) {
    console.error('Error ranking search results:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

