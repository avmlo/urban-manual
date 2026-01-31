import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { withErrorHandling } from '@/lib/errors';

// Only select fields needed for destination cards
const CARD_FIELDS = 'id, slug, name, city, country, category, micro_description, image, image_thumbnail, latitude, longitude, michelin_stars, rating, crown, neighborhood, tags';

export const GET = withErrorHandling(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const limit = parseInt(searchParams.get('limit') || '6');

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    // Get the destination (only fields needed for matching)
    const { data: destination, error: destError } = await supabase
      .from('destinations')
      .select('slug, city, category, michelin_stars, rating, crown')
      .eq('slug', slug)
      .single();

    if (destError || !destination) {
      return NextResponse.json({ error: 'Destination not found' }, { status: 404 });
    }

    const dest = destination as any;

    // Run all three queries in parallel instead of sequentially
    const [sameCityCategoryResult, sameCityResult, sameCategoryResult] = await Promise.all([
      // 1. Same city + same category (highest priority)
      (dest.city && dest.category)
        ? supabase
            .from('destinations')
            .select(CARD_FIELDS)
            .eq('city', dest.city)
            .eq('category', dest.category)
            .neq('slug', slug)
            .limit(limit)
        : Promise.resolve({ data: null }),

      // 2. Same city, different category
      dest.city
        ? supabase
            .from('destinations')
            .select(CARD_FIELDS)
            .eq('city', dest.city)
            .neq('category', dest.category || '')
            .neq('slug', slug)
            .limit(limit)
        : Promise.resolve({ data: null }),

      // 3. Same category, different city
      dest.category
        ? supabase
            .from('destinations')
            .select(CARD_FIELDS)
            .eq('category', dest.category)
            .neq('city', dest.city || '')
            .neq('slug', slug)
            .limit(limit)
        : Promise.resolve({ data: null }),
    ]);

    // Score and deduplicate results
    const seenSlugs = new Set<string>([slug]);
    const related: any[] = [];

    // Process same city + same category (score: 10)
    if (sameCityCategoryResult.data) {
      for (const d of sameCityCategoryResult.data as any[]) {
        if (!seenSlugs.has(d.slug)) {
          seenSlugs.add(d.slug);
          related.push({ ...d, _score: 10 });
        }
      }
    }

    // Process same city, different category (score: 7)
    if (sameCityResult.data) {
      for (const d of sameCityResult.data as any[]) {
        if (!seenSlugs.has(d.slug)) {
          seenSlugs.add(d.slug);
          related.push({ ...d, _score: 7 });
        }
      }
    }

    // Process same category, different city (score: 5)
    if (sameCategoryResult.data) {
      for (const d of sameCategoryResult.data as any[]) {
        if (!seenSlugs.has(d.slug)) {
          seenSlugs.add(d.slug);
          related.push({ ...d, _score: 5 });
        }
      }
    }

    // Boost Michelin-starred places
    const boosted = related.map((d: any) => {
      let score = d._score || 3;
      if (d.michelin_stars && d.michelin_stars > 0) score += 2;
      if (d.crown) score += 1;
      if (d.rating && d.rating >= 4.5) score += 1;
      return { ...d, _score: score };
    });

    // Sort by score and limit
    const final = boosted
      .sort((a: any, b: any) => (b._score || 0) - (a._score || 0))
      .slice(0, limit)
      .map(({ _score, ...rest }: any) => rest);

    const response = NextResponse.json({
      related: final,
      count: final.length,
    });

    // Cache related destinations for 10 minutes, stale-while-revalidate for 30 min
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=600, stale-while-revalidate=1800'
    );

    return response;
  } catch (error: any) {
    console.error('Error fetching related destinations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch related destinations' },
      { status: 500 }
    );
  }
});
