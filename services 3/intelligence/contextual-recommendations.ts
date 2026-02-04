/**
 * Contextual Recommendations Service
 * Provides recommendations based on current context (location, time, weather, events)
 */

import { createServiceRoleClient } from '@/lib/supabase-server';
import { richQueryContextService } from '@/services/intelligence/rich-query-context';
import { realtimeIntelligenceService } from '@/services/realtime/realtime-intelligence';

export interface ContextualRecommendationContext {
  location?: {
    city?: string;
    neighborhood?: string;
    coordinates?: { lat: number; lng: number };
  };
  temporal?: {
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek?: string;
    season?: string;
    date?: Date;
  };
  weather?: {
    condition?: string;
    temperature?: number;
    isGoodWeather?: boolean;
  };
  events?: Array<{
    name: string;
    date: Date;
    type: string;
  }>;
  userState?: {
    isTraveling?: boolean;
    tripType?: 'business' | 'leisure' | 'romantic' | 'family';
    groupSize?: number;
  };
}

export interface ContextualRecommendation {
  destination: any;
  reason: string;
  contextMatch: {
    location: boolean;
    temporal: boolean;
    weather: boolean;
    events: boolean;
    userState: boolean;
  };
  score: number;
}

export class ContextualRecommendationsService {
  private supabase;

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      this.supabase = null;
    }
  }

  /**
   * Get contextual recommendations based on current context
   */
  async getContextualRecommendations(
    userId: string | undefined,
    context: ContextualRecommendationContext,
    limit: number = 10
  ): Promise<ContextualRecommendation[]> {
    if (!this.supabase) return [];

    try {
      // Build base query
      let query = this.supabase
        .from('destinations')
        .select('*')
        .limit(100); // Get more candidates for filtering

      // Apply location filters
      if (context.location?.city) {
        query = query.ilike('city', `%${context.location.city}%`);
      }

      if (context.location?.neighborhood) {
        query = query.ilike('neighborhood', `%${context.location.neighborhood}%`);
      }

      // Get candidates
      const { data: candidates, error } = await query;

      if (error || !candidates || candidates.length === 0) {
        return [];
      }

      // Score and rank by context
      const scored = await Promise.all(
        candidates.map(async (dest) => {
          const contextMatch = await this.evaluateContextMatch(dest, context);
          const score = this.calculateContextScore(contextMatch, dest);
          const reason = this.generateReason(dest, contextMatch, context);

          return {
            destination: dest,
            reason,
            contextMatch,
            score,
          };
        })
      );

      // Sort by score and return top results
      return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting contextual recommendations:', error);
      return [];
    }
  }

  /**
   * Evaluate how well a destination matches the context
   */
  private async evaluateContextMatch(
    dest: any,
    context: ContextualRecommendationContext
  ): Promise<ContextualRecommendation['contextMatch']> {
    const match: ContextualRecommendation['contextMatch'] = {
      location: false,
      temporal: false,
      weather: false,
      events: false,
      userState: false,
    };

    // Location match
    if (context.location) {
      if (context.location.city && dest.city?.toLowerCase().includes(context.location.city.toLowerCase())) {
        match.location = true;
      }
      if (context.location.neighborhood && dest.neighborhood?.toLowerCase().includes(context.location.neighborhood.toLowerCase())) {
        match.location = true;
      }
    }

    // Temporal match
    if (context.temporal) {
      match.temporal = this.evaluateTemporalMatch(dest, context.temporal);
    }

    // Weather match
    if (context.weather) {
      match.weather = this.evaluateWeatherMatch(dest, context.weather);
    }

    // Events match
    if (context.events && context.events.length > 0) {
      match.events = this.evaluateEventsMatch(dest, context.events);
    }

    // User state match
    if (context.userState) {
      match.userState = this.evaluateUserStateMatch(dest, context.userState);
    }

    return match;
  }

  private evaluateTemporalMatch(
    dest: any,
    temporal: ContextualRecommendationContext['temporal']
  ): boolean {
    if (!temporal) return false;

    // Time of day matching
    if (temporal.timeOfDay) {
      const category = dest.category?.toLowerCase();
      const tags = (dest.tags || []).map((t: any) => String(t).toLowerCase());

      // Morning: cafes, breakfast spots
      if (temporal.timeOfDay === 'morning') {
        if (category?.includes('cafe') || tags.some((t: string) => t.includes('breakfast'))) {
          return true;
        }
      }

      // Afternoon: lunch spots, activities
      if (temporal.timeOfDay === 'afternoon') {
        if (category?.includes('dining') || category?.includes('attraction')) {
          return true;
        }
      }

      // Evening: dinner spots, bars
      if (temporal.timeOfDay === 'evening') {
        if (category?.includes('dining') || category?.includes('bar')) {
          return true;
        }
      }

      // Night: bars, nightlife
      if (temporal.timeOfDay === 'night') {
        if (category?.includes('bar') || tags.some((t: string) => t.includes('nightlife'))) {
          return true;
        }
      }
    }

    return false;
  }

  private evaluateWeatherMatch(
    dest: any,
    weather: ContextualRecommendationContext['weather']
  ): boolean {
    if (!weather) return false;

    const category = dest.category?.toLowerCase();
    const tags = (dest.tags || []).map((t: any) => String(t).toLowerCase());

    // Good weather: outdoor activities, rooftop bars, parks
    if (weather.isGoodWeather) {
      if (
        category?.includes('park') ||
        tags.some((t: string) => t.includes('outdoor') || t.includes('rooftop'))
      ) {
        return true;
      }
    }

    // Bad weather: indoor activities, museums, cafes
    if (!weather.isGoodWeather) {
      if (
        category?.includes('museum') ||
        category?.includes('cafe') ||
        tags.some((t: string) => t.includes('indoor'))
      ) {
        return true;
      }
    }

    return false;
  }

  private evaluateEventsMatch(
    dest: any,
    events: ContextualRecommendationContext['events']
  ): boolean {
    if (!events || events.length === 0) return false;

    try {
      const nearbyEvents = dest.nearby_events_json
        ? JSON.parse(dest.nearby_events_json)
        : [];

      // Check if any event is near this destination
      for (const event of events) {
        const matchingEvent = nearbyEvents.find((e: any) => {
          const eventDate = new Date(e.start_date || e.date);
          const daysDiff = Math.abs(
            (eventDate.getTime() - event.date.getTime()) / (1000 * 60 * 60 * 24)
          );
          return daysDiff <= 7; // Within 7 days
        });

        if (matchingEvent) {
          return true;
        }
      }
    } catch (error) {
      // Invalid JSON, skip
    }

    return false;
  }

  private evaluateUserStateMatch(
    dest: any,
    userState: ContextualRecommendationContext['userState']
  ): boolean {
    if (!userState) return false;

    const category = dest.category?.toLowerCase();
    const tags = (dest.tags || []).map((t: any) => String(t).toLowerCase());
    const priceLevel = dest.price_level || 0;

    // Business trip: professional, convenient locations
    if (userState.tripType === 'business') {
      if (
        category?.includes('hotel') ||
        tags.some((t: string) => t.includes('business') || t.includes('convenient'))
      ) {
        return true;
      }
    }

    // Romantic: fine dining, intimate settings
    if (userState.tripType === 'romantic') {
      if (
        priceLevel >= 3 ||
        tags.some((t: string) => t.includes('romantic') || t.includes('intimate'))
      ) {
        return true;
      }
    }

    // Family: family-friendly, activities
    if (userState.tripType === 'family') {
      if (
        category?.includes('attraction') ||
        tags.some((t: string) => t.includes('family') || t.includes('kid'))
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate context score
   */
  private calculateContextScore(
    contextMatch: ContextualRecommendation['contextMatch'],
    dest: any
  ): number {
    let score = 0;

    // Base score from quality
    const rating = dest.rating || 0;
    score += (rating / 5) * 0.3;

    // Context match bonuses
    if (contextMatch.location) score += 0.2;
    if (contextMatch.temporal) score += 0.15;
    if (contextMatch.weather) score += 0.1;
    if (contextMatch.events) score += 0.15;
    if (contextMatch.userState) score += 0.1;

    // Trending boost
    if (dest.trending_score) {
      score += dest.trending_score * 0.1;
    }

    return Math.min(1, score);
  }

  /**
   * Generate human-readable reason
   */
  private generateReason(
    dest: any,
    contextMatch: ContextualRecommendation['contextMatch'],
    context: ContextualRecommendationContext
  ): string {
    const reasons: string[] = [];

    if (contextMatch.temporal && context.temporal?.timeOfDay) {
      reasons.push(`Perfect for ${context.temporal.timeOfDay}`);
    }

    if (contextMatch.weather && context.weather?.isGoodWeather) {
      reasons.push('Great for current weather');
    }

    if (contextMatch.events) {
      reasons.push('Near upcoming events');
    }

    if (contextMatch.userState && context.userState?.tripType) {
      reasons.push(`Ideal for ${context.userState.tripType} trips`);
    }

    if (dest.trending_score && dest.trending_score > 0.7) {
      reasons.push('Trending now');
    }

    if (dest.michelin_stars && dest.michelin_stars > 0) {
      reasons.push(`${dest.michelin_stars} Michelin star${dest.michelin_stars > 1 ? 's' : ''}`);
    }

    return reasons.length > 0
      ? reasons.join(' • ')
      : 'Recommended based on your context';
  }
}

export const contextualRecommendationsService = new ContextualRecommendationsService();

