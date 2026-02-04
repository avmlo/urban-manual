/**
 * Taste Profile Evolution Service
 * Tracks and learns from user preference changes over time
 */

import { createServiceRoleClient } from '@/lib/supabase-server';

export interface TasteProfile {
  userId: string;
  preferences: {
    categories: Array<{ category: string; weight: number; trend: 'increasing' | 'decreasing' | 'stable' }>;
    cities: Array<{ city: string; weight: number; trend: 'increasing' | 'decreasing' | 'stable' }>;
    priceRange: { min: number; max: number; trend: 'increasing' | 'decreasing' | 'stable' };
    travelStyle: string;
    dietaryPreferences?: string[];
  };
  evolution: Array<{
    timestamp: Date;
    change: string;
    confidence: number;
  }>;
  contextualProfiles: {
    business?: TasteProfile['preferences'];
    leisure?: TasteProfile['preferences'];
    romantic?: TasteProfile['preferences'];
    family?: TasteProfile['preferences'];
  };
  lastUpdated: Date;
}

export class TasteProfileEvolutionService {
  private supabase;

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      this.supabase = null;
    }
  }

  /**
   * Get or build taste profile for a user
   */
  async getTasteProfile(userId: string): Promise<TasteProfile | null> {
    if (!this.supabase) return null;

    try {
      // Get user interactions over time
      const interactions = await this.getUserInteractions(userId);

      // Analyze preference evolution
      const preferences = await this.analyzePreferences(interactions);
      const evolution = await this.analyzeEvolution(userId, interactions);
      const contextualProfiles = await this.buildContextualProfiles(userId, interactions);

      return {
        userId,
        preferences,
        evolution,
        contextualProfiles,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Error getting taste profile:', error);
      return null;
    }
  }

  /**
   * Update taste profile based on new interactions
   */
  async updateTasteProfile(userId: string, newInteractions: Array<{
    type: 'view' | 'save' | 'visit';
    destinationId: number;
    timestamp: Date;
    context?: string;
  }>): Promise<void> {
    if (!this.supabase) return;

    try {
      // Get current profile
      const currentProfile = await this.getTasteProfile(userId);
      
      // Analyze changes
      const changes = this.detectChanges(currentProfile, newInteractions);

      // Store evolution history
      for (const change of changes) {
        await this.supabase
          .from('user_preferences_evolution')
          .insert({
            user_id: userId,
            change_type: change.type,
            change_description: change.description,
            confidence: change.confidence,
            metadata: change.metadata,
          });
      }
    } catch (error) {
      console.error('Error updating taste profile:', error);
    }
  }

  private async getUserInteractions(userId: string): Promise<Array<{
    type: string;
    destinationId: number;
    timestamp: Date;
    context?: string;
  }>> {
    if (!this.supabase) return [];

    try {
      // Get views, saves, visits
      const { data: interactions } = await this.supabase
        .from('user_interactions')
        .select('interaction_type, destination_id, created_at, context')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      const { data: visits } = await this.supabase
        .from('visited_places')
        .select('destination_slug, visited_at')
        .eq('user_id', userId)
        .order('visited_at', { ascending: true });

      // Convert to unified format
      const allInteractions: Array<{
        type: string;
        destinationId: number;
        timestamp: Date;
        context?: string;
      }> = [];

      if (interactions) {
        for (const interaction of interactions) {
          if (interaction.destination_id) {
            allInteractions.push({
              type: interaction.interaction_type,
              destinationId: interaction.destination_id,
              timestamp: new Date(interaction.created_at),
              context: interaction.context ? JSON.stringify(interaction.context) : undefined,
            });
          }
        }
      }

      // Add visits (need to convert slugs to IDs)
      if (visits && visits.length > 0) {
        const slugs = visits.map((v: any) => v.destination_slug);
        const { data: destinations } = await this.supabase
          .from('destinations')
          .select('id, slug')
          .in('slug', slugs);

        const slugToId = new Map(destinations?.map((d: any) => [d.slug, d.id]) || []);

        for (const visit of visits) {
          const destId = slugToId.get(visit.destination_slug);
          if (destId) {
            allInteractions.push({
              type: 'visit',
              destinationId: destId,
              timestamp: new Date(visit.visited_at),
            });
          }
        }
      }

      return allInteractions;
    } catch (error) {
      console.error('Error getting user interactions:', error);
      return [];
    }
  }

  private async analyzePreferences(
    interactions: Array<{ type: string; destinationId: number; timestamp: Date }>
  ): Promise<TasteProfile['preferences']> {
    // Get destination details for interactions
    const destinationIds = [...new Set(interactions.map(i => i.destinationId))];
    
    if (!this.supabase || destinationIds.length === 0) {
      return {
        categories: [],
        cities: [],
        priceRange: { min: 0, max: 4, trend: 'stable' },
        travelStyle: 'unknown',
      };
    }

    try {
      const { data: destinations } = await this.supabase
        .from('destinations')
        .select('id, category, city, price_level')
        .in('id', destinationIds);

      if (!destinations) {
        return {
          categories: [],
          cities: [],
          priceRange: { min: 0, max: 4, trend: 'stable' },
          travelStyle: 'unknown',
        };
      }

      // Count preferences
      const categoryCounts: Map<string, number> = new Map();
      const cityCounts: Map<string, number> = new Map();
      const priceLevels: number[] = [];

      for (const interaction of interactions) {
        const dest = destinations.find((d: any) => d.id === interaction.destinationId);
        if (!dest) continue;

        if (dest.category) {
          categoryCounts.set(dest.category, (categoryCounts.get(dest.category) || 0) + 1);
        }
        if (dest.city) {
          cityCounts.set(dest.city, (cityCounts.get(dest.city) || 0) + 1);
        }
        if (dest.price_level) {
          priceLevels.push(dest.price_level);
        }
      }

      // Calculate weights (normalized)
      const totalInteractions = interactions.length;
      const categories = Array.from(categoryCounts.entries())
        .map(([category, count]) => ({
          category,
          weight: count / totalInteractions,
          trend: 'stable' as const,
        }))
        .sort((a, b) => b.weight - a.weight);

      const cities = Array.from(cityCounts.entries())
        .map(([city, count]) => ({
          city,
          weight: count / totalInteractions,
          trend: 'stable' as const,
        }))
        .sort((a, b) => b.weight - a.weight);

      const avgPrice = priceLevels.length > 0
        ? priceLevels.reduce((a, b) => a + b, 0) / priceLevels.length
        : 2;

      return {
        categories,
        cities,
        priceRange: {
          min: Math.max(0, Math.floor(avgPrice - 1)),
          max: Math.min(4, Math.ceil(avgPrice + 1)),
          trend: 'stable',
        },
        travelStyle: 'unknown', // Would be inferred from patterns
      };
    } catch (error) {
      console.error('Error analyzing preferences:', error);
      return {
        categories: [],
        cities: [],
        priceRange: { min: 0, max: 4, trend: 'stable' },
        travelStyle: 'unknown',
      };
    }
  }

  private async analyzeEvolution(
    userId: string,
    interactions: Array<{ type: string; destinationId: number; timestamp: Date }>
  ): Promise<TasteProfile['evolution']> {
    if (!this.supabase) return [];

    try {
      // Get evolution history from database
      const { data: history } = await this.supabase
        .from('user_preferences_evolution')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      return (history || []).map((h: any) => ({
        timestamp: new Date(h.created_at),
        change: h.change_description,
        confidence: h.confidence || 0.5,
      }));
    } catch (error) {
      console.error('Error analyzing evolution:', error);
      return [];
    }
  }

  private async buildContextualProfiles(
    userId: string,
    interactions: Array<{ type: string; destinationId: number; timestamp: Date; context?: string }>
  ): Promise<TasteProfile['contextualProfiles']> {
    // Analyze preferences by context (business, leisure, etc.)
    // For now, return empty - would need context tagging in interactions
    return {};
  }

  private detectChanges(
    currentProfile: TasteProfile | null,
    newInteractions: Array<{ type: string; destinationId: number; timestamp: Date; context?: string }>
  ): Array<{ type: string; description: string; confidence: number; metadata?: any }> {
    // Detect preference changes from new interactions
    // For now, placeholder
    return [];
  }
}

export const tasteProfileEvolutionService = new TasteProfileEvolutionService();

