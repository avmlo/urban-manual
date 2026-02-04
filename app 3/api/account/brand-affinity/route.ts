import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

/**
 * GET /api/account/brand-affinity
 * Get user's brand affinity based on saved and visited places
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's saved and visited places with brand information
    const [savedResult, visitedResult] = await Promise.all([
      supabase.rpc('get_user_saved_destinations', { target_user_id: user.id }),
      supabase.rpc('get_user_visited_destinations', { target_user_id: user.id }),
    ]);

    const saved = savedResult.data || [];
    const visited = visitedResult.data || [];

    // Calculate brand affinity scores
    const brandScores: Record<string, {
      brand: string;
      saved_count: number;
      visited_count: number;
      total_score: number;
    }> = {};

    // Visited places have higher weight (3x) than saved
    visited.forEach((place: any) => {
      if (place.brand) {
        const brand = place.brand;
        if (!brandScores[brand]) {
          brandScores[brand] = { brand, saved_count: 0, visited_count: 0, total_score: 0 };
        }
        brandScores[brand].visited_count++;
        brandScores[brand].total_score += 3;
      }
    });

    saved.forEach((place: any) => {
      if (place.brand) {
        const brand = place.brand;
        if (!brandScores[brand]) {
          brandScores[brand] = { brand, saved_count: 0, visited_count: 0, total_score: 0 };
        }
        brandScores[brand].saved_count++;
        brandScores[brand].total_score += 1;
      }
    });

    // Sort by total score descending
    const brandAffinity = Object.values(brandScores)
      .sort((a, b) => b.total_score - a.total_score);

    // Get top brands with examples
    const topBrandsWithExamples = await Promise.all(
      brandAffinity.slice(0, 10).map(async (brandData) => {
        // Get 3 example destinations from this brand
        const { data: examples } = await supabase
          .from('destinations')
          .select('slug, name, city, image, rating')
          .ilike('brand', brandData.brand)
          .limit(3);

        return {
          ...brandData,
          examples: examples || [],
        };
      })
    );

    return NextResponse.json({
      brand_affinity: topBrandsWithExamples,
      total_brands: brandAffinity.length,
    });
  } catch (error: any) {
    console.error('Brand affinity API error:', error);
    return NextResponse.json(
      { error: 'Failed to get brand affinity', details: error.message },
      { status: 500 }
    );
  }
}
