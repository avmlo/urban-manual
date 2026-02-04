import { supabase } from '@/lib/supabase';
import { createServiceRoleClient } from '@/lib/supabase-server';

/**
 * Calculate popularity score for destinations
 * Popularity = (saves_count * 3) + (views_count * 2) + (visits_count * 1)
 * Weights:
 * - Saves: 3x (highest - explicit user interest)
 * - Views: 2x (high - user engagement)
 * - Visits: 1x (lower - actual exploration)
 */
export interface DestinationPopularity {
  destination_id?: number;
  destination_slug: string;
  saves_count: number;
  views_count: number;
  visits_count: number;
  popularity_score: number;
}

/**
 * Get popularity scores for all destinations
 */
export async function getAllDestinationPopularity(): Promise<Map<string, DestinationPopularity>> {
  try {
    const supabaseAdmin = createServiceRoleClient();
    const popularityMap = new Map<string, DestinationPopularity>();

    if (!supabaseAdmin) {
      return popularityMap;
    }

    // Get saves count per destination
    const { data: savesData, error: savesError } = await supabaseAdmin
      .from('saved_places')
      .select('destination_slug');

    if (!savesError && savesData) {
      savesData.forEach((item: any) => {
        const slug = item.destination_slug;
        if (slug) {
          if (!popularityMap.has(slug)) {
            popularityMap.set(slug, {
              destination_slug: slug,
              saves_count: 0,
              views_count: 0,
              visits_count: 0,
              popularity_score: 0,
            });
          }
          const pop = popularityMap.get(slug)!;
          pop.saves_count = (pop.saves_count || 0) + 1;
        }
      });
    }

    // Get visits count per destination
    const { data: visitsData, error: visitsError } = await supabaseAdmin
      .from('visited_places')
      .select('destination_slug');

    if (!visitsError && visitsData) {
      visitsData.forEach((item: any) => {
        const slug = item.destination_slug;
        if (slug) {
          if (!popularityMap.has(slug)) {
            popularityMap.set(slug, {
              destination_slug: slug,
              saves_count: 0,
              views_count: 0,
              visits_count: 0,
              popularity_score: 0,
            });
          }
          const pop = popularityMap.get(slug)!;
          pop.visits_count = (pop.visits_count || 0) + 1;
        }
      });
    }

    // Get views count per destination (from visit_history and user_interactions)
    const { data: viewsData, error: viewsError } = await supabaseAdmin
      .from('visit_history')
      .select('destination_id, destination:destinations(slug)');

    if (!viewsError && viewsData) {
      viewsData.forEach((item: any) => {
        const slug = item.destination?.slug;
        if (slug) {
          if (!popularityMap.has(slug)) {
            popularityMap.set(slug, {
              destination_slug: slug,
              saves_count: 0,
              views_count: 0,
              visits_count: 0,
              popularity_score: 0,
            });
          }
          const pop = popularityMap.get(slug)!;
          pop.views_count = (pop.views_count || 0) + 1;
        }
      });
    }

    // Also count views from user_interactions table
    const { data: interactionsData, error: interactionsError } = await supabaseAdmin
      .from('user_interactions')
      .select('destination_slug')
      .eq('interaction_type', 'view');

    if (!interactionsError && interactionsData) {
      interactionsData.forEach((item: any) => {
        const slug = item.destination_slug;
        if (slug) {
          if (!popularityMap.has(slug)) {
            popularityMap.set(slug, {
              destination_slug: slug,
              saves_count: 0,
              views_count: 0,
              visits_count: 0,
              popularity_score: 0,
            });
          }
          const pop = popularityMap.get(slug)!;
          pop.views_count = (pop.views_count || 0) + 1;
        }
      });
    }

    // Calculate popularity scores with views included
    popularityMap.forEach((pop) => {
      pop.popularity_score = (pop.saves_count * 3) + (pop.views_count * 2) + (pop.visits_count * 1);
    });

    return popularityMap;
  } catch (error) {
    console.error('Error calculating popularity:', error);
    return new Map();
  }
}

/**
 * Get popularity for specific destinations by slug
 */
export async function getDestinationsPopularity(
  slugs: string[]
): Promise<Map<string, DestinationPopularity>> {
  try {
    const supabaseAdmin = createServiceRoleClient();
    const popularityMap = new Map<string, DestinationPopularity>();

    if (!supabaseAdmin) {
      return popularityMap;
    }

    if (slugs.length === 0) return popularityMap;

    // Initialize all slugs
    slugs.forEach((slug) => {
      popularityMap.set(slug, {
        destination_slug: slug,
        saves_count: 0,
        views_count: 0,
        visits_count: 0,
        popularity_score: 0,
      });
    });

    // Get destination IDs for these slugs
    const { data: destinations } = await supabaseAdmin
      .from('destinations')
      .select('id, slug')
      .in('slug', slugs);

    const slugToId = new Map(
      (destinations || []).map((d: any) => [d.slug, d.id])
    );
    const destinationIds = Array.from(slugToId.values());

    if (destinationIds.length === 0) return popularityMap;

    // Get saves count
    const { data: savesData } = await supabaseAdmin
      .from('saved_places')
      .select('destination_slug')
      .in('destination_slug', slugs);

    if (savesData) {
      const savesBySlug: Record<string, number> = {};
      savesData.forEach((item: any) => {
        const slug = item.destination_slug;
        if (slug && popularityMap.has(slug)) {
          savesBySlug[slug] = (savesBySlug[slug] || 0) + 1;
          const pop = popularityMap.get(slug)!;
          pop.saves_count = savesBySlug[slug];
        }
      });
    }

    // Get visits count
    const { data: visitsData } = await supabaseAdmin
      .from('visited_places')
      .select('destination_slug')
      .in('destination_slug', slugs);

    if (visitsData) {
      const visitsBySlug: Record<string, number> = {};
      visitsData.forEach((item: any) => {
        const slug = item.destination_slug;
        if (slug && popularityMap.has(slug)) {
          visitsBySlug[slug] = (visitsBySlug[slug] || 0) + 1;
          const pop = popularityMap.get(slug)!;
          pop.visits_count = visitsBySlug[slug];
        }
      });
    }

    // Get views count per destination
    const { data: viewsData } = await supabaseAdmin
      .from('visit_history')
      .select('destination_id, destination:destinations(slug)')
      .in('destination_id', destinationIds);

    if (viewsData) {
      viewsData.forEach((item: any) => {
        const slug = item.destination?.slug;
        if (slug && popularityMap.has(slug)) {
          const pop = popularityMap.get(slug)!;
          pop.views_count = (pop.views_count || 0) + 1;
        }
      });
    }

    // Also count views from user_interactions table
    const { data: interactionsData } = await supabaseAdmin
      .from('user_interactions')
      .select('destination_slug')
      .eq('interaction_type', 'view')
      .in('destination_slug', slugs);

    if (interactionsData) {
      interactionsData.forEach((item: any) => {
        const slug = item.destination_slug;
        if (slug && popularityMap.has(slug)) {
          const pop = popularityMap.get(slug)!;
          pop.views_count = (pop.views_count || 0) + 1;
        }
      });
    }

    // Calculate popularity scores with views included
    popularityMap.forEach((pop) => {
      pop.popularity_score = (pop.saves_count * 3) + (pop.views_count * 2) + (pop.visits_count * 1);
    });

    return popularityMap;
  } catch (error) {
    console.error('Error getting destinations popularity:', error);
    return new Map();
  }
}

/**
 * Sort destinations by popularity (with fallback to name)
 */
export function sortByPopularity<T extends { slug: string }>(
  destinations: T[],
  popularityMap: Map<string, DestinationPopularity>
): T[] {
  return [...destinations].sort((a, b) => {
    const popA = popularityMap.get(a.slug);
    const popB = popularityMap.get(b.slug);

    const scoreA = popA?.popularity_score || 0;
    const scoreB = popB?.popularity_score || 0;

    // Sort by popularity (descending), then by name
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    // Fallback to name
    const nameA = ('name' in a && typeof a.name === 'string' ? a.name : '') || '';
    const nameB = ('name' in b && typeof b.name === 'string' ? b.name : '') || '';
    return String(nameA).localeCompare(String(nameB));
  });
}

