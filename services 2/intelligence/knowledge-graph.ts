/**
 * Knowledge Graph Service
 * Manages destination relationships and similarity networks
 */

import { createServiceRoleClient } from '@/lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface DestinationRelationship {
  source_id: string;
  target_id: string;
  relationship_type: 'similar' | 'nearby' | 'alternative' | 'complementary' | 'inspired_by' | 'trendsetter' | 'sequential' | 'thematic';
  strength: number; // 0-1
  reason?: string;
}

export class KnowledgeGraphService {
  private supabase;
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      this.supabase = null;
      console.warn('KnowledgeGraphService: Supabase client not available');
    }
    
    const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Find similar destinations
   */
  async findSimilar(
    destinationId: string,
    limit: number = 5
  ): Promise<Array<{ destination_id: string; similarity: number; reason: string }>> {
    if (!this.supabase) return [];
    
    try {
      // Check if relationships exist
      const { data: relationships } = await this.supabase
        .from('destination_relationships')
        .select('target_destination_id, strength, metadata')
        .eq('source_destination_id', destinationId)
        .eq('relationship_type', 'similar')
        .order('strength', { ascending: false })
        .limit(limit);

      if (relationships && relationships.length > 0) {
        return relationships.map(r => ({
          destination_id: r.target_destination_id,
          similarity: r.strength,
          reason: r.metadata?.reason || 'Similar destination',
        }));
      }

      // If no relationships exist, compute similarity on-the-fly
      return await this.computeSimilarity(destinationId, limit);
    } catch (error) {
      console.error('Error finding similar destinations:', error);
      return [];
    }
  }

  /**
   * Find nearby destinations
   */
  async findNearby(
    destinationId: string,
    radiusKm: number = 5,
    limit: number = 10
  ): Promise<Array<{ destination_id: string; distance: number }>> {
    if (!this.supabase) return [];
    
    try {
      // Get destination location
      const { data: dest } = await this.supabase
        .from('destinations')
        .select('id, latitude, longitude')
        .eq('id', destinationId)
        .single();

      if (!dest || !dest.latitude || !dest.longitude) {
        return [];
      }

      // Find destinations within radius (simplified - would use PostGIS in production)
      const { data: nearby } = await this.supabase
        .from('destinations')
        .select('id, latitude, longitude')
        .neq('id', destinationId)
        .limit(100);

      if (!nearby) {
        return [];
      }

      const results: Array<{ destination_id: string; distance: number }> = [];

      nearby.forEach(other => {
        if (other.latitude && other.longitude) {
          const distance = this.calculateDistance(
            dest.latitude,
            dest.longitude,
            other.latitude,
            other.longitude
          );

          if (distance <= radiusKm) {
            results.push({
              destination_id: other.id,
              distance: Math.round(distance * 10) / 10,
            });
          }
        }
      });

      return results.sort((a, b) => a.distance - b.distance).slice(0, limit);
    } catch (error) {
      console.error('Error finding nearby destinations:', error);
      return [];
    }
  }

  /**
   * Find complementary destinations (e.g., restaurant + bar)
   */
  async findComplementary(
    destinationId: string,
    limit: number = 5
  ): Promise<Array<{ destination_id: string; reason: string }>> {
    if (!this.supabase) return [];
    
    try {
      const { data: dest } = await this.supabase
        .from('destinations')
        .select('id, category, city, tags')
        .eq('id', destinationId)
        .single();

      if (!dest) {
        return [];
      }

      // Find destinations in same city with different but complementary categories
      const complementaryCategories: Record<string, string[]> = {
        'Dining': ['Bar', 'Cafe'],
        'Hotel': ['Dining', 'Bar'],
        'Cafe': ['Dining', 'Culture'],
        'Bar': ['Dining', 'Culture'],
      };

      const targets = complementaryCategories[dest.category || ''] || [];

      if (targets.length === 0) {
        return [];
      }

      const { data: complementary } = await this.supabase
        .from('destinations')
        .select('id, name, category')
        .eq('city', dest.city)
        .in('category', targets)
        .neq('id', destinationId)
        .limit(limit);

      return (complementary || []).map(c => ({
        destination_id: c.id,
        reason: `Great ${c.category?.toLowerCase()} to pair with ${dest.category?.toLowerCase()}`,
      }));
    } catch (error) {
      console.error('Error finding complementary destinations:', error);
      return [];
    }
  }

  /**
   * Compute similarity between destinations on-the-fly
   */
  private async computeSimilarity(
    destinationId: string,
    limit: number
  ): Promise<Array<{ destination_id: string; similarity: number; reason: string }>> {
    if (!this.supabase) return [];
    
    try {
      const { data: dest } = await this.supabase
        .from('destinations')
        .select('id, name, city, category, tags, description, michelin_stars, rating, price_level')
        .eq('id', destinationId)
        .single();

      if (!dest) {
        return [];
      }

      // Find candidates in same category or city
      let query = this.supabase
        .from('destinations')
        .select('id, name, city, category, tags, description, michelin_stars, rating, price_level')
        .neq('id', destinationId);

      if (dest.category) {
        query = query.eq('category', dest.category);
      } else if (dest.city) {
        query = query.eq('city', dest.city);
      }

      const { data: candidates } = await query.limit(50);

      if (!candidates || candidates.length === 0) {
        return [];
      }

      // Calculate similarity scores
      const similarities = candidates.map(candidate => {
        let score = 0;
        let factors = 0;

        // Category match
        if (candidate.category === dest.category) {
          score += 0.3;
        }
        factors++;

        // City match
        if (candidate.city === dest.city) {
          score += 0.2;
        }
        factors++;

        // Tags overlap
        if (dest.tags && candidate.tags && Array.isArray(dest.tags) && Array.isArray(candidate.tags)) {
          const commonTags = dest.tags.filter(t => candidate.tags.includes(t));
          score += (commonTags.length / Math.max(dest.tags.length, candidate.tags.length, 1)) * 0.2;
        }
        factors++;

        // Rating similarity
        if (dest.rating && candidate.rating) {
          const ratingDiff = Math.abs(dest.rating - candidate.rating) / 5;
          score += (1 - ratingDiff) * 0.15;
        }
        factors++;

        // Price level similarity
        if (dest.price_level && candidate.price_level) {
          const priceDiff = Math.abs(dest.price_level - candidate.price_level) / 4;
          score += (1 - priceDiff) * 0.15;
        }
        factors++;

        return {
          destination_id: candidate.id,
          similarity: score / factors,
          reason: this.generateSimilarityReason(dest, candidate),
        };
      });

      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      console.error('Error computing similarity:', error);
      return [];
    }
  }

  private generateSimilarityReason(dest: any, candidate: any): string {
    const reasons: string[] = [];

    if (dest.category === candidate.category) {
      reasons.push('same category');
    }
    if (dest.city === candidate.city) {
      reasons.push('same city');
    }
    if (dest.tags && candidate.tags) {
      const commonTags = dest.tags.filter((t: string) => candidate.tags.includes(t));
      if (commonTags.length > 0) {
        reasons.push(`similar tags (${commonTags.slice(0, 2).join(', ')})`);
      }
    }

    return reasons.length > 0 ? reasons.join(', ') : 'Similar destination';
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Store relationship in knowledge graph
   */
  async storeRelationship(relationship: DestinationRelationship): Promise<void> {
    if (!this.supabase) return;
    
    try {
      await this.supabase.from('destination_relationships').upsert({
        source_destination_id: relationship.source_id,
        target_destination_id: relationship.target_id,
        relationship_type: relationship.relationship_type,
        strength: relationship.strength,
        metadata: {
          reason: relationship.reason,
        },
      }, {
        onConflict: 'source_destination_id,target_destination_id,relationship_type',
      });
    } catch (error) {
      console.error('Error storing relationship:', error);
    }
  }
}

export const knowledgeGraphService = new KnowledgeGraphService();

