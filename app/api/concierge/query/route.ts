import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getVectorIndex } from '@/lib/upstash-vector';
import { generateTextEmbedding } from '@/lib/ml/embeddings';
import { withErrorHandling } from '@/lib/errors';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface ConciergeRequest {
  query: string;
  userContext?: {
    budget?: string;
    travelStyle?: string;
    interests?: string[];
  };
  limit?: number;
  includeExternal?: boolean;
}

interface ExternalReference {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

interface ConciergeResponse {
  explanation: string;
  destinations: Array<{
    id: number;
    name: string;
    city: string;
    country: string;
    category: string;
    similarity_score: number;
    reason: string;
  }>;
  externalReferences?: ExternalReference[];
  userContext?: string;
}

/**
 * POST /api/concierge/query
 *
 * AI-powered travel concierge that combines internal semantic search
 * with external web research to provide personalized recommendations.
 *
 * Flow:
 * 1. Generate embedding for user query
 * 2. Query Upstash Vector for semantic matches
 * 3. Fetch top external context (Tavily/Exa) for enrichment
 * 4. Synthesize final answer with LLM
 * 5. Return ranked destinations + explanation + references
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body: ConciergeRequest = await request.json();
  const { query, userContext, limit = 5, includeExternal = true } = body;

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: 'Query is required' },
      { status: 400 }
    );
  }

  // Step 1: Generate embedding for the query
  const embeddingResult = await generateTextEmbedding(query);

  // Step 2: Query vector database for semantic matches
  const vectorIndex = getVectorIndex();

  if (!vectorIndex) {
    return NextResponse.json<ConciergeResponse>({
      explanation: "Vector search is currently unavailable. Please try again later.",
      destinations: [],
    });
  }

  const vectorResults = await vectorIndex.query({
    vector: embeddingResult.embedding,
    topK: limit * 2, // Get more results for filtering
    includeMetadata: true,
  });

  // Step 3: Get destination IDs from vector results
  const destinationIds = vectorResults
    .filter((r: any) => r.score && r.score > 0.7) // Filter by similarity threshold
    .map((r: any) => parseInt(String(r.id)))
    .slice(0, limit);

  if (destinationIds.length === 0) {
    return NextResponse.json<ConciergeResponse>({
      explanation: "I couldn't find any destinations matching your criteria. Try a broader search or different keywords.",
      destinations: [],
    });
  }

  // Step 4: Fetch full destination data from Supabase
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: destinations, error } = await supabase
    .from('destinations')
    .select('id, name, city, country, category, price_range, michelin_stars, description, ai_description')
    .in('id', destinationIds);

  if (error || !destinations) {
    console.error('Supabase error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch destination details' },
      { status: 500 }
    );
  }

  // Step 5: Fetch external context if enabled
  let externalReferences: ExternalReference[] | undefined;
  if (includeExternal) {
    externalReferences = await fetchExternalContext(query, destinations.slice(0, 3));
  }

  // Step 6: Generate AI explanation
  const explanation = await generateExplanation(
    query,
    destinations,
    userContext,
    externalReferences
  );

  // Step 7: Map destinations with similarity scores and reasons
  const rankedDestinations = destinations.map((dest: any, index: number) => {
    const vectorResult = vectorResults.find((r: any) => parseInt(String(r.id)) === dest.id);
    return {
      id: dest.id,
      name: dest.name,
      city: dest.city,
      country: dest.country,
      category: dest.category,
      similarity_score: vectorResult?.score || 0,
      reason: generateReason(dest, query, userContext),
    };
  });

  const response: ConciergeResponse = {
    explanation,
    destinations: rankedDestinations,
    externalReferences,
    userContext: formatUserContext(userContext),
  };

  return NextResponse.json(response);
});

/**
 * Fetch external context from Tavily or Exa API
 */
async function fetchExternalContext(
  query: string,
  topDestinations: any[]
): Promise<ExternalReference[]> {
  const tavilyApiKey = process.env.TAVILY_API_KEY;
  const exaApiKey = process.env.EXA_API_KEY;

  // Build enriched query with top city names
  const cities = topDestinations.map((d) => d.city).slice(0, 2);
  const enrichedQuery = cities.length > 0
    ? `${query} in ${cities.join(' or ')}`
    : query;

  try {
    // Try Tavily first
    if (tavilyApiKey) {
      return await fetchFromTavily(enrichedQuery, tavilyApiKey);
    }

    // Fallback to Exa
    if (exaApiKey) {
      return await fetchFromExa(enrichedQuery, exaApiKey);
    }

    // No external API available
    console.log('No external search API configured (TAVILY_API_KEY or EXA_API_KEY)');
    return [];
  } catch (error) {
    console.error('External search error:', error);
    return [];
  }
}

/**
 * Fetch from Tavily API
 */
async function fetchFromTavily(
  query: string,
  apiKey: string
): Promise<ExternalReference[]> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      max_results: 3,
      include_answer: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.results || []).map((result: any) => ({
    title: result.title,
    url: result.url,
    snippet: result.content?.substring(0, 200) || '',
    source: 'Tavily',
  }));
}

/**
 * Fetch from Exa API
 */
async function fetchFromExa(
  query: string,
  apiKey: string
): Promise<ExternalReference[]> {
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      query,
      num_results: 3,
      use_autoprompt: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Exa API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.results || []).map((result: any) => ({
    title: result.title,
    url: result.url,
    snippet: result.text?.substring(0, 200) || '',
    source: 'Exa',
  }));
}

/**
 * Generate AI explanation using OpenAI or Gemini
 */
async function generateExplanation(
  query: string,
  destinations: any[],
  userContext?: any,
  externalReferences?: ExternalReference[]
): Promise<string> {
  // Build context for LLM
  const destinationSummaries = destinations
    .slice(0, 5)
    .map((d) => `- ${d.name} in ${d.city}, ${d.country} (${d.category})${d.michelin_stars ? ` - ${d.michelin_stars} Michelin stars` : ''}`)
    .join('\n');

  const externalContext = externalReferences && externalReferences.length > 0
    ? `\n\nAdditional context from web:\n${externalReferences.map((r) => `- ${r.title}: ${r.snippet}`).join('\n')}`
    : '';

  const userContextStr = userContext
    ? `\nUser preferences: Budget: ${userContext.budget || 'any'}, Style: ${userContext.travelStyle || 'any'}, Interests: ${(userContext.interests || []).join(', ')}`
    : '';

  const prompt = `You are a travel concierge AI. A user asked: "${query}"${userContextStr}

Based on semantic search, here are the top matching destinations:
${destinationSummaries}${externalContext}

Provide a brief, friendly 2-3 sentence explanation of why these destinations match the user's request. Be concise and enthusiastic.`;

  try {
    // Try OpenAI first
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0]?.message?.content || generateDefaultExplanation(query, destinations);
      }
    }

    // Fallback to Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || generateDefaultExplanation(query, destinations);
      }
    }

    // No LLM available, use default
    return generateDefaultExplanation(query, destinations);
  } catch (error) {
    console.error('LLM error:', error);
    return generateDefaultExplanation(query, destinations);
  }
}

/**
 * Generate default explanation without LLM
 */
function generateDefaultExplanation(query: string, destinations: any[]): string {
  const count = destinations.length;
  const cities = [...new Set(destinations.slice(0, 3).map((d) => d.city))].join(', ');
  return `Based on your search for "${query}", I found ${count} highly relevant destination${count !== 1 ? 's' : ''} for you${cities ? ` in ${cities}` : ''}. These destinations match your criteria based on semantic similarity and user reviews.`;
}

/**
 * Generate reason for each destination
 */
function generateReason(destination: any, query: string, userContext?: any): string {
  const reasons: string[] = [];

  if (destination.michelin_stars) {
    reasons.push(`${destination.michelin_stars} Michelin star${destination.michelin_stars > 1 ? 's' : ''}`);
  }

  if (destination.price_range) {
    reasons.push(destination.price_range);
  }

  if (destination.category) {
    reasons.push(destination.category);
  }

  return reasons.length > 0 ? reasons.join(' • ') : 'Matches your search criteria';
}

/**
 * Format user context for display
 */
function formatUserContext(userContext?: any): string | undefined {
  if (!userContext) return undefined;

  const parts: string[] = [];
  if (userContext.budget) parts.push(`Budget: ${userContext.budget}`);
  if (userContext.travelStyle) parts.push(`Style: ${userContext.travelStyle}`);
  if (userContext.interests && userContext.interests.length > 0) {
    parts.push(`Interests: ${userContext.interests.join(', ')}`);
  }

  return parts.length > 0 ? parts.join(' | ') : undefined;
}
