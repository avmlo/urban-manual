/**
 * Server-side data fetching utilities for destinations
 *
 * These functions fetch data on the server and can be used in Server Components
 * to provide initial data, reducing client-side loading time.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { Destination } from '@/types/destination';
import { unstable_cache } from 'next/cache';

/**
 * Check if Supabase is properly configured for server-side use
 */
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  // Check that both are present and have valid lengths
  return !!(url && url.includes('supabase') && key && key.length >= 50);
}

/**
 * Fetch initial destinations for the homepage
 * Uses service role client for unauthenticated server-side fetching
 * Cached for 5 minutes to reduce database load
 */
export const fetchInitialDestinations = unstable_cache(
  async (): Promise<Destination[]> => {
    // Skip database queries during build if Supabase isn't configured
    if (!isSupabaseConfigured()) {
      console.log('[SSR] Supabase not configured, skipping destination fetch');
      return [];
    }

    try {
      const supabase = createServiceRoleClient();

      const { data, error } = await supabase
        .from('destinations')
        .select(`
          id,
          slug,
          name,
          city,
          country,
          neighborhood,
          category,
          micro_description,
          image,
          image_thumbnail,
          michelin_stars,
          crown,
          rating,
          price_level,
          tags,
          latitude,
          longitude
        `)
        .order('rating', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('[SSR] Error fetching destinations:', error.message);
        return [];
      }

      return (data || []) as Destination[];
    } catch (error) {
      console.error('[SSR] Exception fetching destinations:', error);
      return [];
    }
  },
  ['initial-destinations'],
  {
    revalidate: 300, // 5 minutes
    tags: ['destinations'],
  }
);

/**
 * Fetch unique cities and categories for filters
 * Cached for 10 minutes since this data changes infrequently
 */
export const fetchFilterOptions = unstable_cache(
  async (): Promise<{ cities: string[]; categories: string[] }> => {
    // Skip database queries during build if Supabase isn't configured
    if (!isSupabaseConfigured()) {
      return { cities: [], categories: [] };
    }

    try {
      const supabase = createServiceRoleClient();

      const { data, error } = await supabase
        .from('destinations')
        .select('city, category');

      if (error) {
        console.error('[SSR] Error fetching filter options:', error.message);
        return { cities: [], categories: [] };
      }

      const destinations = data || [];

      // Extract unique cities and categories
      const citySet = new Set<string>();
      const categoryLowerSet = new Set<string>();
      const categoryArray: string[] = [];

      destinations.forEach((dest: { city?: string | null; category?: string | null }) => {
        const city = (dest.city ?? '').toString().trim();
        const category = (dest.category ?? '').toString().trim();

        if (city) {
          citySet.add(city);
        }
        if (category) {
          const categoryLower = category.toLowerCase();
          if (!categoryLowerSet.has(categoryLower)) {
            categoryLowerSet.add(categoryLower);
            categoryArray.push(category);
          }
        }
      });

      return {
        cities: Array.from(citySet).sort(),
        categories: categoryArray.sort(),
      };
    } catch (error) {
      console.error('[SSR] Exception fetching filter options:', error);
      return { cities: [], categories: [] };
    }
  },
  ['filter-options'],
  {
    revalidate: 600, // 10 minutes
    tags: ['destinations', 'filters'],
  }
);

/**
 * Fetch destinations for a specific city
 * Cached per city for 5 minutes
 */
export const fetchCityDestinations = unstable_cache(
  async (citySlug: string): Promise<Destination[]> => {
    // Skip database queries during build if Supabase isn't configured
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const supabase = createServiceRoleClient();

      const { data, error } = await supabase
        .from('destinations')
        .select(`
          id,
          slug,
          name,
          city,
          country,
          neighborhood,
          category,
          micro_description,
          description,
          content,
          image,
          image_thumbnail,
          michelin_stars,
          crown,
          rating,
          price_level,
          tags,
          opening_hours_json,
          latitude,
          longitude
        `)
        .eq('city', citySlug)
        .order('name');

      if (error) {
        console.error(`[SSR] Error fetching destinations for city ${citySlug}:`, error.message);
        return [];
      }

      return (data || []) as Destination[];
    } catch (error) {
      console.error(`[SSR] Exception fetching destinations for city ${citySlug}:`, error);
      return [];
    }
  },
  ['city-destinations'],
  {
    revalidate: 300, // 5 minutes
    tags: ['destinations'],
  }
);

/**
 * Fetch city statistics for the cities listing page
 * Cached for 10 minutes
 */
export const fetchCityStats = unstable_cache(
  async (): Promise<Array<{
    city: string;
    country: string;
    count: number;
    featuredImage?: string;
  }>> => {
    // Skip database queries during build if Supabase isn't configured
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const supabase = createServiceRoleClient();

      const { data, error } = await supabase
        .from('destinations')
        .select('city, country, image');

      if (error) {
        console.error('[SSR] Error fetching city stats:', error.message);
        return [];
      }

      const destinations = data || [];

      // Count cities and get featured image
      const cityData = destinations.reduce((acc, dest: { city?: string | null; country?: string | null; image?: string | null }) => {
        const citySlug = (dest.city ?? '').toString().trim();
        if (!citySlug) return acc;

        if (!acc[citySlug]) {
          acc[citySlug] = {
            count: 0,
            featuredImage: dest.image || undefined,
            country: dest.country || 'Unknown',
          };
        }

        acc[citySlug].count += 1;

        // Update featured image if current one doesn't have image but this one does
        if (!acc[citySlug].featuredImage && dest.image) {
          acc[citySlug].featuredImage = dest.image;
        }

        // Update country if we have a better value
        if ((acc[citySlug].country === 'Unknown') && dest.country) {
          acc[citySlug].country = dest.country;
        }

        return acc;
      }, {} as Record<string, { count: number; featuredImage?: string; country: string }>);

      const stats = Object.entries(cityData)
        .map(([city, data]) => ({
          city,
          country: data.country,
          count: data.count,
          featuredImage: data.featuredImage,
        }))
        .sort((a, b) => b.count - a.count);

      return stats;
    } catch (error) {
      console.error('[SSR] Exception fetching city stats:', error);
      return [];
    }
  },
  ['city-stats'],
  {
    revalidate: 600, // 10 minutes
    tags: ['destinations', 'cities'],
  }
);

/**
 * Fetch trending destinations
 * Based on recent activity and ratings
 * Cached for 5 minutes
 */
export const fetchTrendingDestinations = unstable_cache(
  async (limit: number = 12): Promise<Destination[]> => {
    // Skip database queries during build if Supabase isn't configured
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const supabase = createServiceRoleClient();

      // Get destinations with high ratings and crown/michelin badges
      const { data, error } = await supabase
        .from('destinations')
        .select(`
          id,
          slug,
          name,
          city,
          country,
          category,
          micro_description,
          image,
          image_thumbnail,
          michelin_stars,
          crown,
          rating,
          tags
        `)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(limit * 2); // Fetch more to filter

      if (error) {
        console.error('[SSR] Error fetching trending destinations:', error.message);
        return [];
      }

      // Prioritize destinations with badges
      const destinations = (data || []) as Destination[];
      const withBadges = destinations.filter(d => d.crown || (d.michelin_stars && d.michelin_stars > 0));
      const others = destinations.filter(d => !d.crown && (!d.michelin_stars || d.michelin_stars === 0));

      return [...withBadges, ...others].slice(0, limit);
    } catch (error) {
      console.error('[SSR] Exception fetching trending destinations:', error);
      return [];
    }
  },
  ['trending-destinations'],
  {
    revalidate: 300, // 5 minutes
    tags: ['destinations', 'trending'],
  }
);

/**
 * Prefetch all homepage data in parallel
 * Returns all data needed for initial render
 */
export async function prefetchHomepageData() {
  const [
    destinations,
    filterOptions,
    trending,
  ] = await Promise.all([
    fetchInitialDestinations(),
    fetchFilterOptions(),
    fetchTrendingDestinations(12),
  ]);

  return {
    destinations,
    cities: filterOptions.cities,
    categories: filterOptions.categories,
    trending,
  };
}

/**
 * Fetch destinations for a specific category in a city
 * Used for SEO-optimized pages like /destinations/restaurants-tokyo
 * Cached per category-city combination for 5 minutes
 */
export const fetchCategoryCityDestinations = unstable_cache(
  async (category: string, citySlug: string): Promise<Destination[]> => {
    // Skip database queries during build if Supabase isn't configured
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const supabase = createServiceRoleClient();

      const { data, error } = await supabase
        .from('destinations')
        .select(`
          id,
          slug,
          name,
          city,
          country,
          neighborhood,
          category,
          micro_description,
          description,
          content,
          image,
          image_thumbnail,
          michelin_stars,
          crown,
          rating,
          user_ratings_total,
          price_level,
          tags,
          opening_hours_json,
          latitude,
          longitude,
          formatted_address,
          international_phone_number
        `)
        .ilike('city', citySlug)
        .ilike('category', category)
        .order('rating', { ascending: false, nullsFirst: false })
        .order('name');

      if (error) {
        console.error(`[SSR] Error fetching destinations for ${category} in ${citySlug}:`, error.message);
        return [];
      }

      return (data || []) as Destination[];
    } catch (error) {
      console.error(`[SSR] Exception fetching destinations for ${category} in ${citySlug}:`, error);
      return [];
    }
  },
  ['category-city-destinations'],
  {
    revalidate: 300, // 5 minutes
    tags: ['destinations'],
  }
);

/**
 * Fetch all category-city combinations for static generation
 * Returns list of {category, city} pairs that have destinations
 */
export const fetchCategoryCityPairs = unstable_cache(
  async (): Promise<Array<{ category: string; city: string; count: number }>> => {
    // Skip database queries during build if Supabase isn't configured
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const supabase = createServiceRoleClient();

      const { data, error } = await supabase
        .from('destinations')
        .select('city, category');

      if (error) {
        console.error('[SSR] Error fetching category-city pairs:', error.message);
        return [];
      }

      const destinations = data || [];

      // Group by category-city and count
      const pairData = destinations.reduce((acc, dest: { city?: string | null; category?: string | null }) => {
        const city = (dest.city ?? '').toString().trim().toLowerCase();
        const category = (dest.category ?? '').toString().trim().toLowerCase();
        if (!city || !category) return acc;

        const key = `${category}-${city}`;
        if (!acc[key]) {
          acc[key] = { category, city, count: 0 };
        }
        acc[key].count += 1;
        return acc;
      }, {} as Record<string, { category: string; city: string; count: number }>);

      // Filter to pairs with at least 2 destinations and sort by count
      return Object.values(pairData)
        .filter(pair => pair.count >= 2)
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('[SSR] Exception fetching category-city pairs:', error);
      return [];
    }
  },
  ['category-city-pairs'],
  {
    revalidate: 600, // 10 minutes
    tags: ['destinations'],
  }
);

/**
 * Fetch brand statistics for the brands listing page
 * Cached for 10 minutes
 */
export const fetchBrandStats = unstable_cache(
  async (): Promise<Array<{
    brand: string;
    count: number;
    featuredImage?: string;
    categories: string[];
  }>> => {
    // Skip database queries during build if Supabase isn't configured
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const supabase = createServiceRoleClient();

      const { data, error } = await supabase
        .from('destinations')
        .select('brand, category, image')
        .not('brand', 'is', null);

      if (error) {
        console.error('[SSR] Error fetching brand stats:', error.message);
        return [];
      }

      const destinations = data || [];

      // Count brands and get featured image
      const brandData = destinations.reduce((acc, dest: { brand?: string | null; category?: string | null; image?: string | null }) => {
        const brand = (dest.brand ?? '').toString().trim();
        if (!brand) return acc;

        if (!acc[brand]) {
          acc[brand] = {
            count: 0,
            featuredImage: dest.image || undefined,
            categories: new Set<string>(),
          };
        }

        acc[brand].count += 1;

        // Update featured image if current one doesn't have image but this one does
        if (!acc[brand].featuredImage && dest.image) {
          acc[brand].featuredImage = dest.image;
        }

        // Track unique categories
        if (dest.category) {
          acc[brand].categories.add(dest.category);
        }

        return acc;
      }, {} as Record<string, { count: number; featuredImage?: string; categories: Set<string> }>);

      const stats = Object.entries(brandData)
        .map(([brand, data]) => ({
          brand,
          count: data.count,
          featuredImage: data.featuredImage,
          categories: Array.from(data.categories) as string[],
        }))
        .sort((a, b) => b.count - a.count);

      return stats;
    } catch (error) {
      console.error('[SSR] Exception fetching brand stats:', error);
      return [];
    }
  },
  ['brand-stats'],
  {
    revalidate: 600, // 10 minutes
    tags: ['destinations', 'brands'],
  }
);
