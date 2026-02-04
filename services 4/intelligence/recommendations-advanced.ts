/**
 * Advanced Recommendation Engine
 * Hybrid approach: Collaborative Filtering + Content-Based + AI
 */

import { createServiceRoleClient } from '@/lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface RecommendationResult {
  destination_id: string;
  score: number;
  reason: string;
  factors: {
    collaborative?: number;
    content?: number;
    popularity?: number;
    personalization?: number;
    relationship?: number;
  };
}

export class AdvancedRecommendationEngine {
  private supabase;
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      this.supabase = null;
      console.warn('AdvancedRecommendationEngine: Supabase client not available');
    }
    
    const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Get personalized recommendations for a user
   */
  async getRecommendations(
    userId: string,
    limit: number = 20,
    options?: {
      city?: string;
      category?: string;
      excludeVisited?: boolean;
      excludeSaved?: boolean;
    }
  ): Promise<RecommendationResult[]> {
    try {
      // Get all components
      const [collaborativeScores, contentScores, popularityScores, aiScores, relationshipScores] = await Promise.all([
        this.getCollaborativeScores(userId, options),
        this.getContentBasedScores(userId, options),
        this.getPopularityScores(options),
        this.getAIPersonalizationScores(userId, options),
        this.getRelationshipBasedScores(userId, options),
      ]);

      // Combine scores with weights
      const combined = this.combineScores(
        collaborativeScores,
        contentScores,
        popularityScores,
        aiScores,
        relationshipScores,
        userId
      );

      // Apply filters
      let filtered = combined;
      if (options?.excludeVisited) {
        const visited = await this.getVisitedDestinations(userId);
        filtered = filtered.filter(r => !visited.has(r.destination_id));
      }
      if (options?.excludeSaved) {
        const saved = await this.getSavedDestinations(userId);
        filtered = filtered.filter(r => !saved.has(r.destination_id));
      }

      // Sort by score and limit
      return filtered
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  }

  /**
   * Collaborative Filtering: "Users like you also liked..."
   */
  private async getCollaborativeScores(
    userId: string,
    options?: { city?: string; category?: string }
  ): Promise<Map<string, number>> {
    if (!this.supabase) return new Map();
    
    try {
      // Get user's interaction history
      const { data: userInteractions } = await this.supabase
        .from('user_interactions')
        .select('destination_id')
        .eq('user_id', userId);

      if (!userInteractions || userInteractions.length === 0) {
        return new Map();
      }

      const userDestinationIds = new Set(userInteractions.map(i => i.destination_id));

      // Find similar users (users who interacted with same destinations)
      const { data: similarUsers } = await this.supabase
        .from('user_interactions')
        .select('user_id, destination_id')
        .in('destination_id', Array.from(userDestinationIds))
        .neq('user_id', userId);

      if (!similarUsers || similarUsers.length === 0) {
        return new Map();
      }

      // Count how many similar users interacted with each destination
      const destinationCounts = new Map<string, number>();
      const similarUserIds = new Set(similarUsers.map(u => u.user_id));

      const { data: similarUserInteractions } = await this.supabase
        .from('user_interactions')
        .select('destination_id')
        .in('user_id', Array.from(similarUserIds))
        .not('destination_id', 'in', `(${Array.from(userDestinationIds).join(',')})`);

      if (similarUserInteractions) {
        similarUserInteractions.forEach(interaction => {
          const current = destinationCounts.get(interaction.destination_id) || 0;
          destinationCounts.set(interaction.destination_id, current + 1);
        });
      }

      // Normalize scores (0-1 range)
      const maxCount = Math.max(...Array.from(destinationCounts.values()), 1);
      const scores = new Map<string, number>();
      destinationCounts.forEach((count, destinationId) => {
        scores.set(destinationId, count / maxCount);
      });

      return scores;
    } catch (error) {
      console.error('Error in collaborative filtering:', error);
      return new Map();
    }
  }

  /**
   * Content-Based Filtering: Based on destination attributes
   */
  private async getContentBasedScores(
    userId: string,
    options?: { city?: string; category?: string }
  ): Promise<Map<string, number>> {
    if (!this.supabase) return new Map();
    
    try {
      // Get user's saved destinations and their attributes
      const { data: saved } = await this.supabase
        .from('saved_places')
        .select(`
          destination_slug,
          destination:destinations!inner (
            id,
            city,
            category,
            tags,
            michelin_stars,
            rating,
            price_level
          )
        `)
        .eq('user_id', userId);

      if (!saved || saved.length === 0) {
        return new Map();
      }

      // Extract user preferences from saved destinations
      const preferences = {
        cities: new Set<string>(),
        categories: new Set<string>(),
        tags: new Set<string>(),
        avgRating: 0,
        avgPriceLevel: 0,
        hasMichelin: 0,
      };

      let ratingSum = 0;
      let priceSum = 0;
      let count = 0;

      saved.forEach((item: any) => {
        const dest = item.destination;
        if (!dest || typeof dest !== 'object') return;

        const destination = dest as any;
        
        if (destination.city) preferences.cities.add(destination.city);
        if (destination.category) preferences.categories.add(destination.category);
        if (destination.tags && Array.isArray(destination.tags)) {
          destination.tags.forEach((tag: string) => preferences.tags.add(tag));
        }
        if (destination.rating) {
          ratingSum += destination.rating;
          count++;
        }
        if (destination.price_level) {
          priceSum += destination.price_level;
        }
        if (destination.michelin_stars && destination.michelin_stars > 0) {
          preferences.hasMichelin++;
        }
      });

      preferences.avgRating = count > 0 ? ratingSum / count : 0;
      preferences.avgPriceLevel = saved.length > 0 ? priceSum / saved.length : 0;

      if (!this.supabase) return new Map();
      
      // Find destinations matching preferences
      let query = this.supabase
        .from('destinations')
        .select('id, city, category, tags, rating, price_level, michelin_stars');

      if (options?.city) {
        query = query.ilike('city', `%${options.city}%`);
      }
      if (options?.category) {
        query = query.ilike('category', `%${options.category}%`);
      }

      const { data: candidates } = await query.limit(200);

      if (!candidates) {
        return new Map();
      }

      // Score candidates based on similarity to preferences
      const scores = new Map<string, number>();
      candidates.forEach(dest => {
        let score = 0;
        let factors = 0;

        // City match
        if (preferences.cities.has(dest.city)) {
          score += 0.3;
        }
        factors++;

        // Category match
        if (preferences.categories.has(dest.category)) {
          score += 0.2;
        }
        factors++;

        // Tags overlap
        if (dest.tags && Array.isArray(dest.tags)) {
          const commonTags = dest.tags.filter((tag: string) => preferences.tags.has(tag));
          score += (commonTags.length / Math.max(preferences.tags.size, 1)) * 0.2;
        }
        factors++;

        // Rating similarity
        if (dest.rating && preferences.avgRating > 0) {
          const ratingDiff = Math.abs(dest.rating - preferences.avgRating) / 5;
          score += (1 - ratingDiff) * 0.15;
        }
        factors++;

        // Price level similarity
        if (dest.price_level && preferences.avgPriceLevel > 0) {
          const priceDiff = Math.abs(dest.price_level - preferences.avgPriceLevel) / 4;
          score += (1 - priceDiff) * 0.1;
        }
        factors++;

        // Michelin preference
        if (preferences.hasMichelin > saved.length * 0.5 && dest.michelin_stars > 0) {
          score += 0.05;
        }

        // Normalize by factors
        score = score / factors;
        scores.set(dest.id, score);
      });

      return scores;
    } catch (error) {
      console.error('Error in content-based filtering:', error);
      return new Map();
    }
  }

  /**
   * Popularity scores (views, saves, visits)
   */
  private async getPopularityScores(
    options?: { city?: string; category?: string }
  ): Promise<Map<string, number>> {
    if (!this.supabase) return new Map();
    
    try {
      // Get popularity from visit_history and saved_destinations
      let query = this.supabase
        .from('destinations')
        .select(`
          id,
          visit_history (id),
          saved_destinations (id)
        `);

      if (options?.city) {
        query = query.ilike('city', `%${options.city}%`);
      }
      if (options?.category) {
        query = query.ilike('category', `%${options.category}%`);
      }

      const { data: destinations } = await query.limit(500);

      if (!destinations) {
        return new Map();
      }

      const scores = new Map<string, number>();
      let maxScore = 0;

      destinations.forEach((dest: any) => {
        const visits = dest.visit_history?.length || 0;
        const saves = dest.saved_destinations?.length || 0;
        
        // Popularity formula: saves_weighted_more
        const score = (saves * 3) + (visits * 1);
        scores.set(dest.id, score);
        maxScore = Math.max(maxScore, score);
      });

      // Normalize to 0-1
      if (maxScore > 0) {
        scores.forEach((score, id) => {
          scores.set(id, score / maxScore);
        });
      }

      return scores;
    } catch (error) {
      console.error('Error getting popularity scores:', error);
      return new Map();
    }
  }

  /**
   * AI-based personalization scores
   */
  private async getAIPersonalizationScores(
    userId: string,
    options?: { city?: string; category?: string }
  ): Promise<Map<string, number>> {
    // For now, return empty map - can be enhanced with Gemini embeddings
    // In production, use text-embedding-004 to create user and destination embeddings
    // Then compute cosine similarity
    return new Map();
  }

  /**
   * Relationship-based scores using destination_relationships table
   * Uses relationship strength scores from the knowledge graph
   */
  private async getRelationshipBasedScores(
    userId: string,
    options?: { city?: string; category?: string }
  ): Promise<Map<string, number>> {
    if (!this.supabase) return new Map();

    try {
      // Get destinations the user has interacted with (saved, visited, or interacted)
      const [savedData, visitedData, interactedData] = await Promise.all([
        this.supabase
          .from('saved_places')
          .select('destination_slug')
          .eq('user_id', userId),
        this.supabase
          .from('visit_history')
          .select('destination_id')
          .eq('user_id', userId),
        this.supabase
          .from('user_interactions')
          .select('destination_id')
          .eq('user_id', userId),
      ]);

      // Get destination IDs from slugs
      const savedSlugs = (savedData.data || []).map(s => s.destination_slug);
      let sourceDestinationIds: Set<string> = new Set();

      if (savedSlugs.length > 0) {
        const { data: destinations } = await this.supabase
          .from('destinations')
          .select('id')
          .in('slug', savedSlugs);

        if (destinations) {
          destinations.forEach(d => sourceDestinationIds.add(d.id));
        }
      }

      // Add visited and interacted destination IDs
      (visitedData.data || []).forEach(v => sourceDestinationIds.add(v.destination_id));
      (interactedData.data || []).forEach(i => sourceDestinationIds.add(i.destination_id));

      if (sourceDestinationIds.size === 0) {
        return new Map();
      }

      // Get related destinations from destination_relationships
      // Weight by relationship strength score
      const { data: relationships } = await this.supabase
        .from('destination_relationships')
        .select('source_destination_id, target_destination_id, relationship_type, strength, metadata')
        .in('source_destination_id', Array.from(sourceDestinationIds))
        .order('strength', { ascending: false });

      if (!relationships || relationships.length === 0) {
        return new Map();
      }

      // Apply city and category filters if specified
      const targetIds = relationships.map(r => r.target_destination_id);
      let query = this.supabase
        .from('destinations')
        .select('id, city, category')
        .in('id', targetIds);

      if (options?.city) {
        query = query.ilike('city', `%${options.city}%`);
      }
      if (options?.category) {
        query = query.ilike('category', `%${options.category}%`);
      }

      const { data: validDestinations } = await query;
      const validDestinationIds = new Set((validDestinations || []).map(d => d.id));

      // Calculate weighted scores based on relationship strength and type
      const relationshipTypeWeights: Record<string, number> = {
        'similar': 1.0,        // Strongest signal - user likes X, will like similar Y
        'complementary': 0.8,  // Strong - pairs well together
        'alternative': 0.7,    // Good - alternative option
        'thematic': 0.6,       // Moderate - shares theme/vibe
        'sequential': 0.5,     // Moderate - logical next step
        'inspired_by': 0.4,    // Lower - indirect connection
        'trendsetter': 0.3,    // Lower - trend-based
        'nearby': 0.2,         // Lowest - just location-based
      };

      const scores = new Map<string, number>();
      const destinationCounts = new Map<string, number>(); // Track how many sources recommend each destination

      relationships.forEach(rel => {
        // Only include destinations that passed filters
        if (!validDestinationIds.has(rel.target_destination_id)) {
          return;
        }

        const typeWeight = relationshipTypeWeights[rel.relationship_type] || 0.5;
        const strengthScore = rel.strength || 0.5; // Use the relationship strength from DB

        // Combined score: relationship type weight * strength score
        const score = typeWeight * strengthScore;

        // If multiple sources recommend the same destination, take the max score
        const currentScore = scores.get(rel.target_destination_id) || 0;
        scores.set(rel.target_destination_id, Math.max(currentScore, score));

        // Count how many different sources recommend this destination
        const count = destinationCounts.get(rel.target_destination_id) || 0;
        destinationCounts.set(rel.target_destination_id, count + 1);
      });

      // Boost scores for destinations recommended by multiple sources
      // This indicates stronger consensus
      scores.forEach((score, destinationId) => {
        const count = destinationCounts.get(destinationId) || 1;
        // Boost by up to 30% for destinations recommended by multiple sources
        const consensusBoost = Math.min(0.3, (count - 1) * 0.1);
        scores.set(destinationId, Math.min(1.0, score * (1 + consensusBoost)));
      });

      return scores;
    } catch (error) {
      console.error('Error in relationship-based scoring:', error);
      return new Map();
    }
  }

  /**
   * Combine all scores with weights
   */
  private combineScores(
    collaborative: Map<string, number>,
    content: Map<string, number>,
    popularity: Map<string, number>,
    ai: Map<string, number>,
    relationship: Map<string, number>,
    userId: string
  ): RecommendationResult[] {
    const weights = {
      collaborative: 0.25,
      content: 0.20,
      popularity: 0.15,
      personalization: 0.15, // AI-based
      relationship: 0.25,     // NEW: Relationship strength from knowledge graph
    };

    const allDestinationIds = new Set([
      ...collaborative.keys(),
      ...content.keys(),
      ...popularity.keys(),
      ...ai.keys(),
      ...relationship.keys(),
    ]);

    const results: RecommendationResult[] = [];

    allDestinationIds.forEach(destinationId => {
      const collabScore = collaborative.get(destinationId) || 0;
      const contentScore = content.get(destinationId) || 0;
      const popScore = popularity.get(destinationId) || 0;
      const aiScore = ai.get(destinationId) || 0;
      const relationshipScore = relationship.get(destinationId) || 0;

      const combinedScore =
        collabScore * weights.collaborative +
        contentScore * weights.content +
        popScore * weights.popularity +
        aiScore * weights.personalization +
        relationshipScore * weights.relationship;

      // Generate reason
      const reason = this.generateReason(
        collabScore,
        contentScore,
        popScore,
        aiScore,
        relationshipScore,
        weights
      );

      results.push({
        destination_id: destinationId,
        score: combinedScore,
        reason,
        factors: {
          collaborative: collabScore,
          content: contentScore,
          popularity: popScore,
          personalization: aiScore,
          relationship: relationshipScore,
        },
      });
    });

    return results;
  }

  private generateReason(
    collab: number,
    content: number,
    pop: number,
    ai: number,
    relationship: number,
    weights: any
  ): string {
    const reasons: string[] = [];

    if (relationship > 0.6) {
      reasons.push('Related to places you love');
    } else if (collab > 0.5) {
      reasons.push('Users with similar tastes loved this');
    }
    if (content > 0.5) {
      reasons.push('Matches your preferences');
    }
    if (pop > 0.7) {
      reasons.push('Highly popular');
    }
    if (reasons.length === 0) {
      reasons.push('Recommended for you');
    }

    return reasons.join(' • ');
  }

  private async getVisitedDestinations(userId: string): Promise<Set<string>> {
    if (!this.supabase) return new Set();
    
    const { data } = await this.supabase
      .from('visit_history')
      .select('destination_id')
      .eq('user_id', userId);

    return new Set((data || []).map(v => v.destination_id));
  }

  private async getSavedDestinations(userId: string): Promise<Set<string>> {
    if (!this.supabase) return new Set();
    
    const { data } = await this.supabase
      .from('saved_places')
      .select('destination_slug')
      .eq('user_id', userId);

    // Note: This now returns slugs, not IDs. If IDs are needed, convert via destinations table.
    const slugs = (data || []).map(v => v.destination_slug).filter(Boolean);
    return new Set(slugs);
  }
}

export const advancedRecommendationEngine = new AdvancedRecommendationEngine();

