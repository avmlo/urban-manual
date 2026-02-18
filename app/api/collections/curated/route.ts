import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/errors';
import { createServerClient } from '@/lib/supabase/server';

interface CuratedCollectionDef {
  slug: string;
  title: string;
  subtitle: string;
  query: {
    city?: string;
    category?: string;
    michelin?: boolean;
  };
}

const CURATED_COLLECTIONS: CuratedCollectionDef[] = [
  {
    slug: 'design-hotels',
    title: 'Design Hotels',
    subtitle: 'Where architecture meets hospitality',
    query: { category: 'hotel' },
  },
  {
    slug: 'michelin-weekends',
    title: 'Michelin Weekends',
    subtitle: 'Stars worth the journey',
    query: { michelin: true },
  },
  {
    slug: 'tokyo-essentials',
    title: 'Tokyo Essentials',
    subtitle: 'The definitive guide to the capital',
    query: { city: 'Tokyo' },
  },
  {
    slug: 'hidden-bars',
    title: 'Hidden Bars',
    subtitle: 'Speak easy, drink well',
    query: { category: 'bar' },
  },
  {
    slug: 'architecture-trails',
    title: 'Architecture Trails',
    subtitle: 'Spaces that shape how we see the world',
    query: { category: 'landmark' },
  },
];

export const GET = withErrorHandling(async () => {
  const supabase = await createServerClient();

  const collectionsWithImages = await Promise.all(
    CURATED_COLLECTIONS.map(async (collection) => {
      let query = supabase
        .from('destinations')
        .select('image, name, slug')
        .not('image', 'is', null)
        .limit(1);

      if (collection.query.city) {
        query = query.ilike('city', collection.query.city);
      }
      if (collection.query.category) {
        query = query.ilike('category', collection.query.category);
      }
      if (collection.query.michelin) {
        query = query.gt('michelin_stars', 0);
      }

      const { data } = await query;

      return {
        slug: collection.slug,
        title: collection.title,
        subtitle: collection.subtitle,
        coverImage: data?.[0]?.image || null,
      };
    })
  );

  return NextResponse.json(
    { collections: collectionsWithImages },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  );
});
