/**
 * Itinerary Intelligence Service
 * AI-powered itinerary generation and optimization
 */

import { createServiceRoleClient } from '@/lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { knowledgeGraphService } from './knowledge-graph';

export interface ItineraryItem {
  destination_id: string;
  order: number;
  day?: number;
  time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night';
  duration_minutes?: number;
  notes?: string;
}

export interface Itinerary {
  id?: string;
  city: string;
  duration_days: number;
  items: ItineraryItem[];
  optimization_criteria?: {
    minimize_travel?: boolean;
    maximize_experience?: boolean;
    budget_constraint?: number;
    category_balance?: boolean;
  };
}

export class ItineraryIntelligenceService {
  private supabase;
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      this.supabase = null;
      console.warn('ItineraryIntelligenceService: Supabase client not available');
    }
    
    const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Generate itinerary for a city
   */
  async generateItinerary(
    city: string,
    durationDays: number,
    preferences?: {
      categories?: string[];
      budget?: number;
      style?: string;
      mustVisit?: string[];
    },
    userId?: string
  ): Promise<Itinerary | null> {
    if (!this.supabase) return null;
    
    try {
      // Get destinations in city
      const { data: destinations } = await this.supabase
        .from('destinations')
        .select('id, name, category, rating, price_level, tags, description')
        .ilike('city', `%${city}%`)
        .order('rating', { ascending: false })
        .limit(100);

      if (!destinations || destinations.length === 0) {
        return null;
      }

      // Filter by preferences
      let filtered = destinations;
      if (preferences?.categories && preferences.categories.length > 0) {
        filtered = filtered.filter(d => 
          preferences.categories!.some(cat => 
            d.category?.toLowerCase().includes(cat.toLowerCase())
          )
        );
      }

      // Include must-visit destinations
      if (preferences?.mustVisit && preferences.mustVisit.length > 0) {
        const mustVisitIds = preferences.mustVisit;
        filtered = [
          ...filtered.filter(d => mustVisitIds.includes(d.id)),
          ...filtered.filter(d => !mustVisitIds.includes(d.id)),
        ];
      }

      // Generate itinerary using AI or algorithm
      if (this.genAI) {
        return await this.generateWithAI(city, durationDays, filtered, preferences);
      } else {
        return this.generateBasic(city, durationDays, filtered);
      }
    } catch (error) {
      console.error('Error generating itinerary:', error);
      return null;
    }
  }

  /**
   * Generate itinerary using AI
   */
  private async generateWithAI(
    city: string,
    durationDays: number,
    destinations: any[],
    preferences?: any
  ): Promise<Itinerary> {
    const model = this.genAI!.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    const destinationsSummary = destinations.slice(0, 50).map(d => ({
      id: d.id,
      name: d.name,
      category: d.category,
      tags: d.tags || [],
    }));

    const prompt = `Generate a ${durationDays}-day travel itinerary for ${city}.

Available destinations:
${JSON.stringify(destinationsSummary, null, 2)}

Preferences: ${JSON.stringify(preferences || {}, null, 2)}

Create a balanced itinerary with:
- Good mix of categories (dining, culture, relaxation)
- Realistic timing (don't over-schedule)
- Logical sequence (group by location/time)
- Must-visit items included if specified

Return ONLY valid JSON:
{
  "city": "${city}",
  "duration_days": ${durationDays},
  "items": [
    {
      "destination_id": "uuid",
      "order": 1,
      "day": 1,
      "time_of_day": "morning|afternoon|evening",
      "duration_minutes": 120,
      "notes": "brief note"
    }
  ]
}

Return only JSON, no other text:`;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...parsed,
          optimization_criteria: {
            maximize_experience: true,
            category_balance: true,
          },
        };
      }
    } catch (error) {
      console.error('AI itinerary generation failed:', error);
    }

    // Fallback to basic generation
    return this.generateBasic(city, durationDays, destinations);
  }

  /**
   * Basic itinerary generation (no AI)
   */
  private generateBasic(
    city: string,
    durationDays: number,
    destinations: any[]
  ): Itinerary {
    const items: ItineraryItem[] = [];
    const destinationsPerDay = Math.ceil(destinations.length / durationDays);
    
    // Group by category for balance
    const byCategory: Record<string, any[]> = {};
    destinations.forEach(dest => {
      const cat = dest.category || 'Other';
      if (!byCategory[cat]) {
        byCategory[cat] = [];
      }
      byCategory[cat].push(dest);
    });

    let order = 1;
    const timesOfDay: Array<'morning' | 'afternoon' | 'evening'> = ['morning', 'afternoon', 'evening'];

    for (let day = 1; day <= durationDays; day++) {
      const dayItems: any[] = [];
      
      // Select diverse categories per day
      Object.keys(byCategory).forEach(category => {
        const categoryItems = byCategory[category];
        if (categoryItems.length > 0) {
          const item = categoryItems.shift();
          dayItems.push(item);
        }
      });

      // Fill remaining slots with best-rated
      const remaining = destinationsPerDay - dayItems.length;
      const unassigned = destinations.filter(d => 
        !dayItems.some(dayItem => dayItem.id === d.id)
      );
      
      dayItems.push(...unassigned.slice(0, remaining));

      // Assign times
      dayItems.forEach((dest, idx) => {
        items.push({
          destination_id: dest.id,
          order: order++,
          day,
          time_of_day: timesOfDay[idx % timesOfDay.length],
          duration_minutes: 120,
        });
      });
    }

    return {
      city,
      duration_days: durationDays,
      items,
    };
  }

  /**
   * Optimize existing itinerary
   */
  async optimizeItinerary(
    itinerary: Itinerary,
    criteria?: {
      minimize_travel?: boolean;
      maximize_experience?: boolean;
    }
  ): Promise<Itinerary> {
    // For now, return as-is
    // In production, would reorder based on location, opening hours, etc.
    return itinerary;
  }

  /**
   * Save itinerary template
   */
  async saveItinerary(itinerary: Itinerary, userId: string): Promise<string | null> {
    if (!this.supabase) return null;
    
    try {
      const { data, error } = await this.supabase
        .from('itinerary_templates')
        .insert({
          user_id: userId,
          city: itinerary.city,
          duration_days: itinerary.duration_days,
          destinations: itinerary.items.map(item => ({
            id: item.destination_id,
            order: item.order,
            day: item.day,
            time_of_day: item.time_of_day,
            duration_minutes: item.duration_minutes,
            notes: item.notes,
          })),
          optimization_criteria: itinerary.optimization_criteria,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data?.id || null;
    } catch (error) {
      console.error('Error saving itinerary:', error);
      return null;
    }
  }
}

export const itineraryIntelligenceService = new ItineraryIntelligenceService();

