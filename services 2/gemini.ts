/**
 * Gemini AI Service
 * Wraps Google Gemini API for context generation and discovery prompts
 * All prompts are carefully crafted to ensure outputs only reference provided listings
 */

import { routePrompt, TextResponseSchema } from '@/services/ai-gateway';
import { getSeasonalContext } from './seasonality';

export interface Listing {
  slug: string;
  name: string;
  city: string;
  category: string;
  description?: string;
  tags?: string[];
}

/**
 * Generate contextual search result text
 */
const contextResponseSchema = TextResponseSchema.extend({
  text: TextResponseSchema.shape.text.min(12).max(400),
});

const discoveryResponseSchema = TextResponseSchema.extend({
  text: TextResponseSchema.shape.text.min(12).max(280),
});

export async function generateContext(
  query: string,
  city: string | undefined,
  modifiers: string[],
  listings: Listing[],
  seasonality?: ReturnType<typeof getSeasonalContext>
): Promise<string> {
  try {
    const listingNames = listings.map(l => l.name).slice(0, 20);
    const modifierText = modifiers.length > 0 ? ` matching "${modifiers.join(', ')}"` : '';

    const prompt = `You are a travel guide assistant. Generate a brief, friendly context sentence for search results.

CRITICAL CONSTRAINTS:
1. DO NOT invent or suggest any location not in the provided list.
2. DO NOT mention specific venue names unless they are in the results list below.
3. Only reference the city, modifiers, category, and result count provided.
4. Keep it concise (1-2 sentences max).

Context:
- User query: "${query}"
- City: ${city || 'not specified'}
- Modifiers: ${modifiers.length > 0 ? modifiers.join(', ') : 'none'}
- Result count: ${listings.length}
- Available listings (for reference only): ${listingNames.join(', ')}

${seasonality 
  ? `- Seasonal context: ${seasonality.text}`
  : ''
}

Generate a sentence introducing the ${modifierText} results${city ? ` in ${city}` : ''}.
${seasonality ? `You may mention the seasonal context if relevant.` : ''}

Return ONLY valid minified JSON following this shape:
{
  "text": "Final sentence"
}`;

    const aiResponse = await routePrompt<{ text: string }>({
      prompt,
      responseSchema: contextResponseSchema,
      metadata: {
        useCase: 'contextual-search.context-line',
        city,
        query,
      },
      preferredProviders: ['gemini', 'openai', 'local'],
      capabilities: ['json', 'low-latency'],
      safetyBudget: {
        maxOutputTokens: 200,
        maxLatencyMs: 4500,
      },
      temperature: 0.3,
    });

    const response = aiResponse.parsed?.text?.trim() || '';

    // Safety validation: check that response doesn't mention unknown places
    const mentionedNames = listingNames.filter(name =>
      response.toLowerCase().includes(name.toLowerCase())
    );

    // If any names mentioned, validate they're in the list
    if (mentionedNames.length > 0) {
      const allValid = mentionedNames.every(name => listingNames.includes(name));
      if (!allValid) {
        console.warn('AI response mentioned names not in results, using fallback');
        return generateFallbackContext(city, modifiers, listings.length);
      }
    }

    return response;
  } catch (error) {
    console.error('Error generating context with AI gateway:', error);
    return generateFallbackContext(city, modifiers, listings.length);
  }
}

/**
 * Generate discovery prompt for a city/category
 */
export async function generateDiscoveryPrompt(
  city: string,
  category?: string,
  seasonality?: ReturnType<typeof getSeasonalContext>
): Promise<string> {
  try {
    const prompt = `You are a travel curator. Generate a one-sentence discovery prompt for ${city}${category ? ` focusing on ${category}` : ''}.

Style: Editorial, inspiring, concise. Like a travel magazine headline.

${seasonality 
  ? `Context: ${seasonality.text}\nIncorporate this seasonal information naturally.`
  : ''
}

Example formats:
- "Experience Kyoto's autumn foliage in October; discover our top ryokan stays."
- "Spring brings cherry blossoms to Tokyo—explore our curated collection of gardens and temples."
- "Find Copenhagen's best design-forward cafes during Design Week."

Generate a similar prompt for ${city}${category ? ` and ${category}` : ''}:
${seasonality ? `Mention the seasonal context: ${seasonality.event} (${seasonality.text}).` : ''}

Return ONLY valid minified JSON following this shape:
{
  "text": "Final discovery sentence"
}`;

    const aiResponse = await routePrompt<{ text: string }>({
      prompt,
      responseSchema: discoveryResponseSchema,
      metadata: {
        useCase: 'discovery.prompt',
        city,
        category,
      },
      preferredProviders: ['gemini', 'openai', 'local'],
      capabilities: ['json'],
      safetyBudget: {
        maxOutputTokens: 150,
        maxLatencyMs: 3500,
      },
      temperature: 0.5,
    });

    return aiResponse.parsed?.text?.trim() || generateFallbackDiscoveryPrompt(city, category, seasonality);
  } catch (error) {
    console.error('Error generating discovery prompt with AI gateway:', error);
    return generateFallbackDiscoveryPrompt(city, category, seasonality);
  }
}

/**
 * Fallback context generation (no AI)
 */
function generateFallbackContext(
  city: string | undefined,
  modifiers: string[],
  resultCount: number
): string {
  const modifierText = modifiers.length > 0 ? `${modifiers.join(' ')} ` : '';
  return `Here are our ${modifierText}places${city ? ` in ${city}` : ''} (${resultCount} ${resultCount === 1 ? 'result' : 'results'}).`;
}

/**
 * Fallback discovery prompt (no AI)
 */
function generateFallbackDiscoveryPrompt(
  city: string,
  category?: string,
  seasonality?: ReturnType<typeof getSeasonalContext>
): string {
  if (seasonality) {
    return `Discover ${city} during ${seasonality.event}. Explore our ${category || 'curated selection'}.`;
  }
  return `Explore ${city}${category ? `'s best ${category}` : ''} with our curated guide.`;
}

