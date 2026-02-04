/**
 * Conversation-Based Itinerary Generation
 * Generate itineraries through natural conversation
 */

import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { routePrompt } from '@/services/ai-gateway';
import { itineraryIntelligenceService, Itinerary } from '@/services/intelligence/itinerary';
import { richQueryContextService } from './rich-query-context';

export interface ConversationItineraryRequest {
  userId: string;
  sessionId: string;
  conversationHistory: Array<{ role: string; content: string }>;
  currentQuery: string;
}

const conversationRequirementsSchema = z.object({
  city: z.string().min(2).max(120).nullable().optional(),
  durationDays: z.number().min(1).max(30).nullable().optional(),
  categories: z.array(z.string().min(2).max(50)).max(8).nullable().optional(),
  budget: z.number().min(0).max(100000).nullable().optional(),
  style: z.string().min(2).max(50).nullable().optional(),
  mustVisit: z.array(z.string().min(2).max(120)).max(10).nullable().optional(),
  needsClarification: z.boolean(),
  clarificationQuestions: z.array(z.string().min(5).max(180)).max(5).nullable().optional(),
  confidence: z.number().min(0).max(1),
});

export class ConversationItineraryService {
  private supabase;

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      this.supabase = null;
      console.debug('ConversationItineraryService supabase init failed (optional)', error);
    }
  }

  /**
   * Generate itinerary through conversation
   */
  async generateFromConversation(
    request: ConversationItineraryRequest
  ): Promise<{
    itinerary: Itinerary | null;
    needsClarification: boolean;
    clarificationQuestions?: string[];
    confidence: number;
  }> {
    try {
      // Extract requirements from conversation
      const requirements = await this.extractRequirements(request);

      if (requirements.needsClarification) {
        return {
          itinerary: null,
          needsClarification: true,
          clarificationQuestions: requirements.clarificationQuestions,
          confidence: 0.3,
        };
      }

      // Build rich context
      await richQueryContextService.buildContext(
        request.userId,
        requirements.city
      );

      // Generate itinerary
      const itinerary = await itineraryIntelligenceService.generateItinerary(
        requirements.city || 'Unknown',
        requirements.durationDays || 3,
        {
          categories: requirements.categories,
          budget: requirements.budget,
          style: requirements.style,
          mustVisit: requirements.mustVisit,
        },
        request.userId
      );

      // Optimize route if multiple destinations
      if (itinerary && itinerary.items.length > 1) {
        const optimized = await this.optimizeRoute(itinerary);
        return {
          itinerary: optimized,
          needsClarification: false,
          confidence: requirements.confidence,
        };
      }

      return {
        itinerary,
        needsClarification: false,
        confidence: requirements.confidence,
      };
    } catch (error) {
      console.error('Error generating conversation itinerary:', error);
      return {
        itinerary: null,
        needsClarification: true,
        clarificationQuestions: ['Could you tell me which city you\'d like to visit?'],
        confidence: 0.0,
      };
    }
  }

  /**
   * Extract requirements from conversation
   */
  private async extractRequirements(
    request: ConversationItineraryRequest
  ): Promise<{
    city?: string;
    durationDays?: number;
    categories?: string[];
    budget?: number;
    style?: string;
    mustVisit?: string[];
    needsClarification: boolean;
    clarificationQuestions?: string[];
    confidence: number;
  }> {
    try {
      const conversationText = request.conversationHistory
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

      const prompt = `Extract travel itinerary requirements from this conversation. Return minified JSON:
{
  "city": "city name or null",
  "durationDays": number or null,
  "categories": ["dining", "culture", etc.] or null,
  "budget": number or null,
  "style": "luxury" | "budget" | "mid-range" | null,
  "mustVisit": ["destination names"] or null,
  "needsClarification": boolean,
  "clarificationQuestions": ["question1", "question2"] or null,
  "confidence": 0.0 to 1.0
}

Conversation:
${conversationText}

Current Query: "${request.currentQuery}"

Return only JSON that matches the schema above exactly.`;

      const aiResponse = await routePrompt<z.infer<typeof conversationRequirementsSchema>>({
        prompt,
        responseSchema: conversationRequirementsSchema,
        metadata: {
          useCase: 'conversation-itinerary.requirements',
          sessionId: request.sessionId,
          userId: request.userId,
        },
        preferredProviders: ['openai', 'gemini', 'local'],
        capabilities: ['json', 'long-context'],
        safetyBudget: {
          maxOutputTokens: 320,
          maxLatencyMs: 5000,
        },
        temperature: 0.2,
      });

      const parsed = normalizeRequirements(aiResponse.parsed);
      if (parsed) {
        return parsed;
      }
    } catch (error) {
      console.error('Error extracting requirements:', error);
    }

    return {
      needsClarification: true,
      clarificationQuestions: ['Could you provide more details about your trip?'],
      confidence: 0.0,
    };
  }

  /**
   * Optimize route for multi-day itinerary
   */
  private async optimizeRoute(itinerary: Itinerary): Promise<Itinerary> {
    try {
      // Use graph sequencing service for route optimization
      const destinationIds = itinerary.items.map(item => {
        // Convert UUID to integer if needed
        const id = typeof item.destination_id === 'string' 
          ? parseInt(item.destination_id) 
          : item.destination_id;
        return id;
      }).filter(id => !isNaN(id));

      if (destinationIds.length < 2) {
        return itinerary;
      }

      // Call ML service for route optimization
      const mlServiceUrl = process.env.ML_SERVICE_URL;
      if (mlServiceUrl) {
        try {
          const response = await fetch(`${mlServiceUrl}/api/graph/optimize-itinerary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              destination_ids: destinationIds,
              start_latitude: null, // Would get from first destination
              start_longitude: null,
            }),
          });

          if (response.ok) {
            const optimized = await response.json();
            void optimized;
            // Map optimized sequence back to itinerary items
            // This is simplified - full implementation would preserve timing, notes, etc.
            return itinerary; // For now, return original
          }
        } catch (error) {
          console.error('Error calling ML service for route optimization:', error);
        }
      }

      // Fallback: simple geographic optimization
      return this.simpleRouteOptimization(itinerary);
    } catch (error) {
      console.error('Error optimizing route:', error);
      return itinerary;
    }
  }

  private async simpleRouteOptimization(itinerary: Itinerary): Promise<Itinerary> {
    // Simple optimization: group by day, sort by location proximity
    // For now, return as-is
    return itinerary;
  }
}

export const conversationItineraryService = new ConversationItineraryService();

function normalizeRequirements(
  response?: z.infer<typeof conversationRequirementsSchema>
): {
  city?: string;
  durationDays?: number;
  categories?: string[];
  budget?: number;
  style?: string;
  mustVisit?: string[];
  needsClarification: boolean;
  clarificationQuestions?: string[];
  confidence: number;
} | null {
  if (!response) {
    return null;
  }

  return {
    city: response.city ?? undefined,
    durationDays: response.durationDays ?? undefined,
    categories: response.categories ?? undefined,
    budget: response.budget ?? undefined,
    style: response.style ?? undefined,
    mustVisit: response.mustVisit ?? undefined,
    needsClarification: response.needsClarification,
    clarificationQuestions: response.clarificationQuestions ?? undefined,
    confidence: response.confidence,
  };
}

