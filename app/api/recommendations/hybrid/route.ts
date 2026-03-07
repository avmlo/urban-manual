import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling } from '@/lib/errors';
import { enforceRateLimit, searchRatelimit, memorySearchRatelimit } from '@/lib/rate-limit';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

interface CollaborativeRec {
  destination_id: number;
  slug: string;
  name: string;
  city: string;
  category: string;
  score: number;
  reason: string;
  source: 'collaborative' | 'content' | 'ai' | 'popularity';
}

interface MLRec {
  destination_id: number;
  slug: string;
  name: string;
  city: string;
  category: string;
  score: number;
  reason?: string;
}

interface SavedPlace {
  destination_slug: string;
}

interface Destination {
  id: number;
  slug: string;
  name: string;
  city: string;
  category: string;
  tags?: string[] | null;
  saves_count?: number;
  visits_count?: number;
}

/**
 * Enhanced Hybrid Recommendations API
 * Combines:
 * - Collaborative Filtering (from ML service)
 * - Content-Based (from existing logic)
 * - AI Recommendations (Gemini)
 * 
 * POST /api/recommendations/hybrid
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { user_id, limit = 20, exclude_visited = true, exclude_saved = true } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    // Rate Limiting
    const rateLimitResponse = await enforceRateLimit({
      request,
      userId: user_id,
      message: 'Too many recommendation requests',
      limiter: searchRatelimit,
      memoryLimiter: memorySearchRatelimit,
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authentication & Authorization
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure the authenticated user matches the requested user_id
    if (user.id !== user_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Try to get collaborative filtering recommendations from ML service
    let collaborativeRecs: CollaborativeRec[] = [];
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
        collaborativeRecs = (mlData.recommendations || []).map((rec: MLRec) => ({
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
    // We use the authenticated client, so RLS policies are applied automatically
    const { data: savedPlaces } = await supabase
      .from('saved_places')
      .select('destination_slug')
      .eq('user_id', user_id)
      .limit(10);

    const savedSlugs = (savedPlaces as unknown as SavedPlace[] || []).map((sp) => sp.destination_slug);

    // Get destinations similar to saved ones
    let contentRecs: CollaborativeRec[] = [];
    if (savedSlugs.length > 0) {
      const { data: savedDests } = await supabase
        .from('destinations')
        .select('id, slug, name, city, category, tags')
        .in('slug', savedSlugs)
        .limit(5);

      if (savedDests && savedDests.length > 0) {
        const typedSavedDests = savedDests as unknown as Destination[];
        // Find destinations with similar tags/categories
        const categories = [...new Set(typedSavedDests.map((d) => d.category))];

        const { data: similarDests } = await supabase
          .from('destinations')
          .select('id, slug, name, city, category')
          .in('category', categories)
          .not('slug', 'in', `(${savedSlugs.map((s: string) => `"${s}"`).join(',')})`)
          .limit(Math.floor(limit * 0.3)); // 30% from content

        contentRecs = (similarDests || []).map((dest: unknown) => {
          const d = dest as Destination;
          return {
            destination_id: d.id,
            slug: d.slug,
            name: d.name,
            city: d.city,
            category: d.category,
            score: 0.3, // Weight content at 30%
            reason: 'Similar to places you saved',
            source: 'content' as const,
          };
        });
      }
    }

    // 3. Get popular destinations as fallback (10%)
    const { data: popularDests } = await supabase
      .from('destinations')
      .select('id, slug, name, city, category, saves_count, visits_count')
      .order('saves_count', { ascending: false })
      .order('visits_count', { ascending: false })
      .limit(Math.floor(limit * 0.1));

    const popularRecs = (popularDests || []).map((dest: unknown) => {
      const d = dest as Destination;
      return {
        destination_id: d.id,
        slug: d.slug,
        name: d.name,
        city: d.city,
        category: d.category,
        score: 0.1, // Weight popularity at 10%
        reason: 'Popular destination',
        source: 'popularity' as const,
      };
    });

    // Combine and deduplicate
    const allRecs = [...collaborativeRecs, ...contentRecs, ...popularRecs];
    const uniqueRecs = Array.from(
      new Map(allRecs.map(rec => [rec.destination_id, rec])).values()
    );

    // Aggregate scores for duplicates
    const aggregated = uniqueRecs.reduce((acc: Record<number, CollaborativeRec>, rec) => {
      const key = rec.destination_id;
      if (!acc[key]) {
        acc[key] = { ...rec, score: 0 };
      }
      acc[key].score += rec.score;
      return acc;
    }, {} as Record<number, CollaborativeRec>);

    // Sort by score and limit
    const finalRecs = Object.values(aggregated)
      .sort((a, b) => b.score - a.score)
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
  } catch (error) {
    console.error('Error in hybrid recommendations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
});

/**
 * GET /api/recommendations/hybrid?user_id=xxx&limit=20
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
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
        headers: request.headers, // Pass headers to preserve auth/IP info
        body: JSON.stringify({ user_id, limit }),
      })
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
});
