/**
 * Neighborhoods & Districts Service
 * Handles neighborhood/district filtering, search, and discovery
 */

import { createServiceRoleClient } from '@/lib/supabase-server';

export interface Neighborhood {
  name: string;
  city: string;
  district?: string;
  description?: string;
  coordinates?: { lat: number; lng: number };
  destinationCount?: number;
  popularCategories?: string[];
  averageRating?: number;
  trendingScore?: number;
}

export interface District {
  name: string;
  city: string;
  neighborhoods: string[];
  description?: string;
  destinationCount?: number;
}

export class NeighborhoodsDistrictsService {
  private supabase;

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      this.supabase = null;
    }
  }

  /**
   * Get all neighborhoods for a city
   */
  async getNeighborhoodsByCity(city: string): Promise<Neighborhood[]> {
    if (!this.supabase) return [];

    try {
      // Get unique neighborhoods from destinations
      const { data: destinations, error } = await this.supabase
        .from('destinations')
        .select('neighborhood, city, category, rating, trending_score')
        .ilike('city', `%${city}%`)
        .not('neighborhood', 'is', null);

      if (error || !destinations) {
        return [];
      }

      // Group by neighborhood
      const neighborhoodMap = new Map<string, {
        name: string;
        city: string;
        destinations: any[];
        categories: Set<string>;
        ratings: number[];
        trendingScores: number[];
      }>();

      for (const dest of destinations) {
        const neighborhood = dest.neighborhood;
        if (!neighborhood) continue;

        if (!neighborhoodMap.has(neighborhood)) {
          neighborhoodMap.set(neighborhood, {
            name: neighborhood,
            city: dest.city,
            destinations: [],
            categories: new Set(),
            ratings: [],
            trendingScores: [],
          });
        }

        const data = neighborhoodMap.get(neighborhood)!;
        data.destinations.push(dest);
        if (dest.category) data.categories.add(dest.category);
        if (dest.rating) data.ratings.push(dest.rating);
        if (dest.trending_score) data.trendingScores.push(dest.trending_score);
      }

      // Convert to Neighborhood objects
      const neighborhoods: Neighborhood[] = Array.from(neighborhoodMap.values()).map(
        (data) => {
          const avgRating =
            data.ratings.length > 0
              ? data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length
              : undefined;

          const avgTrending =
            data.trendingScores.length > 0
              ? data.trendingScores.reduce((a, b) => a + b, 0) / data.trendingScores.length
              : undefined;

          return {
            name: data.name,
            city: data.city,
            destinationCount: data.destinations.length,
            popularCategories: Array.from(data.categories).slice(0, 5),
            averageRating: avgRating,
            trendingScore: avgTrending,
          };
        }
      );

      // Sort by destination count (most popular first)
      return neighborhoods.sort((a, b) => (b.destinationCount || 0) - (a.destinationCount || 0));
    } catch (error) {
      console.error('Error getting neighborhoods:', error);
      return [];
    }
  }

  /**
   * Get districts for a city (grouped neighborhoods)
   */
  async getDistrictsByCity(city: string): Promise<District[]> {
    if (!this.supabase) return [];

    try {
      const neighborhoods = await this.getNeighborhoodsByCity(city);

      // Group neighborhoods into districts (simplified - would use actual district data)
      // For now, create districts based on common patterns
      const districtMap = new Map<string, string[]>();

      for (const neighborhood of neighborhoods) {
        // Simple heuristic: group by first part of name or common patterns
        // In production, would use actual district data
        const districtName = this.inferDistrict(neighborhood.name, city);

        if (!districtMap.has(districtName)) {
          districtMap.set(districtName, []);
        }

        districtMap.get(districtName)!.push(neighborhood.name);
      }

      // Convert to District objects
      const districts: District[] = Array.from(districtMap.entries()).map(
        ([name, neighborhoods]) => ({
          name,
          city,
          neighborhoods,
          destinationCount: neighborhoods.reduce((sum, n) => {
            const neighborhood = neighborhoods.find((nh) => nh === n);
            return sum + (neighborhood ? 1 : 0);
          }, 0),
        })
      );

      return districts;
    } catch (error) {
      console.error('Error getting districts:', error);
      return [];
    }
  }

  /**
   * Search destinations by neighborhood
   */
  async searchByNeighborhood(
    neighborhood: string,
    city?: string,
    filters?: {
      category?: string;
      minRating?: number;
      maxPriceLevel?: number;
    },
    limit: number = 50
  ): Promise<any[]> {
    if (!this.supabase) return [];

    try {
      let query = this.supabase
        .from('destinations')
        .select('*')
        .ilike('neighborhood', `%${neighborhood}%`)
        .limit(limit);

      if (city) {
        query = query.ilike('city', `%${city}%`);
      }

      if (filters?.category) {
        query = query.ilike('category', `%${filters.category}%`);
      }

      if (filters?.minRating) {
        query = query.gte('rating', filters.minRating);
      }

      if (filters?.maxPriceLevel) {
        query = query.lte('price_level', filters.maxPriceLevel);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error searching by neighborhood:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error searching by neighborhood:', error);
      return [];
    }
  }

  /**
   * Get popular neighborhoods in a city
   */
  async getPopularNeighborhoods(
    city: string,
    limit: number = 10
  ): Promise<Neighborhood[]> {
    const neighborhoods = await this.getNeighborhoodsByCity(city);

    // Sort by trending score, then by destination count
    return neighborhoods
      .sort((a, b) => {
        const aScore = (a.trendingScore || 0) * 0.6 + (a.destinationCount || 0) * 0.4;
        const bScore = (b.trendingScore || 0) * 0.6 + (b.destinationCount || 0) * 0.4;
        return bScore - aScore;
      })
      .slice(0, limit);
  }

  /**
   * Get neighborhoods near a location
   */
  async getNeighborhoodsNearLocation(
    lat: number,
    lng: number,
    radiusKm: number = 5
  ): Promise<Neighborhood[]> {
    if (!this.supabase) return [];

    try {
      // Use PostGIS if available, otherwise approximate
      const { data: destinations, error } = await this.supabase
        .from('destinations')
        .select('neighborhood, city, latitude, longitude')
        .not('neighborhood', 'is', null)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error || !destinations) {
        return [];
      }

      // Filter by distance (simplified - would use PostGIS in production)
      const nearby = destinations.filter((dest: any) => {
        if (!dest.latitude || !dest.longitude) return false;
        const distance = this.calculateDistance(
          lat,
          lng,
          dest.latitude,
          dest.longitude
        );
        return distance <= radiusKm;
      });

      // Get unique neighborhoods
      const neighborhoodSet = new Set<string>();
      for (const dest of nearby) {
        if (dest.neighborhood) {
          neighborhoodSet.add(dest.neighborhood);
        }
      }

      // Get full neighborhood data
      const neighborhoods: Neighborhood[] = [];
      for (const name of neighborhoodSet) {
        const neighborhoodData = await this.getNeighborhoodsByCity(
          nearby.find((d: any) => d.neighborhood === name)?.city || ''
        );
        const neighborhood = neighborhoodData.find((n) => n.name === name);
        if (neighborhood) {
          neighborhoods.push(neighborhood);
        }
      }

      return neighborhoods;
    } catch (error) {
      console.error('Error getting neighborhoods near location:', error);
      return [];
    }
  }

  /**
   * Infer district from neighborhood name (heuristic)
   */
  private inferDistrict(neighborhood: string, city: string): string {
    // Simple heuristic - in production would use actual district data
    const lower = neighborhood.toLowerCase();

    // Common patterns
    if (lower.includes('downtown') || lower.includes('center')) {
      return 'Downtown';
    }
    if (lower.includes('east') || lower.includes('eastern')) {
      return 'East';
    }
    if (lower.includes('west') || lower.includes('western')) {
      return 'West';
    }
    if (lower.includes('north') || lower.includes('northern')) {
      return 'North';
    }
    if (lower.includes('south') || lower.includes('southern')) {
      return 'South';
    }

    // Default: use first word or return neighborhood name
    const parts = neighborhood.split(/[\s-]/);
    return parts[0] || neighborhood;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const neighborhoodsDistrictsService = new NeighborhoodsDistrictsService();

