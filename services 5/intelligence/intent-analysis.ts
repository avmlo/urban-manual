/**
 * Enhanced Intent Analysis Service
 * Deep understanding of user queries with temporal, comparative, and multi-intent support
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateJSON } from '@/lib/llm';
import { createServiceRoleClient } from '@/lib/supabase-server';

export interface EnhancedIntent {
  primaryIntent: 'discover' | 'plan' | 'compare' | 'recommend' | 'learn' | 'book';
  secondaryIntents?: string[];
  temporalContext?: {
    timeframe: 'now' | 'soon' | 'future' | 'flexible';
    dateRange?: { start: string; end: string };
    specificDate?: string;
  };
  comparisonMode?: boolean;
  referenceResolution?: {
    type: 'previous_result' | 'conversation' | 'user_saved' | 'search';
    reference: string;
    confidence: number;
  };
  constraints?: {
    budget?: { min?: number; max?: number; currency?: string };
    time?: { duration?: string; timeOfDay?: string };
    preferences?: string[];
    exclusions?: string[];
  };
  urgency?: 'low' | 'medium' | 'high';
  queryComplexity: 'simple' | 'moderate' | 'complex';
}

export class IntentAnalysisService {
  private genAI: GoogleGenerativeAI | null = null;
  private supabase;

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
    
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      this.supabase = null;
      console.warn('IntentAnalysisService: Supabase client not available');
    }
  }

  /**
   * Analyze query with full context
   */
  async analyzeIntent(
    query: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    userId?: string
  ): Promise<EnhancedIntent> {
    try {

      // Build context
      const conversationContext = conversationHistory.length > 0
        ? `\n\nConversation History:\n${conversationHistory.slice(-6).map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
        : '';

      // Get user context if available
      let userContext = '';
      if (userId && this.supabase) {
        const { data: profile, error: profileError } = await this.supabase
          .from('user_profiles')
          .select('favorite_cities, favorite_categories, travel_style')
          .eq('user_id', userId)
          .maybeSingle();

        if (profileError) {
          console.warn('IntentAnalysisService: profile lookup failed', profileError.message);
        }

        if (profile) {
          const parts = [];
          if (profile.favorite_cities?.length) {
            parts.push(`Favorite cities: ${profile.favorite_cities.join(', ')}`);
          }
          if (profile.favorite_categories?.length) {
            parts.push(`Favorite categories: ${profile.favorite_categories.join(', ')}`);
          }
          if (profile.travel_style) {
            parts.push(`Travel style: ${profile.travel_style}`);
          }
          if (parts.length > 0) {
            userContext = `\n\nUser Context: ${parts.join('; ')}`;
          }
        }
      }

      const system = `Analyze travel queries deeply and return STRICT JSON only with these fields: primaryIntent, secondaryIntents, temporalContext{timeframe,dateRange{start,end},specificDate}, comparisonMode, referenceResolution{type,reference,confidence}, constraints{budget{min,max,currency},time{duration,timeOfDay},preferences,exclusions}, urgency, queryComplexity.`;
      const userPayload = `Query: "${query}"${conversationContext}${userContext}`;
      const parsed = await generateJSON(system, userPayload);
      if (parsed) {
        return this.validateAndEnhanceIntent(parsed, query, conversationHistory);
      }
    } catch (error) {
      console.error('Error in intent analysis:', error);
    }

    return this.fallbackAnalysis(query);
  }

  /**
   * Validate and enhance parsed intent
   */
  private validateAndEnhanceIntent(
    parsed: any,
    query: string,
    conversationHistory: Array<{ role: string; content: string }>
  ): EnhancedIntent {
    // Detect relative queries
    const lowerQuery = query.toLowerCase();
    if ((lowerQuery.includes('more') || lowerQuery.includes('another') || lowerQuery.includes('similar')) 
        && conversationHistory.length > 0) {
      parsed.referenceResolution = {
        type: 'previous_result',
        reference: 'last search results',
        confidence: 0.7,
      };
    }

    // Detect comparisons
    if (lowerQuery.includes('better than') || lowerQuery.includes('vs') || lowerQuery.includes('compare')) {
      parsed.comparisonMode = true;
      if (!parsed.primaryIntent) {
        parsed.primaryIntent = 'compare';
      }
    }

    // Detect urgency
    if (lowerQuery.includes('urgent') || lowerQuery.includes('asap') || lowerQuery.includes('immediately')) {
      parsed.urgency = 'high';
    } else if (lowerQuery.includes('soon') || lowerQuery.includes('next week')) {
      parsed.urgency = 'medium';
    } else {
      parsed.urgency = parsed.urgency || 'low';
    }

    // Assess complexity
    const intentCount = [parsed.primaryIntent, ...(parsed.secondaryIntents || [])].length;
    if (intentCount === 1 && !parsed.constraints) {
      parsed.queryComplexity = 'simple';
    } else if (intentCount <= 3 && parsed.constraints) {
      parsed.queryComplexity = 'moderate';
    } else {
      parsed.queryComplexity = 'complex';
    }

    return parsed as EnhancedIntent;
  }

  /**
   * Fallback analysis without AI
   */
  private fallbackAnalysis(query: string): EnhancedIntent {
    const lowerQuery = query.toLowerCase();
    
    let primaryIntent: EnhancedIntent['primaryIntent'] = 'discover';
    if (lowerQuery.includes('plan') || lowerQuery.includes('itinerary')) {
      primaryIntent = 'plan';
    } else if (lowerQuery.includes('compare') || lowerQuery.includes('vs') || lowerQuery.includes('better')) {
      primaryIntent = 'compare';
    } else if (lowerQuery.includes('recommend') || lowerQuery.includes('suggest')) {
      primaryIntent = 'recommend';
    } else if (lowerQuery.includes('when') || lowerQuery.includes('best time')) {
      primaryIntent = 'learn';
    } else if (lowerQuery.includes('book') || lowerQuery.includes('reserve')) {
      primaryIntent = 'book';
    }

    const comparisonMode = lowerQuery.includes('better') || lowerQuery.includes('vs') || lowerQuery.includes('compare');
    
    let urgency: 'low' | 'medium' | 'high' = 'low';
    if (lowerQuery.includes('urgent') || lowerQuery.includes('asap')) {
      urgency = 'high';
    } else if (lowerQuery.includes('soon')) {
      urgency = 'medium';
    }

    return {
      primaryIntent,
      comparisonMode,
      urgency,
      queryComplexity: 'simple',
    };
  }
}

export const intentAnalysisService = new IntentAnalysisService();
