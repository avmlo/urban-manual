import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import { Destination } from '@/types/destination';

type ScoredDestination = Destination & { _score: number };

const MAX_LIMIT = 50;

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const rawLimit = parseInt(searchParams.get('limit') || '6');
  const limit = Math.min(Math.max(rawLimit, 1), MAX_LIMIT);

  if (!slug) {
    throw createValidationError('Slug is required');
  }

  const supabase = await createServerClient();

  // Get the destination
  const { data: destination, error: destError } = await supabase
    .from('destinations')
    .select('*')
    .eq('slug', slug)
    .single();

  if (destError || !destination) {
    return NextResponse.json({ error: 'Destination not found' }, { status: 404 });
  }

  const dest = destination as Destination;

  // Score-based selection: same city, same category, shared tags, nearby cities
  const related: ScoredDestination[] = [];

  // 1. Same city + same category (highest priority)
  if (dest.city && dest.category) {
    const { data: sameCityCategory } = await supabase
      .from('destinations')
      .select('*')
      .eq('city', dest.city)
      .eq('category', dest.category)
      .neq('slug', slug)
      .limit(limit);

    if (sameCityCategory) {
      related.push(...(sameCityCategory as Destination[]).map((d) => ({ ...d, _score: 10 })));
    }
  }

  // 2. Same city, different category
  if (dest.city && related.length < limit) {
    const existingSlugs = related.map((r) => r.slug);
    const { data: sameCity } = await supabase
      .from('destinations')
      .select('*')
      .eq('city', dest.city)
      .neq('category', dest.category || '')
      .neq('slug', slug)
      .not('slug', 'in', `(${existingSlugs.join(',') || 'none'})`)
      .limit(limit - related.length);

    if (sameCity) {
      related.push(...(sameCity as Destination[]).map((d) => ({ ...d, _score: 7 })));
    }
  }

  // 3. Same category, different city
  if (dest.category && related.length < limit) {
    const existingSlugs = related.map((r) => r.slug);
    const { data: sameCategory } = await supabase
      .from('destinations')
      .select('*')
      .eq('category', dest.category)
      .neq('city', dest.city || '')
      .neq('slug', slug)
      .not('slug', 'in', `(${existingSlugs.join(',') || 'none'})`)
      .limit(limit - related.length);

    if (sameCategory) {
      related.push(...(sameCategory as Destination[]).map((d) => ({ ...d, _score: 5 })));
    }
  }

  // 4. Boost Michelin-starred places
  const boosted = related.map((d) => {
    let score = d._score || 3;
    if (d.michelin_stars && d.michelin_stars > 0) score += 2;
    if (d.crown) score += 1;
    if (d.rating && d.rating >= 4.5) score += 1;
    return { ...d, _score: score };
  });

  // Sort by score and limit
  const final = boosted
    .sort((a, b) => (b._score || 0) - (a._score || 0))
    .slice(0, limit)
    .map(({ _score, ...rest }) => rest);

  return NextResponse.json({
    related: final,
    count: final.length,
  });
});
