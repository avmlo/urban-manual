import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Enhanced Hybrid Recommendations API
 * Combines:
 * - Collaborative Filtering (from ML service)
 * - Content-Based (from existing logic)
 * - AI Recommendations (Gemini)
 * 
 * POST /api/recommendations/hybrid
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, limit = 20, exclude_visited = true, exclude_saved = true } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const results: Array<{
      destination_id: number;
      slug: string;
      name: string;
      city: string;
      category: string;
      score: number;
      reason: string;
      source: 'collaborative' | 'content' | 'ai' | 'popularity';
    }> = [];

    // 1. Try to get collaborative filtering recommendations from ML service
    let collaborativeRecs: any[] = [];
    try {
      const mlResponse = await fetch(`${ML_SERVICE_URL}/api/recommendations/collaborative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id,
          top_n: Math.floor(limit * 0.4), // 40% from CF
          exclude_visited,
          exclude_saved,
        }),
      });

      if (mlResponse.ok) {
        const mlData = await mlResponse.json();
        collaborativeRecs = (mlData.recommendations || []).map((rec: any) => ({
          destination_id: rec.destination_id,
          slug: rec.slug,
          name: rec.name,
          city: rec.city,
          category: rec.category,
          score: rec.score * 0.6, // Weight CF at 60%
          reason: rec.reason || 'Users with similar preferences also liked this',
          source: 'collaborative' as const,
        }));
      }
    } catch (error) {
      console.warn('ML service unavailable, skipping collaborative filtering:', error);
    }

    // 2. Get content-based recommendations (from existing logic)
    const { data: savedPlaces } = await supabase
      .from('saved_places')
      .select('destination_slug')
      .eq('user_id', user_id)
      .limit(10);

    const savedSlugs = (savedPlaces || []).map((sp: any) => sp.destination_slug);

    // Get destinations similar to saved ones
    let contentRecs: any[] = [];
    if (savedSlugs.length > 0) {
      const { data: savedDests } = await supabase
        .from('destinations')
        .select('id, slug, name, city, category, tags')
        .in('slug', savedSlugs)
        .limit(5);

      if (savedDests && savedDests.length > 0) {
        // Find destinations with similar tags/categories
        const categories = [...new Set(savedDests.map((d: any) => d.category))];
        const tags = savedDests.flatMap((d: any) => d.tags || []).filter(Boolean);

        const { data: similarDests } = await supabase
          .from('destinations')
          .select('id, slug, name, city, category')
          .in('category', categories)
          .not('slug', 'in', `(${savedSlugs.map((s: string) => `"${s}"`).join(',')})`)
          .limit(Math.floor(limit * 0.3)); // 30% from content

        contentRecs = (similarDests || []).map((dest: any) => ({
          destination_id: dest.id,
          slug: dest.slug,
          name: dest.name,
          city: dest.city,
          category: dest.category,
          score: 0.3, // Weight content at 30%
          reason: 'Similar to places you saved',
          source: 'content' as const,
        }));
      }
    }

    // 3. Get popular destinations as fallback (10%)
    const { data: popularDests } = await supabase
      .from('destinations')
      .select('id, slug, name, city, category, saves_count, visits_count')
      .order('saves_count', { ascending: false })
      .order('visits_count', { ascending: false })
      .limit(Math.floor(limit * 0.1));

    const popularRecs = (popularDests || []).map((dest: any) => ({
      destination_id: dest.id,
      slug: dest.slug,
      name: dest.name,
      city: dest.city,
      category: dest.category,
      score: 0.1, // Weight popularity at 10%
      reason: 'Popular destination',
      source: 'popularity' as const,
    }));

    // Combine and deduplicate
    const allRecs = [...collaborativeRecs, ...contentRecs, ...popularRecs];
    const uniqueRecs = Array.from(
      new Map(allRecs.map(rec => [rec.destination_id, rec])).values()
    );

    // Aggregate scores for duplicates
    const aggregated = uniqueRecs.reduce((acc: any, rec) => {
      const key = rec.destination_id;
      if (!acc[key]) {
        acc[key] = { ...rec, score: 0 };
      }
      acc[key].score += rec.score;
      return acc;
    }, {});

    // Sort by score and limit
    const finalRecs = Object.values(aggregated)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, limit);

    return NextResponse.json({
      user_id,
      recommendations: finalRecs,
      total: finalRecs.length,
      sources: {
        collaborative: collaborativeRecs.length,
        content: contentRecs.length,
        popularity: popularRecs.length,
      },
    });
  } catch (error: any) {
    console.error('Error in hybrid recommendations:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/recommendations/hybrid?user_id=xxx&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    return POST(
      new NextRequest(request.url, {
        method: 'POST',
        body: JSON.stringify({ user_id, limit }),
      })
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

