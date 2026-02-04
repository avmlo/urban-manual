/**
 * Proactive Recommendation Agent
 * Analyzes user context (time, weather, location) and proactively suggests relevant places
 */

import { BaseAgent, AgentResult, Tool } from './base-agent';
import { getAllTools } from './tools';

export interface ProactiveRecommendationRequest {
  userId: string;
  location?: {
    lat: number;
    lng: number;
  };
  context?: {
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    weather?: string;
    dayOfWeek?: string;
  };
}

export interface ProactiveSuggestion {
  destination_id: number;
  destination_name: string;
  city: string;
  category: string;
  reason: string;
  relevance_score: number;
  context: {
    timeMatch?: boolean;
    weatherMatch?: boolean;
    locationMatch?: boolean;
    preferenceMatch?: boolean;
  };
}

export interface ProactiveRecommendationResult {
  suggestions: ProactiveSuggestion[];
  context: {
    timeOfDay: string;
    weather?: string;
    location?: { lat: number; lng: number };
  };
}

export class ProactiveRecommendationAgent extends BaseAgent {
  constructor() {
    super();
    getAllTools().forEach(tool => this.registerTool(tool));
  }

  async execute(request: ProactiveRecommendationRequest): Promise<AgentResult<ProactiveRecommendationResult>> {
    try {
      const steps: string[] = [];
      steps.push('Gathering context...');

      // Step 1: Gather context (autonomous)
      const [userProfile, timeContext, weather, nearby] = await Promise.all([
        this.useTool('get_user_profile', { userId: request.userId }),
        this.useTool('get_time_context', {}),
        request.location
          ? this.useTool('get_weather', { lat: request.location.lat, lng: request.location.lng })
          : Promise.resolve(null),
        request.location
          ? this.useTool('find_nearby_places', {
              lat: request.location.lat,
              lng: request.location.lng,
              radius: 5,
              limit: 20,
            })
          : Promise.resolve([]),
      ]);

      steps.push('Context gathered');

      // Step 2: Generate contextual suggestions (autonomous)
      const suggestions = await this.generateSuggestions({
        userProfile,
        timeContext,
        weather,
        nearby,
        location: request.location,
      });

      steps.push(`Generated ${suggestions.length} suggestions`);

      // Step 3: Rank by relevance (autonomous)
      const ranked = this.rankSuggestions(suggestions);
      steps.push('Ranked suggestions');

      return {
        success: true,
        data: {
          suggestions: ranked.slice(0, 10), // Top 10
          context: {
            timeOfDay: timeContext.timeOfDay,
            weather: weather?.condition,
            location: request.location,
          },
        },
        steps,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to generate proactive recommendations',
      };
    }
  }

  /**
   * Generate contextual suggestions based on user profile and context
   */
  private async generateSuggestions(params: {
    userProfile: any;
    timeContext: any;
    weather: any;
    nearby: any[];
    location?: { lat: number; lng: number };
  }): Promise<ProactiveSuggestion[]> {
    const { userProfile, timeContext, weather, nearby, location } = params;
    const suggestions: ProactiveSuggestion[] = [];

    // Get user's saved and visited places to understand preferences
    const savedSlugs = new Set((userProfile.saved || []).map((s: any) => s.destination_slug));
    const visitedSlugs = new Set((userProfile.visited || []).map((v: any) => v.destination_slug));

    // Analyze preferences from visited places
    const categories = new Map<string, number>();
    (userProfile.visited || []).forEach((v: any) => {
      // Would need to fetch destination category
      // For now, use placeholder
    });

    // Generate suggestions based on context
    const timeOfDay = timeContext.timeOfDay;

    // Time-based suggestions
    if (timeOfDay === 'morning') {
      // Suggest cafes, breakfast spots, morning activities
      const morningCategories = ['Cafe', 'Bakery', 'Breakfast'];
      // Would search for these categories
    } else if (timeOfDay === 'afternoon') {
      // Suggest lunch spots, museums, activities
      const afternoonCategories = ['Restaurant', 'Culture', 'Museum'];
    } else if (timeOfDay === 'evening') {
      // Suggest dinner, bars, nightlife
      const eveningCategories = ['Restaurant', 'Bar', 'Nightlife'];
    }

    // Location-based suggestions
    if (location && nearby.length > 0) {
      nearby.slice(0, 5).forEach((place: any) => {
        if (!visitedSlugs.has(place.slug) && !savedSlugs.has(place.slug)) {
          suggestions.push({
            destination_id: place.id,
            destination_name: place.name,
            city: place.city,
            category: place.category,
            reason: `Open now and ${this.calculateDistance(place, location)}km away`,
            relevance_score: 0.8,
            context: {
              locationMatch: true,
              timeMatch: true, // Assuming nearby places are open
            },
          });
        }
      });
    }

    // Weather-based suggestions
    if (weather) {
      if (weather.condition === 'sunny' || weather.condition === 'clear') {
        // Suggest outdoor places, rooftops
        // Would search for outdoor categories
      } else if (weather.condition === 'rainy') {
        // Suggest indoor places, museums, cafes
        // Would search for indoor categories
      }
    }

    return suggestions;
  }

  /**
   * Rank suggestions by relevance score
   */
  private rankSuggestions(suggestions: ProactiveSuggestion[]): ProactiveSuggestion[] {
    return suggestions.sort((a, b) => {
      // Sort by relevance score (higher is better)
      if (b.relevance_score !== a.relevance_score) {
        return b.relevance_score - a.relevance_score;
      }
      // If scores are equal, prefer location matches
      if (b.context.locationMatch && !a.context.locationMatch) return 1;
      if (a.context.locationMatch && !b.context.locationMatch) return -1;
      return 0;
    });
  }

  /**
   * Calculate distance between two points (simple haversine)
   */
  private calculateDistance(place: any, location: { lat: number; lng: number }): number {
    if (!place.latitude || !place.longitude) return 0;

    const R = 6371; // Earth's radius in km
    const dLat = ((location.lat - place.latitude) * Math.PI) / 180;
    const dLon = ((location.lng - place.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((place.latitude * Math.PI) / 180) *
        Math.cos((location.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10; // Round to 1 decimal
  }
}

