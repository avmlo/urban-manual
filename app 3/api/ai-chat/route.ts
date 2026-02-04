import { NextRequest, NextResponse } from 'next/server';
import { openai, OPENAI_EMBEDDING_MODEL, getModelForQuery } from '@/lib/openai';
import { embedText } from '@/lib/llm';
import { rerankDestinations } from '@/lib/search/reranker';
import { unifiedSearch } from '@/lib/discovery-engine/integration';
import { getDiscoveryEngineService } from '@/services/search/discovery-engine';
import { createServerClient } from '@/lib/supabase/server';
import { FUNCTION_DEFINITIONS, handleFunctionCall } from './function-calling';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini as fallback
const GOOGLE_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
const genAI = GOOGLE_API_KEY ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';

// Simple in-memory cache for search results
interface CacheEntry {
  data: any;
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry>();
const embeddingCache = new Map<string, { embedding: number[], timestamp: number }>();
const intentCache = new Map<string, { intent: any, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_CACHE_SIZE = 100; // Limit cache size to prevent memory issues

// Request deduplication map
const pendingRequests = new Map<string, Promise<any>>();

// Timeout helper
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T | typeof fallback> {
  return Promise.race([
    promise,
    new Promise<T | typeof fallback>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}

function getCacheKey(query: string, intent: any): string {
  return `${query.toLowerCase()}_${intent.city || ''}_${intent.category || ''}`;
}

function getFromCache(key: string): any | null {
  const entry = searchCache.get(key);
  if (!entry) return null;

  // Check if cache entry is still valid
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    searchCache.delete(key);
    return null;
  }

  return entry.data;
}

function setInCache(key: string, data: any): void {
  // Implement simple LRU by removing oldest entry if cache is full
  if (searchCache.size >= MAX_CACHE_SIZE) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey) searchCache.delete(firstKey);
  }

  searchCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

// Category synonym mapping
const CATEGORY_SYNONYMS: Record<string, string> = {
  'restaurant': 'Restaurant',
  'dining': 'Restaurant',
  'food': 'Restaurant',
  'eat': 'Restaurant',
  'meal': 'Restaurant',
  'hotel': 'Hotel',
  'stay': 'Hotel',
  'accommodation': 'Hotel',
  'lodging': 'Hotel',
  'cafe': 'Cafe',
  'coffee': 'Cafe',
  'bar': 'Bar',
  'drink': 'Bar',
  'cocktail': 'Bar',
  'nightlife': 'Bar',
  'culture': 'Culture',
  'museum': 'Culture',
  'art': 'Culture',
  'gallery': 'Culture'
};

// Generate embedding using OpenAI with caching
async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!openai?.embeddings) {
    console.error('[AI Chat] No OpenAI client available');
    return null;
  }

  // Check cache first
  const cacheKey = text.toLowerCase().trim();
  const cached = embeddingCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[AI Chat] Using cached embedding');
    return cached.embedding;
  }

  try {
    const embedding = await withTimeout(
      embedText(text),
      5000, // 5 second timeout
      null
    );

    if (embedding) {
      // Cache the embedding
      if (embeddingCache.size >= MAX_CACHE_SIZE) {
        const firstKey = embeddingCache.keys().next().value;
        if (firstKey) embeddingCache.delete(firstKey);
      }
      embeddingCache.set(cacheKey, { embedding, timestamp: Date.now() });
    }

    return embedding;
  } catch (error) {
    console.error('[AI Chat] Error generating embedding:', error);
    return null;
  }
}

// AI-powered query understanding with conversation context and caching
async function understandQuery(
  query: string,
  conversationHistory: Array<{role: string, content: string}> = [],
  userId?: string
): Promise<{
  keywords: string[];
  city?: string;
  category?: string;
  filters?: {
    openNow?: boolean;
    priceLevel?: number;
    rating?: number;
    michelinStar?: number;
  };
  intent?: string; // User's apparent intent (e.g., "find", "compare", "recommend")
  confidence?: number; // 0-1 confidence score
  clarifications?: string[]; // Questions to clarify ambiguous queries
  inferredTags?: {
    neighborhoods?: string[];
    styleTags?: string[];
    priceLevel?: string; // e.g., "$", "$$", "$$$", "$$$$"
    modifiers?: string[];
  };
}> {
  if (!openai?.chat) {
    return parseQueryFallback(query);
  }

  // Check intent cache (only for queries without conversation history for consistency)
  if (conversationHistory.length === 0) {
    const cacheKey = `${query.toLowerCase()}_${userId || 'anon'}`;
    const cached = intentCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('[AI Chat] Using cached intent');
      return cached.intent;
    }
  }

  try {
    // Build conversation context string
    const conversationContext = conversationHistory.length > 0
      ? `\n\nConversation History:\n${conversationHistory.slice(-6).map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
      : '';

    // Fetch user preferences if available
    let userContext = '';
    if (userId) {
      try {
        const supabase = await createServerClient();
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('favorite_cities, favorite_categories, travel_style, interests')
          .eq('user_id', userId)
          .maybeSingle();
        
        // Handle errors gracefully - user_profiles might not exist or RLS might block
        if (!profileError && profile) {
          const contextParts = [];
          if (profile.favorite_cities?.length > 0) {
            contextParts.push(`Favorite cities: ${profile.favorite_cities.join(', ')}`);
          }
          if (profile.favorite_categories?.length > 0) {
            contextParts.push(`Favorite categories: ${profile.favorite_categories.join(', ')}`);
          }
          if (profile.travel_style) {
            contextParts.push(`Travel style: ${profile.travel_style}`);
          }
          if (contextParts.length > 0) {
            userContext = `\n\nUser Preferences: ${contextParts.join('; ')}`;
          }
        }
      } catch (error) {
        // Silently fail - user context is optional
        console.debug('User profile fetch failed (optional):', error);
      }
    }

    const systemPrompt = `You are a travel search intent analyzer. Extract structured information from travel/dining queries with full context. Return ONLY valid JSON with this exact structure:
{
  "keywords": ["array", "of", "main", "keywords"],
  "city": "city name or null",
  "category": "category like restaurant/cafe/hotel or null",
  "filters": {
    "openNow": true/false/null,
    "priceLevel": 1-4 or null,
    "rating": 4-5 or null,
    "michelinStar": 1-3 or null
  },
  "intent": "brief description of user intent (e.g., 'finding romantic dinner spots', 'comparing hotels', 'discovering hidden gems')",
  "confidence": 0.0-1.0,
  "clarifications": ["array", "of", "suggested", "questions", "if", "query", "is", "ambiguous"],
  "inferredTags": {
    "neighborhoods": ["array", "of", "neighborhood", "names", "if", "mentioned", "or", "inferred"],
    "styleTags": ["array", "of", "style", "descriptors", "e.g.", "minimalist", "contemporary", "traditional", "luxury"],
    "priceLevel": "price", "symbol", "like", "$", "$$", "$$$", "or", "$$$$", "based", "on", "query", "or", "null",
    "modifiers": ["array", "of", "descriptive", "modifiers", "e.g.", "quiet", "romantic", "trendy", "hidden", "gem"]
  }
}

Guidelines:
- Use conversation history to resolve pronouns and references (e.g., "show me more like this" refers to previous results)
- Use "more", "another", "similar" to expand on previous queries
- If query is ambiguous (e.g., just "hotels" without city), set clarifications with helpful questions
- Extract descriptive modifiers: romantic, cozy, luxury, budget, hidden, trendy, etc. as keywords AND in inferredTags.modifiers
- For neighborhoods: Extract specific neighborhood names (e.g., "Daikanyama", "Aoyama", "Shinjuku") from query or infer from context
- For styleTags: Extract design/style descriptors (e.g., "minimalist", "contemporary", "traditional", "wood", "natural materials", "modern")
- For priceLevel: Infer from words like "budget" ($), "affordable" ($$), "mid-range" ($$$), "luxury" ($$$$) or use filters.priceLevel if numeric
- Detect weather-related queries: "rainy day", "outdoor", "indoor", "weather" → suggest weather-aware recommendations
- Detect event-related queries: "events", "happening", "festival", "concert" → boost places near events
- Confidence should reflect how clear the query intent is
- For relative queries ("more", "another", "different"), infer intent from conversation history

Return only the JSON, no other text.`;

    const userPrompt = `Query: "${query}"${conversationContext}${userContext}`;

    // Use appropriate model based on query complexity
    const model = getModelForQuery(query, conversationHistory);
    
    let text = '';
    
    // Try OpenAI first
    if (openai?.chat) {
      try {
        const response = await withTimeout(
          openai.chat.completions.create({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.2,
            response_format: { type: 'json_object' },
          }),
          4000, // 4 second timeout for intent parsing
          null
        ) as Awaited<ReturnType<typeof openai.chat.completions.create>> | null;

        if (response) {
          text = response.choices?.[0]?.message?.content || '';
        }
      } catch (error) {
        console.error('[AI Chat] OpenAI intent parsing error, falling back to Gemini:', error);
      }
    }

    // Fallback to Gemini if OpenAI failed or not configured
    if (!text && genAI) {
      try {
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}\n\nReturn only the JSON, no other text.`;
        const geminiModel = genAI.getGenerativeModel({ 
          model: GEMINI_MODEL,
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          }
        });
        const result = await withTimeout(
          geminiModel.generateContent(fullPrompt),
          4000,
          null
        );
        if (result) {
          text = result.response.text();
        }
      } catch (error) {
        console.error('[AI Chat] Gemini intent parsing error:', error);
      }
    }

    if (!text) {
      console.warn('[AI Chat] Intent parsing failed, using fallback');
      return parseQueryFallback(query);
    }
    
    if (text) {
      try {
        const parsed = JSON.parse(text);
        console.log('[AI Chat] Enhanced parsed intent:', parsed);
        
        // If query contains relative terms, enhance intent from conversation
        const lowerQuery = query.toLowerCase();
        if ((lowerQuery.includes('more') || lowerQuery.includes('another') || lowerQuery.includes('similar') || lowerQuery.includes('different')) && conversationHistory.length > 0) {
          // Try to extract context from last assistant response
          const lastAssistant = conversationHistory.filter(m => m.role === 'assistant').pop();
          if (lastAssistant) {
            // Infer category/city from previous conversation
            const lastContent = lastAssistant.content.toLowerCase();
            if (!parsed.city && lastContent.includes('in ')) {
              const cityMatch = lastContent.match(/in ([a-z\s]+?)(?:\.|,|$)/);
              if (cityMatch) parsed.city = cityMatch[1].trim();
            }
            if (!parsed.category && (lastContent.includes('place') || lastContent.includes('restaurant') || lastContent.includes('hotel'))) {
              if (lastContent.includes('restaurant')) parsed.category = 'Restaurant';
              else if (lastContent.includes('hotel')) parsed.category = 'Hotel';
              else if (lastContent.includes('cafe')) parsed.category = 'Cafe';
            }
          }
        }

        // Cache the parsed intent (only for non-conversational queries)
        if (conversationHistory.length === 0) {
          const cacheKey = `${query.toLowerCase()}_${userId || 'anon'}`;
          if (intentCache.size >= MAX_CACHE_SIZE) {
            const firstKey = intentCache.keys().next().value;
            if (firstKey) intentCache.delete(firstKey);
          }
          intentCache.set(cacheKey, { intent: parsed, timestamp: Date.now() });
        }

        return parsed;
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
      }
    }
  } catch (error) {
    console.error('[AI Chat] LLM error:', error);
  }

  return parseQueryFallback(query);
}

/**
 * Parse natural language query to extract filters
 */
function parseNaturalLanguageFilters(query: string): {
  city?: string;
  category?: string;
  priceLevel?: number;
  minRating?: number;
} {
  const filters: any = {};
  const lowerQuery = query.toLowerCase();

  // Price level detection
  if (lowerQuery.includes('under $') || lowerQuery.includes('cheap') || lowerQuery.includes('budget')) {
    filters.priceLevel = 2;
  } else if (lowerQuery.includes('affordable') || lowerQuery.includes('moderate')) {
    filters.priceLevel = 3;
  } else if (lowerQuery.includes('expensive') || lowerQuery.includes('fine dining') || lowerQuery.includes('luxury')) {
    filters.priceLevel = 4;
  }

  // Rating detection
  if (lowerQuery.includes('highly rated') || lowerQuery.includes('best') || lowerQuery.includes('top rated')) {
    filters.minRating = 4.5;
  } else if (lowerQuery.includes('good reviews') || lowerQuery.includes('well reviewed')) {
    filters.minRating = 4.0;
  }

  // Category detection (basic)
  const categoryKeywords: { [key: string]: string } = {
    restaurant: 'Restaurant',
    cafe: 'Cafe',
    museum: 'Culture',
    gallery: 'Culture',
    park: 'Outdoor',
    bar: 'Bar',
    club: 'Bar',
    hotel: 'Hotel',
  };

  for (const [keyword, category] of Object.entries(categoryKeywords)) {
    if (lowerQuery.includes(keyword)) {
      filters.category = category;
      break;
    }
  }

  // City detection (basic)
  const cityPatterns = [
    /\b(paris|tokyo|new york|london|berlin|rome|barcelona|amsterdam|vienna|prague)\b/i,
  ];

  for (const pattern of cityPatterns) {
    const match = query.match(pattern);
    if (match) {
      filters.city = match[1].toLowerCase();
      break;
    }
  }

  return filters;
}

/**
 * Clean natural language query by removing filter keywords
 */
function cleanNaturalLanguageQuery(query: string): string {
  // Remove common filter phrases
  const filterPhrases = [
    /\bunder \$\d+\b/gi,
    /\bcheap\b/gi,
    /\bbudget\b/gi,
    /\baffordable\b/gi,
    /\bexpensive\b/gi,
    /\bfine dining\b/gi,
    /\bluxury\b/gi,
    /\bhighly rated\b/gi,
    /\btop rated\b/gi,
    /\bgood reviews\b/gi,
    /\bwell reviewed\b/gi,
    /\bopen now\b/gi,
    /\bwith (wifi|parking|outdoor seating)\b/gi,
  ];

  let cleaned = query;
  for (const phrase of filterPhrases) {
    cleaned = cleaned.replace(phrase, '').trim();
  }

  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned || query; // Return original if cleaned is empty
}

function parseQueryFallback(query: string): {
  keywords: string[];
  city?: string;
  category?: string;
  filters?: any;
  intent?: string;
  confidence?: number;
  clarifications?: string[];
} {
  const lowerQuery = query.toLowerCase();
  let city: string | undefined;
  let category: string | undefined;
  
  // Extract city
  const cityNames = ['tokyo', 'paris', 'london', 'new york', 'los angeles', 'singapore', 'hong kong', 'sydney', 'dubai', 'bangkok', 'berlin', 'amsterdam', 'rome', 'barcelona', 'lisbon', 'madrid', 'vienna', 'prague', 'stockholm', 'oslo', 'copenhagen', 'helsinki', 'milan', 'taipei', 'seoul', 'shanghai', 'beijing', 'mumbai', 'delhi', 'istanbul', 'moscow', 'sao paulo', 'mexico city', 'buenos aires', 'miami', 'san francisco', 'chicago', 'boston', 'seattle', 'toronto', 'vancouver', 'melbourne', 'auckland'];
  
  for (const cityName of cityNames) {
    if (lowerQuery.includes(cityName)) {
      city = cityName;
      break;
    }
  }
  
  // Extract category
  const categories = ['restaurant', 'cafe', 'hotel', 'bar', 'bakery', 'culture', 'dining', 'museum', 'gallery', 'shop', 'market'];
  for (const cat of categories) {
    if (lowerQuery.includes(cat)) {
      category = cat;
      break;
    }
  }
  
  // Extract keywords (words not in city or category)
  const keywords: string[] = [];
  const words = query.split(/\s+/);
  for (const word of words) {
    const lowerWord = word.toLowerCase();
    if (!city?.includes(lowerWord) && !category?.includes(lowerWord)) {
      if (word.length > 2) {
        keywords.push(word);
      }
    }
  }

  return {
    keywords,
    city,
    category,
    intent: `finding ${category || 'places'}${city ? ` in ${city}` : ''}`,
    confidence: (city ? 0.7 : 0.5) + (category ? 0.2 : 0),
  };
}

// Generate natural language response
// Generate intelligent response leveraging enriched data
async function generateIntelligentResponse(
  results: any[],
  query: string,
  intent: any,
  enhancedIntent: any,
  userId?: string
): Promise<string> {
  if (results.length === 0) {
    return "I couldn't find any places matching your search. Try adjusting your filters or search terms.";
  }

  // Get contextual information from enriched data
  const topResults = results.slice(0, 5);
  const hasWeather = topResults.some((r: any) => r.currentWeather);
  const hasEvents = topResults.some((r: any) => r.nearbyEvents && r.nearbyEvents.length > 0);
  const hasRoutes = topResults.some((r: any) => r.routeFromCityCenter);
  const hasPhotos = topResults.some((r: any) => r.photos && r.photos.length > 0);

  // Build context string for AI
  let contextInfo = '';
  
  if (hasWeather && topResults[0]?.currentWeather) {
    const weather = topResults[0].currentWeather;
    contextInfo += `\nCurrent weather: ${weather.temperature}°C, ${weather.weatherDescription}`;
    
    // Weather-aware suggestions
    if (weather.weatherCode >= 61 && weather.weatherCode <= 86) {
      // Rainy/snowy weather
      contextInfo += '\n💡 Weather note: It\'s raining/snowing - consider indoor options or places with covered outdoor seating.';
    } else if (weather.weatherCode === 0 || weather.weatherCode === 1) {
      // Clear weather
      contextInfo += '\n💡 Weather note: Perfect weather for outdoor dining or rooftop experiences!';
    }
  }

  if (hasEvents && topResults[0]?.nearbyEvents) {
    const events = topResults[0].nearbyEvents;
    const upcomingEvents = events.slice(0, 3);
    if (upcomingEvents.length > 0) {
      contextInfo += `\n🎭 Nearby events: ${upcomingEvents.map((e: any) => e.name).join(', ')}`;
    }
  }

  if (hasRoutes && topResults[0]?.walkingTimeFromCenter) {
    const walkingTime = topResults[0].walkingTimeFromCenter;
    contextInfo += `\n🚶 Walking time from city center: ~${walkingTime} minutes`;
  }

  const systemPrompt = `You are Urban Manual's intelligent travel assistant. You help users discover amazing places with rich, contextual insights.

AVAILABLE DATA FOR EACH DESTINATION:
- Photos: High-quality images from Google Places
- Weather: Current conditions + 7-day forecast (temperature, conditions, humidity)
- Events: Nearby upcoming events (concerts, exhibitions, festivals)
- Routes: Walking/driving times from city center
- Currency: Local currency and exchange rates

GUIDELINES:
- Mention weather context when relevant (e.g., "perfect for outdoor dining" or "great indoor option for rainy days")
- Highlight nearby events if they align with the search
- Note walking distances when helpful
- Use photos to describe ambiance/style
- Be concise but informative (2-3 sentences max)
- Match the user's tone (casual queries get casual responses)

${contextInfo}`;

  const userPrompt = `User searched: "${query}"
Found ${results.length} results.

Top results:
${topResults.slice(0, 5).map((r: any, i: number) => {
  let info = `${i + 1}. ${r.name} (${r.city})`;
  if (r.category) info += ` - ${r.category}`;
  if (r.rating) info += ` ⭐ ${r.rating}`;
  if (r.currentWeather) {
    info += ` | Weather: ${r.currentWeather.temperature}°C, ${r.currentWeather.weatherDescription}`;
  }
  if (r.walkingTimeFromCenter) {
    info += ` | ${r.walkingTimeFromCenter} min walk from center`;
  }
  if (r.nearbyEvents && r.nearbyEvents.length > 0) {
    info += ` | ${r.nearbyEvents.length} nearby events`;
  }
  return info;
}).join('\n')}

Generate a natural, helpful response that incorporates relevant context (weather, events, walking distance) when it adds value. Be conversational and concise.`;

  // Try OpenAI first
  if (openai?.chat) {
    try {
      // Use appropriate model based on query complexity
      // For response generation, we use simple model unless query is very complex
      const model = getModelForQuery(query, []);
      
      const response = await withTimeout(
        openai.chat.completions.create({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 150,
        }),
        5000, // 5 second timeout for response generation
        null
      ) as Awaited<ReturnType<typeof openai.chat.completions.create>> | null;

      const aiResponse = response?.choices?.[0]?.message?.content || '';
      if (aiResponse) {
        return aiResponse.trim();
      }
    } catch (error) {
      console.error('[AI Chat] OpenAI response generation error, falling back to Gemini:', error);
    }
  }

  // Fallback to Gemini if OpenAI failed or not configured
  if (genAI) {
    try {
      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
      const geminiModel = genAI.getGenerativeModel({ 
        model: GEMINI_MODEL,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 150,
        }
      });
      const result = await withTimeout(
        geminiModel.generateContent(fullPrompt),
        5000,
        null
      );
      if (result) {
        const aiResponse = result.response.text();
        if (aiResponse) {
          return aiResponse.trim();
        }
      }
    } catch (error) {
      console.error('[AI Chat] Gemini response generation error:', error);
    }
  }

  // Fallback to simple response
  return generateResponse(results.length, intent.city, intent.category);
}

function generateResponse(count: number, city?: string, category?: string): string {
  const location = city ? ` in ${city}` : '';
  const categoryText = category ? ` ${category}` : ' place';
  
  if (count === 0) {
    return `I couldn't find any${categoryText}s${location}. Try a different search or browse all destinations.`;
  }
  
  if (count === 1) {
    return `I found 1${categoryText}${location}.`;
  }
  
  return `I found ${count}${categoryText}s${location}.`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const body = await request.json();
    const { query, userId, conversationHistory = [] } = body;

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        content: 'What are you looking for? Try searching for a place, city, or experience.',
        destinations: []
      });
    }

    // Request deduplication: prevent duplicate in-flight requests
    const requestKey = `${query.toLowerCase().trim()}_${userId || 'anon'}_${conversationHistory.length}`;
    const existingRequest = pendingRequests.get(requestKey);

    if (existingRequest) {
      console.log('[AI Chat] Deduplicating request:', query);
      try {
        return await existingRequest;
      } catch (error) {
        // If the existing request failed, continue with a new one
        pendingRequests.delete(requestKey);
      }
    }

    // Create a new request promise
    const requestPromise = (async () => {
      try {
        return await processAIChatRequest(query, userId, conversationHistory);
      } finally {
        // Clean up after request completes
        pendingRequests.delete(requestKey);
      }
    })();

    // Store the promise for deduplication
    pendingRequests.set(requestKey, requestPromise);

    return await requestPromise;
  } catch (error: any) {
    console.error('AI Chat API error:', error);
    return NextResponse.json({
      content: 'Sorry, I encountered an error. Please try again.',
      destinations: []
    }, { status: 500 });
  }
}

// Extract main logic into separate function for cleaner deduplication
async function processAIChatRequest(
  query: string,
  userId: string | undefined,
  conversationHistory: Array<{role: string, content: string}>
) {
  const supabase = await createServerClient();
  try {

    // Parallelize intent understanding and embedding generation for better performance
    const [intent, queryEmbedding] = await Promise.all([
      understandQuery(query, conversationHistory, userId),
      generateEmbedding(query)
    ]);

    // Normalize category using synonyms
    if (intent.category) {
      const normalized = CATEGORY_SYNONYMS[intent.category.toLowerCase()];
      if (normalized) {
        intent.category = normalized;
      }
    }

    console.log('[AI Chat] Query:', query, 'Intent:', JSON.stringify(intent, null, 2));

    // Check cache for non-personalized searches
    if (!userId) {
      const cacheKey = getCacheKey(query, intent);
      const cachedResult = getFromCache(cacheKey);
      if (cachedResult) {
        console.log('[AI Chat] Returning cached results for:', query);
        return NextResponse.json(cachedResult);
      }
    }

    let results: any[] = [];
    let searchTier = 'ai-chat';

    // PRIMARY STRATEGY: Discovery Engine is the primary search method (always try first)
    // Determine if this is a conversational query (follow-up)
    const isConversational = conversationHistory.length > 0;
    const isNaturalLanguage = query.includes('with') || query.includes('under') || query.includes('near') || 
                              query.includes('open now') || query.includes('outdoor') || query.includes('indoor');

    // Strategy 1: Try Discovery Engine (PRIMARY - always connected and used first)
    try {
      const discoveryEngine = getDiscoveryEngineService();
      let discoveryResult;
      
      // Check if Discovery Engine is available (primary search method)
      if (discoveryEngine.isAvailable()) {
        // Use conversational search for follow-up queries
        if (isConversational && conversationHistory.length > 0) {
          try {
            // Build enhanced query with conversation context
            // Extract key information from conversation history
            const recentMessages = conversationHistory.slice(-4); // Last 4 messages for better context
            const conversationSummary = recentMessages
              .map((msg, idx) => {
                if (msg.role === 'user') {
                  return `Q${Math.floor(idx/2) + 1}: ${msg.content}`;
                } else {
                  return `A${Math.floor(idx/2) + 1}: ${msg.content.substring(0, 100)}...`;
                }
              })
              .join(' | ');
            
            // Enhanced query that includes conversation context
            const enhancedQuery = conversationHistory.length > 2 
              ? `${query} (previous conversation: ${conversationSummary})`
              : `${query} (context: ${recentMessages.map(m => m.content).join(' ')})`;
            
            const convResults = await discoveryEngine.search(enhancedQuery, {
              userId: userId,
              pageSize: 100,
              filters: {
                city: intent.city,
                category: intent.category,
                priceLevel: intent.filters?.priceLevel,
                minRating: intent.filters?.rating,
              },
            });
            
            if (convResults.results.length > 0) {
              discoveryResult = {
                source: 'discovery_engine',
                results: convResults.results,
                totalSize: convResults.totalSize,
              };
              searchTier = 'conversational-search';
              console.log(`[AI Chat] Discovery Engine (conversational) found ${discoveryResult.results.length} results`);
            }
          } catch (convError) {
            console.warn('[AI Chat] Conversational search failed, trying regular Discovery Engine:', convError);
          }
        }
        
        // Use natural language search for complex queries
        if (!discoveryResult && isNaturalLanguage) {
          try {
            // Parse natural language filters
            const parsedFilters = parseNaturalLanguageFilters(query);
            const cleanQuery = cleanNaturalLanguageQuery(query);
            
            const nlResults = await discoveryEngine.search(cleanQuery, {
              userId: userId,
              pageSize: 100,
              filters: parsedFilters,
            });
            
            if (nlResults.results.length > 0) {
              discoveryResult = {
                source: 'discovery_engine',
                results: nlResults.results,
                totalSize: nlResults.totalSize,
              };
              searchTier = 'natural-language-search';
              console.log(`[AI Chat] Discovery Engine (natural language) found ${nlResults.results.length} results`);
            }
          } catch (nlError) {
            console.warn('[AI Chat] Natural language search failed, trying regular Discovery Engine:', nlError);
          }
        }
        
        // PRIMARY: Always try regular Discovery Engine search (connected as primary method)
        if (!discoveryResult) {
          discoveryResult = await unifiedSearch({
            query: query,
            userId: userId,
            city: intent.city,
            category: intent.category,
            priceLevel: intent.filters?.priceLevel,
            minRating: intent.filters?.rating,
            pageSize: 100,
            useCache: true,
          });
        }

        // Process Discovery Engine results (primary search method)
        if (discoveryResult && discoveryResult.source === 'discovery_engine' && discoveryResult.results.length > 0) {
          // Transform Discovery Engine results to match our format
          results = discoveryResult.results.map((result: any) => ({
            ...result,
            // Map Discovery Engine fields to our expected format
            id: result.id || result.slug,
            name: result.name,
            description: result.description,
            city: result.city,
            category: result.category,
            rating: result.rating || 0,
            price_level: result.priceLevel || result.price_level || 0,
            michelin_stars: result.michelin_stars || 0,
            slug: result.slug || result.id,
            relevanceScore: result.relevanceScore || 0,
          }));
          searchTier = searchTier === 'ai-chat' ? 'discovery-engine' : searchTier;
          console.log(`[AI Chat] Discovery Engine (primary) found ${results.length} results`);
          
          // Track search event for personalization
          if (userId) {
            try {
              await discoveryEngine.trackEvent({
                userId: userId,
                eventType: 'search',
                searchQuery: query,
              });
            } catch (trackError) {
              console.warn('[AI Chat] Failed to track search event:', trackError);
            }
          }
        }
      } else {
        console.log('[AI Chat] Discovery Engine not available, using fallback search');
      }
    } catch (discoveryError: any) {
      console.debug('[AI Chat] Discovery Engine search failed (expected if not configured), falling back to Supabase:', discoveryError?.message || discoveryError);
    }

    // Strategy 2: Fallback to Supabase vector search (if Discovery Engine didn't return results)
    if (results.length === 0 && queryEmbedding) {
      try {
        const { data, error } = await supabase.rpc('match_destinations', {
          query_embedding: queryEmbedding,
          match_threshold: 0.6,
          match_count: 100,
          filter_city: intent.city || null,
          filter_category: intent.category || null,
          filter_michelin_stars: intent.filters?.michelinStar || null,
          filter_min_rating: intent.filters?.rating || null,
          filter_max_price_level: intent.filters?.priceLevel || null,
          search_query: query
        });
        
        if (!error && data && data.length > 0) {
          results = data;
          searchTier = 'vector-search';
          console.log(`[AI Chat] Vector search found ${results.length} results`);
        }
      } catch (error: any) {
        console.error('[AI Chat] Vector search error:', error);
      }
    }

    // Strategy 3: Fallback to keyword search (if still no results)
    if (results.length === 0) {
      try {
        let keywordQuery = supabase
          .from('destinations')
          .select('*, parent_destination_id')
          .is('parent_destination_id', null) // Only top-level destinations in search
          .limit(100);

        if (intent.city) {
          keywordQuery = keywordQuery.ilike('city', `%${intent.city}%`);
        }

        if (intent.category) {
          keywordQuery = keywordQuery.ilike('category', `%${intent.category}%`);
        }

        if (intent.filters?.rating) {
          keywordQuery = keywordQuery.gte('rating', intent.filters.rating);
        }

        if (intent.filters?.priceLevel) {
          keywordQuery = keywordQuery.lte('price_level', intent.filters.priceLevel);
        }

        if (intent.filters?.michelinStar) {
          keywordQuery = keywordQuery.gte('michelin_stars', intent.filters.michelinStar);
        }

        const keywords = query.split(/\s+/).filter((w: string) => w.length > 2);
        if (keywords.length > 0) {
          keywordQuery = keywordQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%,search_text.ilike.%${query}%`);
        }

        const { data, error } = await keywordQuery;
        
        if (!error && data && data.length > 0) {
          results = data;
          searchTier = 'keyword-search';
          console.log(`[AI Chat] Keyword search found ${results.length} results`);
        }
      } catch (error: any) {
        console.error('[AI Chat] Keyword search error:', error);
      }
    }

    // Last resort - show popular destinations in the city
    if (results.length === 0 && intent.city) {
      try {
        const { data: cityResults } = await supabase
          .from('destinations')
          .select('*, parent_destination_id')
          .is('parent_destination_id', null) // Only top-level destinations
          .ilike('city', `%${intent.city}%`)
          .order('rating', { ascending: false })
          .limit(50);

        if (cityResults && cityResults.length > 0) {
          results = cityResults;
          console.log('[AI Chat] City fallback found', results.length, 'results');
        }
      } catch (error: any) {
        console.error('[AI Chat] City fallback exception:', error);
      }
    }

                // Enrich results with additional data (photos, weather, routes, events) BEFORE reranking
                // Optimized: Only enrich top 3 results for better performance
                const topResults = results.slice(0, 3); // Reduced from 10 to 3
                const slugsToEnrich = topResults.map((dest: any) => dest.slug);

                let enrichmentDataMap = new Map();
                if (slugsToEnrich.length > 0) {
                  try {
                    const { data: enrichmentData } = await supabase
                      .from('destinations')
                      .select('slug, photos_json, current_weather_json, weather_forecast_json, nearby_events_json, route_from_city_center_json, walking_time_from_center_minutes, static_map_url, currency_code, exchange_rate_to_usd')
                      .in('slug', slugsToEnrich);

                    if (enrichmentData) {
                      enrichmentData.forEach((item: any) => {
                        enrichmentDataMap.set(item.slug, item);
                      });
                    }
                  } catch (error) {
                    // Silently fail - enrichment is optional
                    console.debug('Enrichment batch fetch failed:', error);
                  }
                }

                const enrichedResults = topResults.map((dest: any) => {
                  const enriched = enrichmentDataMap.get(dest.slug);
                  if (enriched) {
                    return {
                      ...dest,
                      photos: enriched.photos_json ? JSON.parse(enriched.photos_json) : null,
                      currentWeather: enriched.current_weather_json ? JSON.parse(enriched.current_weather_json) : null,
                      weatherForecast: enriched.weather_forecast_json ? JSON.parse(enriched.weather_forecast_json) : null,
                      nearbyEvents: enriched.nearby_events_json ? JSON.parse(enriched.nearby_events_json) : null,
                      routeFromCityCenter: enriched.route_from_city_center_json ? JSON.parse(enriched.route_from_city_center_json) : null,
                      walkingTimeFromCenter: enriched.walking_time_from_center_minutes,
                      staticMapUrl: enriched.static_map_url,
                      currencyCode: enriched.currency_code,
                      exchangeRateToUSD: enriched.exchange_rate_to_usd,
                    };
                  }
                  return dest;
                });

                // Apply enhanced re-ranking to results with enriched context
                const topResultForContext = enrichedResults[0];
                const enrichedContext = topResultForContext ? {
                  currentWeather: topResultForContext.currentWeather || null,
                  nearbyEvents: topResultForContext.nearbyEvents || null,
                } : null;

                const rerankedResults = rerankDestinations(enrichedResults, {
                  query,
                  queryIntent: {
                    city: intent.city,
                    category: intent.category,
                    price_level: intent.filters?.priceLevel,
                    // Infer weather preference from query
                    weather_preference: query.toLowerCase().includes('outdoor') ? 'outdoor' :
                                      query.toLowerCase().includes('indoor') ? 'indoor' : null,
                    event_context: query.toLowerCase().includes('event') || query.toLowerCase().includes('happening'),
                  },
                  userId: userId,
                  boostPersonalized: !!userId,
                  enrichedContext: enrichedContext || undefined,
                });

                // Combine reranked enriched results with remaining unenriched results
                // This maintains performance while still showing all results
                const remainingResults = results.slice(3); // Updated from 10 to 3
                const limitedResults = [...rerankedResults, ...remainingResults];

                // Generate intelligent response with enriched context
                const response = await generateIntelligentResponse(
                  limitedResults,
                  query,
                  intent,
                  intent, // Pass intent twice for backward compatibility
                  userId
                );

                // Generate enhanced response with context if needed
                let enhancedContent = response;
                if (intent.clarifications && intent.clarifications.length > 0 && limitedResults.length === 0) {
                  enhancedContent = `${response}\n\n💡 ${intent.clarifications[0]}`;
                }

    // Get intelligence insights only if city detected and we have results (optional feature for performance)
    // Disabled for better performance - can be re-enabled if needed
    let intelligenceInsights = null;
    // if (intent.city && limitedResults.length > 0) {
    //   try {
    //     const [forecast, opportunities] = await Promise.all([
    //       forecastingService.forecastDemand(intent.city, undefined, 30),
    //       opportunityDetectionService.detectOpportunities(userId, intent.city, 3),
    //     ]);

    //     intelligenceInsights = {
    //       forecast,
    //       opportunities: opportunities.slice(0, 3),
    //     };
    //   } catch (error) {
    //     // Silently fail - insights are optional
    //   }
    // }

                // Log search/chat interaction (best-effort)
                try {
                  await supabase.from('user_interactions').insert({
                    interaction_type: 'search',
                    user_id: userId || null,
                    destination_id: null,
                    metadata: {
                      query,
                      intent,
                      count: limitedResults.length,
                      source: 'api/ai-chat',
                    }
                  });
                } catch {}

                // Include enriched metadata in response
                const enrichedMetadata = {
                  searchTier: searchTier,
                  hasWeather: limitedResults.some((r: any) => r.currentWeather),
                  hasEvents: limitedResults.some((r: any) => r.nearbyEvents && r.nearbyEvents.length > 0),
                  hasRoutes: limitedResults.some((r: any) => r.routeFromCityCenter),
                  hasPhotos: limitedResults.some((r: any) => r.photos && r.photos.length > 0),
                  totalPhotos: limitedResults.reduce((sum: number, r: any) => sum + (r.photos?.length || 0), 0),
                  totalEvents: limitedResults.reduce((sum: number, r: any) => sum + (r.nearbyEvents?.length || 0), 0),
                };

                // Generate follow-up suggestions
                let followUpSuggestions: Array<{ text: string; icon?: 'location' | 'time' | 'price' | 'rating' | 'default'; type?: 'refine' | 'expand' | 'related' }> = [];
                try {
                  const { generateFollowUpSuggestions } = await import('@/lib/chat/generateFollowUpSuggestions');
                  
                  // Get user context if available
                  let userContextData: any = undefined;
                  if (userId) {
                    try {
                      const { data: profile } = await supabase
                        .from('user_profiles')
                        .select('favorite_cities, favorite_categories')
                        .eq('user_id', userId)
                        .single();
                      
                      if (profile) {
                        userContextData = {
                          favoriteCities: profile.favorite_cities || [],
                          favoriteCategories: profile.favorite_categories || [],
                        };
                      }
                    } catch (error) {
                      // Silently fail - user context is optional
                    }
                  }
                  
                  // Normalize intent filters for suggestions (convert priceLevel number to string if needed)
                  const normalizedIntent = intent ? {
                    ...intent,
                    filters: intent.filters ? {
                      ...intent.filters,
                      priceLevel: intent.filters.priceLevel ? String(intent.filters.priceLevel) : undefined,
                    } : undefined,
                  } : undefined;
                  
                  followUpSuggestions = generateFollowUpSuggestions({
                    query,
                    intent: normalizedIntent,
                    destinations: limitedResults,
                    conversationHistory,
                    userContext: userContextData,
                  });
                } catch (error) {
                  // Silently fail - suggestions are optional
                  console.debug('[AI Chat] Failed to generate suggestions:', error);
                }

                const responseData = {
                  content: enhancedContent,
                  destinations: limitedResults,
                  searchTier: searchTier, // Include search tier (discovery-engine, vector-search, keyword-search)
                  intent: {
                    ...intent,
                    resultCount: limitedResults.length,
                    hasResults: limitedResults.length > 0
                  },
                  inferredTags: intent.inferredTags || undefined, // Include inferred tags for refinement chips
                  intelligence: intelligenceInsights,
                  enriched: enrichedMetadata, // Include enrichment metadata
                  suggestions: followUpSuggestions, // Include follow-up suggestions
                };

                // Cache non-personalized results
                if (!userId) {
                  const cacheKey = getCacheKey(query, intent);
                  setInCache(cacheKey, responseData);
                }

                return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('AI Chat request processing error:', error);
    return NextResponse.json({
      content: 'Sorry, I encountered an error. Please try again.',
      destinations: []
    }, { status: 500 });
  }
}
