/**
 * Rich Query Context Service
 * Enriches queries with comprehensive user, destination, and temporal context
 */

import { createServiceRoleClient } from '@/lib/supabase-server';

export interface RichQueryContext {
  user: {
    profile: {
      favoriteCities?: string[];
      favoriteCategories?: string[];
      travelStyle?: string;
      pricePreference?: number;
      dietaryRestrictions?: string[];
    };
    history: {
      visitedDestinations: Array<{ id: number; slug: string; visitedAt: Date }>;
      savedDestinations: Array<{ id: number; slug: string; savedAt: Date }>;
      recentSearches: Array<{ query: string; timestamp: Date }>;
    };
    preferences: {
      preferredTimeOfDay?: string[];
      preferredSeasons?: string[];
      budgetRange?: { min: number; max: number };
    };
  };
  destination: {
    realTimeData?: {
      weather?: any;
      events?: any[];
      closures?: any[];
    };
    intelligence?: {
      demandForecast?: any;
      priceTrends?: any;
      popularityTrend?: 'increasing' | 'decreasing' | 'stable';
    };
  };
  temporal: {
    currentTime: Date;
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek: string;
    season: string;
    upcomingEvents?: Array<{ name: string; date: Date; city: string }>;
  };
  social: {
    trendingDestinations?: Array<{ id: number; slug: string; trendScore: number }>;
    popularInCity?: Array<{ id: number; slug: string; popularityScore: number }>;
  };
}

export class RichQueryContextService {
  private supabase;

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      this.supabase = null;
    }
  }

  /**
   * Build rich context for a query
   */
  async buildContext(
    userId?: string,
    city?: string,
    destinationId?: number
  ): Promise<RichQueryContext> {
    const context: RichQueryContext = {
      user: {
        profile: {},
        history: {
          visitedDestinations: [],
          savedDestinations: [],
          recentSearches: [],
        },
        preferences: {},
      },
      destination: {},
      temporal: this.getTemporalContext(),
      social: {},
    };

    if (userId && this.supabase) {
      // Enrich user context
      await this.enrichUserContext(userId, context);
    }

    if (city) {
      await this.enrichCityContext(city, context);
    }

    if (destinationId) {
      await this.enrichDestinationContext(destinationId, context);
    }

    return context;
  }

  private async enrichUserContext(userId: string, context: RichQueryContext): Promise<void> {
    if (!this.supabase) return;

    try {
      // Get user profile
      const { data: profile, error: profileError } = await this.supabase
        .from('user_profiles')
        .select('favorite_cities, favorite_categories, travel_style, price_preference, dietary_restrictions')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.warn('RichQueryContextService: profile lookup failed', profileError.message);
      }

      if (profile) {
        context.user.profile = {
          favoriteCities: profile.favorite_cities,
          favoriteCategories: profile.favorite_categories,
          travelStyle: profile.travel_style,
          pricePreference: profile.price_preference,
          dietaryRestrictions: profile.dietary_restrictions,
        };
      }

      // Get visit history
      const { data: visits } = await this.supabase
        .from('visited_places')
        .select('destination_slug, visited_at')
        .eq('user_id', userId)
        .order('visited_at', { ascending: false })
        .limit(20);

      if (visits) {
        // Get destination IDs from slugs
        const slugs = visits.map((v: any) => v.destination_slug);
        const { data: destinations } = await this.supabase
          .from('destinations')
          .select('id, slug')
          .in('slug', slugs);

        const slugToId = new Map(destinations?.map((d: any) => [d.slug, d.id]) || []);

        context.user.history.visitedDestinations = visits.map((v: any) => ({
          id: slugToId.get(v.destination_slug) || 0,
          slug: v.destination_slug,
          visitedAt: new Date(v.visited_at),
        }));
      }

      // Get saved destinations
      const { data: saved } = await this.supabase
        .from('saved_places')
        .select('destination_slug, saved_at')
        .eq('user_id', userId)
        .order('saved_at', { ascending: false })
        .limit(20);

      if (saved) {
        const slugs = saved.map((s: any) => s.destination_slug);
        const { data: destinations } = await this.supabase
          .from('destinations')
          .select('id, slug')
          .in('slug', slugs);

        const slugToId = new Map(destinations?.map((d: any) => [d.slug, d.id]) || []);

        context.user.history.savedDestinations = saved.map((s: any) => ({
          id: slugToId.get(s.destination_slug) || 0,
          slug: s.destination_slug,
          savedAt: new Date(s.saved_at),
        }));
      }

      // Get recent searches
      const { data: searches } = await this.supabase
        .from('user_interactions')
        .select('search_query, created_at')
        .eq('user_id', userId)
        .eq('interaction_type', 'search')
        .order('created_at', { ascending: false })
        .limit(10);

      if (searches) {
        context.user.history.recentSearches = searches
          .filter((s: any) => s.search_query)
          .map((s: any) => ({
            query: s.search_query,
            timestamp: new Date(s.created_at),
          }));
      }
    } catch (error) {
      console.error('Error enriching user context:', error);
    }
  }

  private async enrichCityContext(city: string, context: RichQueryContext): Promise<void> {
    if (!this.supabase) return;

    try {
      // Get trending destinations in city
      const { data: trending } = await this.supabase
        .from('destinations')
        .select('id, slug, trending_score')
        .ilike('city', `%${city}%`)
        .not('trending_score', 'is', null)
        .order('trending_score', { ascending: false })
        .limit(10);

      if (trending) {
        context.social.trendingDestinations = trending.map((d: any) => ({
          id: d.id,
          slug: d.slug,
          trendScore: d.trending_score || 0,
        }));
      }

      // Get popular destinations
      const { data: popular } = await this.supabase
        .from('destinations')
        .select('id, slug, views_count, saves_count')
        .ilike('city', `%${city}%`)
        .order('views_count', { ascending: false })
        .limit(10);

      if (popular) {
        context.social.popularInCity = popular.map((d: any) => ({
          id: d.id,
          slug: d.slug,
          popularityScore: (d.views_count || 0) + (d.saves_count || 0) * 2,
        }));
      }
    } catch (error) {
      console.error('Error enriching city context:', error);
    }
  }

  private async enrichDestinationContext(
    destinationId: number,
    context: RichQueryContext
  ): Promise<void> {
    if (!this.supabase) return;

    try {
      // Get destination details
      const { data: destination } = await this.supabase
        .from('destinations')
        .select('current_weather_json, nearby_events_json, city')
        .eq('id', destinationId)
        .single();

      if (destination) {
        context.destination.realTimeData = {
          weather: destination.current_weather_json ? JSON.parse(destination.current_weather_json) : null,
          events: destination.nearby_events_json ? JSON.parse(destination.nearby_events_json) : null,
        };

        // Get demand forecast if available
        // This would call the ML service
        // For now, placeholder
      }
    } catch (error) {
      console.error('Error enriching destination context:', error);
    }
  }

  private getTemporalContext(): RichQueryContext['temporal'] {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    const month = now.getMonth();

    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour >= 6 && hour < 12) {
      timeOfDay = 'morning';
    } else if (hour >= 12 && hour < 17) {
      timeOfDay = 'afternoon';
    } else if (hour >= 17 && hour < 22) {
      timeOfDay = 'evening';
    } else {
      timeOfDay = 'night';
    }

    let season: string;
    if (month >= 2 && month <= 4) {
      season = 'spring';
    } else if (month >= 5 && month <= 7) {
      season = 'summer';
    } else if (month >= 8 && month <= 10) {
      season = 'fall';
    } else {
      season = 'winter';
    }

    return {
      currentTime: now,
      timeOfDay,
      dayOfWeek,
      season,
    };
  }
}

export const richQueryContextService = new RichQueryContextService();
