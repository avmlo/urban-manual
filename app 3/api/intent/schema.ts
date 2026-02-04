/**
 * Intent JSON Schema for Structured Extraction
 * Used by GPT-5-turbo and conversation handlers
 */

export const INTENT_SCHEMA = {
  type: 'object',
  properties: {
    primaryIntent: {
      type: 'string',
      enum: ['discover', 'plan', 'compare', 'recommend', 'learn', 'book'],
      description: 'The main intent of the user query'
    },
    secondaryIntents: {
      type: 'array',
      items: { type: 'string' },
      description: 'Additional intents detected in the query'
    },
    city: {
      type: 'string',
      nullable: true,
      description: 'City name if mentioned or inferred'
    },
    category: {
      type: 'string',
      nullable: true,
      enum: ['restaurant', 'cafe', 'hotel', 'bar', 'gallery', 'museum', 'park', 'shop', null],
      description: 'Place category if specified'
    },
    temporalContext: {
      type: 'object',
      nullable: true,
      properties: {
        timeframe: {
          type: 'string',
          enum: ['now', 'soon', 'future', 'flexible'],
          description: 'When the user wants to visit'
        },
        dateRange: {
          type: 'object',
          nullable: true,
          properties: {
            start: { type: 'string', format: 'date' },
            end: { type: 'string', format: 'date' }
          }
        },
        specificDate: {
          type: 'string',
          nullable: true,
          format: 'date',
          description: 'Specific date mentioned'
        }
      }
    },
    modifiers: {
      type: 'array',
      items: { type: 'string' },
      description: 'Descriptive modifiers: romantic, cozy, luxury, hidden, etc.'
    },
    comparisonMode: {
      type: 'boolean',
      description: 'Whether user is comparing options'
    },
    referenceResolution: {
      type: 'object',
      nullable: true,
      properties: {
        type: {
          type: 'string',
          enum: ['previous_result', 'conversation', 'user_saved', 'search'],
          description: 'Type of reference'
        },
        reference: { type: 'string', description: 'What is being referenced' },
        confidence: { type: 'number', minimum: 0, maximum: 1 }
      }
    },
    constraints: {
      type: 'object',
      nullable: true,
      properties: {
        budget: {
          type: 'object',
          nullable: true,
          properties: {
            min: { type: 'number' },
            max: { type: 'number' },
            currency: { type: 'string' }
          }
        },
        time: {
          type: 'object',
          nullable: true,
          properties: {
            duration: { type: 'string' },
            timeOfDay: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'late-night', null] }
          }
        },
        preferences: {
          type: 'array',
          items: { type: 'string' },
          description: 'Positive preferences (e.g., vegetarian, outdoor seating)'
        },
        exclusions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Things to avoid'
        }
      }
    },
    urgency: {
      type: 'string',
      enum: ['low', 'medium', 'high'],
      description: 'How urgent the request is'
    },
    queryComplexity: {
      type: 'string',
      enum: ['simple', 'moderate', 'complex'],
      description: 'Complexity assessment'
    }
  },
  required: ['primaryIntent', 'queryComplexity']
} as const;

export type ExtractedIntent = {
  primaryIntent: 'discover' | 'plan' | 'compare' | 'recommend' | 'learn' | 'book';
  secondaryIntents?: string[];
  city?: string | null;
  category?: string | null;
  temporalContext?: {
    timeframe: 'now' | 'soon' | 'future' | 'flexible';
    dateRange?: { start: string; end: string };
    specificDate?: string;
  } | null;
  modifiers?: string[];
  comparisonMode?: boolean;
  referenceResolution?: {
    type: 'previous_result' | 'conversation' | 'user_saved' | 'search';
    reference: string;
    confidence: number;
  } | null;
  constraints?: {
    budget?: { min?: number; max?: number; currency?: string } | null;
    time?: { duration?: string; timeOfDay?: 'breakfast' | 'lunch' | 'dinner' | 'late-night' | null } | null;
    preferences?: string[];
    exclusions?: string[];
  } | null;
  urgency?: 'low' | 'medium' | 'high';
  queryComplexity: 'simple' | 'moderate' | 'complex';
};

/**
 * Extract intent from user message using GPT-5-turbo with structured output
 */
export async function extractIntent(
  message: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  userContext?: { favoriteCities?: string[]; favoriteCategories?: string[]; travelStyle?: string }
): Promise<ExtractedIntent> {
  const { generateJSON } = await import('@/lib/llm');
  const { URBAN_MANUAL_EDITOR_SYSTEM_PROMPT } = await import('@/lib/ai/systemPrompts');

  const conversationContext = conversationHistory.length > 0
    ? `\n\nConversation History (last 5 messages):\n${conversationHistory.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
    : '';

  const userContextStr = userContext
    ? `\n\nUser Profile:\n${userContext.favoriteCities?.length ? `Favorite cities: ${userContext.favoriteCities.join(', ')}\n` : ''}${userContext.favoriteCategories?.length ? `Favorite categories: ${userContext.favoriteCategories.join(', ')}\n` : ''}${userContext.travelStyle ? `Travel style: ${userContext.travelStyle}` : ''}`
    : '';

  const systemPrompt = `${URBAN_MANUAL_EDITOR_SYSTEM_PROMPT}\n\nExtract structured intent from the user's message. Return ONLY valid JSON matching this schema:
${JSON.stringify(INTENT_SCHEMA, null, 2)}`;

  const userPrompt = `User message: "${message}"${conversationContext}${userContextStr}\n\nExtract intent and return JSON only.`;

  const result = await generateJSON(systemPrompt, userPrompt);

  if (result && result.primaryIntent) {
    // Validate and normalize
    return {
      primaryIntent: result.primaryIntent,
      secondaryIntents: result.secondaryIntents || [],
      city: result.city || null,
      category: result.category || null,
      temporalContext: result.temporalContext || null,
      modifiers: result.modifiers || [],
      comparisonMode: result.comparisonMode || false,
      referenceResolution: result.referenceResolution || null,
      constraints: result.constraints || null,
      urgency: result.urgency || 'low',
      queryComplexity: result.queryComplexity || 'simple',
    };
  }

  // Fallback: basic extraction
  const lower = message.toLowerCase();
  return {
    primaryIntent: lower.includes('compare') ? 'compare' : lower.includes('plan') ? 'plan' : 'discover',
    queryComplexity: 'simple',
    urgency: 'low',
  };
}

