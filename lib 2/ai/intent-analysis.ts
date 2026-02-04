import { generateJSON } from '@/lib/llm';
import { ADVANCED_NLU_SYSTEM_PROMPT } from './advanced-nlu-prompt';

export interface UserContext {
  savedPlaces: Array<{ name: string; city: string; category: string; tags?: string[]; brand?: string | null }>;
  recentVisits: Array<{ name: string; city: string; category: string; brand?: string | null }>;
  tasteProfile?: { taste_archetype?: string };
  currentLocation?: string;
  comparisonBase?: any;
  budgetInference?: any;
  groupSizeInference?: number | null;
  brandAffinity?: Array<{ brand: string; score: number }>;
}

export interface NLUResult {
  intent: 'search' | 'my_places' | 'recommendation' | 'comparison' | 'discovery' | 'itinerary';
  confidence: number;
  interpretations: Array<{
    semanticQuery: string;
    filters: {
      city?: string | null;
      neighborhood?: string | null;
      category?: string | null;
      brand?: string | null;
      cuisine?: string | null;
      style?: string | null;
      tags?: string[];
      atmosphere_tags?: string[];
      occasion_tags?: string[];
      special_features?: string[];
      michelin_preference?: boolean;
      price_level_min?: number | null;
      price_level_max?: number | null;
      rating_min?: number | null;
      include_saved_only?: boolean;
      exclude_visited?: boolean;
      exclude_touristy?: boolean;
    };
    contextualBoosts?: Record<string, number>;
    socialContext?: {
      groupSize?: number | null;
      occasion?: string | null;
      withKids?: boolean;
      soloFriendly?: boolean;
      dateSpot?: boolean;
    };
    temporalContext?: {
      timeOfDay?: 'breakfast' | 'lunch' | 'dinner' | 'late_night' | null;
      seasonalRelevance?: string | null;
      mustBeOpenNow?: boolean;
    };
    budgetContext?: {
      maxPerPerson?: number | null;
      splurgeWorthy?: boolean;
      valueFocused?: boolean;
    };
    dietaryNeeds?: string[];
    accessibility?: string[];
  }>;
  reasoning?: string;
  alternativeInterpretations?: string[];
  clarifyingQuestions?: string[];
  needsClarification?: boolean;
}

export async function analyzeIntent(
  message: string,
  userContext: UserContext
): Promise<NLUResult> {
  const systemPrompt = ADVANCED_NLU_SYSTEM_PROMPT
    .replace('{{savedPlaces}}', JSON.stringify(userContext.savedPlaces.slice(0, 10)))
    .replace('{{recentVisits}}', JSON.stringify(userContext.recentVisits.slice(0, 5)))
    .replace('{{tasteArchetype}}', userContext.tasteProfile?.taste_archetype || 'unknown')
    .replace('{{userLocation}}', userContext.currentLocation || 'unknown')
    .replace('{{currentTime}}', new Date().toISOString())
    .replace('{{comparisonBase}}', JSON.stringify(userContext.comparisonBase || null))
    .replace('{{budgetInference}}', JSON.stringify(userContext.budgetInference || null))
    .replace('{{groupSizeInference}}', String(userContext.groupSizeInference || 'unknown'))
    .replace('{{brandAffinity}}', JSON.stringify(userContext.brandAffinity?.slice(0, 5) || []));

  const userPrompt = `Analyze this query: "${message}"`;

  const result = await generateJSON(systemPrompt, userPrompt);

  if (!result) {
    // Fallback to basic interpretation
    return {
      intent: 'search',
      confidence: 0.5,
      interpretations: [{
        semanticQuery: message,
        filters: {},
      }],
      reasoning: 'Basic interpretation fallback',
    };
  }

  // If confidence is low, mark as needing clarification
  if (result.confidence < 0.6 && result.clarifyingQuestions?.length > 0) {
    result.needsClarification = true;
  }

  return result as NLUResult;
}

