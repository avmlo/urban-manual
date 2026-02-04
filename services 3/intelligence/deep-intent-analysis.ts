/**
 * Enhanced Deep Intent Analysis with Multi-Intent Detection
 * Detects multiple intents in a single query
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateJSON } from '@/lib/llm';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { intentAnalysisService, EnhancedIntent } from '@/services/intelligence/intent-analysis';

export interface MultiIntentResult {
  primaryIntent: EnhancedIntent['primaryIntent'];
  secondaryIntents: Array<{
    intent: string;
    confidence: number;
    context: string;
  }>;
  combinedIntent: EnhancedIntent;
  intentHierarchy: Array<{
    level: number;
    intent: string;
    weight: number;
  }>;
}

export class DeepIntentAnalysisService {
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
    }
  }

  /**
   * Analyze query for multiple intents
   */
  async analyzeMultiIntent(
    query: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    userId?: string
  ): Promise<MultiIntentResult> {
    try {
      // First get base intent
      const baseIntent = await intentAnalysisService.analyzeIntent(query, conversationHistory, userId);

      // Detect multiple intents using AI
      const multiIntent = await this.detectMultipleIntents(query, conversationHistory, userId);

      // Build intent hierarchy
      const intentHierarchy = this.buildIntentHierarchy(baseIntent, multiIntent);

      return {
        primaryIntent: baseIntent.primaryIntent,
        secondaryIntents: multiIntent.secondaryIntents || [],
        combinedIntent: baseIntent,
        intentHierarchy,
      };
    } catch (error) {
      console.error('Error in multi-intent analysis:', error);
      return {
        primaryIntent: 'discover',
        secondaryIntents: [],
        combinedIntent: await intentAnalysisService.analyzeIntent(query, conversationHistory, userId),
        intentHierarchy: [],
      };
    }
  }

  private async detectMultipleIntents(
    query: string,
    conversationHistory: Array<{ role: string; content: string }>,
    userId?: string
  ): Promise<{ secondaryIntents?: Array<{ intent: string; confidence: number; context: string }> }> {
    if (!this.genAI) {
      return {};
    }

    try {
      const conversationContext = conversationHistory.length > 0
        ? `\n\nConversation History:\n${conversationHistory.slice(-6).map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
        : '';

      const system = `Analyze this travel query and identify ALL intents present. Return JSON with:
- secondaryIntents: array of {intent: string, confidence: number (0-1), context: string}
Detect multiple intents like: "find and compare", "plan and book", "discover and learn", etc.`;

      const userPayload = `Query: "${query}"${conversationContext}`;
      const parsed = await generateJSON(system, userPayload);

      return parsed || {};
    } catch (error) {
      console.error('Error detecting multiple intents:', error);
      return {};
    }
  }

  private buildIntentHierarchy(
    baseIntent: EnhancedIntent,
    multiIntent: { secondaryIntents?: Array<{ intent: string; confidence: number; context: string }> }
  ): Array<{ level: number; intent: string; weight: number }> {
    const hierarchy: Array<{ level: number; intent: string; weight: number }> = [
      { level: 1, intent: baseIntent.primaryIntent, weight: 1.0 },
    ];

    if (multiIntent.secondaryIntents) {
      multiIntent.secondaryIntents.forEach((secondary, idx) => {
        hierarchy.push({
          level: 2 + idx,
          intent: secondary.intent,
          weight: secondary.confidence,
        });
      });
    }

    return hierarchy;
  }
}

export const deepIntentAnalysisService = new DeepIntentAnalysisService();

