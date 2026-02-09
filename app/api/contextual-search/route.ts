import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateContext } from '@/services/gemini';
import { getSeasonalContext } from '@/services/seasonality';
import type { Listing } from '@/services/gemini';
import { withStandardApi, createSuccessResponse } from '@/lib/api';
import { resolveCategory } from '@/lib/categories';

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = 
    process.env.SUPABASE_SECRET_KEY || 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    'placeholder-key';

  return createClient(url, key);
}

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const genAI = GOOGLE_API_KEY ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;

/**
 * Modifier keyword map for extraction
 */
const MODIFIER_KEYWORDS: Record<string, string> = {
  // Atmosphere/Experience
  'romantic': 'romantic',
  'cozy': 'cozy',
  'cute': 'cute',
  'chic': 'chic',
  'elegant': 'elegant',
  'casual': 'casual',
  'trendy': 'trendy',
  'hip': 'hip',
  'vintage': 'vintage',
  'modern': 'modern',
  'traditional': 'traditional',
  'luxury': 'luxury',
  'affordable': 'affordable',
  'budget': 'budget',
  
  // Dining-specific
  'michelin': 'michelin',
  'fine-dining': 'fine-dining',
  'fine dining': 'fine-dining',
  'vegetarian': 'vegetarian',
  'vegan': 'vegan',
  'cafe': 'cafe',
  'café': 'cafe',
  'restaurant': 'restaurant',
  'dining': 'dining',
  'brunch': 'brunch',
  'breakfast': 'breakfast',
  'lunch': 'lunch',
  'dinner': 'dinner',
  'bar': 'bar',
  'cocktail': 'cocktail',
  'wine': 'wine',
  'sushi': 'sushi',
  'ramen': 'ramen',
  'italian': 'italian',
  'french': 'french',
  'japanese': 'japanese',
  
  // Accommodation
  'hotel': 'hotel',
  'boutique': 'boutique',
  'resort': 'resort',
  'spa': 'spa',
  
  // Other
  'rooftop': 'rooftop',
  'outdoor': 'outdoor',
  'terrace': 'terrace',
  'garden': 'garden',
};

/**
 * Extract city and modifiers from query
 */
async function extractIntent(query: string): Promise<{
  city?: string;
  category?: string;
  modifiers: string[];
}> {
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/);
  
  // Known cities (extend as needed)
  const cities = [
    'tokyo', 'kyoto', 'osaka', 'paris', 'london', 'new york', 'rome', 
    'barcelona', 'berlin', 'amsterdam', 'sydney', 'dubai', 'copenhagen',
    'lisbon', 'stockholm', 'vienna', 'prague', 'istanbul', 'seoul',
    'hong kong', 'singapore', 'bangkok', 'saigon', 'ho chi minh'
  ];
  
  // Categories
  const categories = ['restaurant', 'hotel', 'cafe', 'bar', 'museum', 'park', 'temple'];
  
  let city: string | undefined;
  let category: string | undefined;
  const modifiers: string[] = [];
  
  // Extract city
  for (const cityName of cities) {
    if (lowerQuery.includes(cityName)) {
      city = cityName;
      break;
    }
  }
  
  // Extract category
  for (const cat of categories) {
    if (lowerQuery.includes(cat)) {
      category = cat;
      break;
    }
  }
  
  // Extract modifiers using keyword map
  const foundModifiers = new Set<string>();
  
  for (const [keyword, tag] of Object.entries(MODIFIER_KEYWORDS)) {
    // Check for whole word matches
    const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(query)) {
      foundModifiers.add(tag);
    }
  }
  
  // Use AI for better extraction if available
  if (genAI && foundModifiers.size === 0) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
      const prompt = `Extract descriptive modifiers from this travel search query. Return ONLY valid JSON:
{
  "modifiers": ["array", "of", "modifiers", "like", "romantic", "michelin", "vegetarian", "cute-cafe"]
}

Query: "${query}"

Only include modifiers that describe attributes like: romantic, michelin, fine-dining, vegetarian, vegan, cute, cozy, luxury, budget, boutique, rooftop, etc.
Do NOT include cities or basic categories like "restaurant" or "hotel" unless they're part of a compound like "cute-cafe".

Return only JSON:`;
      
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.modifiers)) {
          parsed.modifiers.forEach((mod: string) => foundModifiers.add(mod.toLowerCase()));
        }
      }
    } catch (error) {
      console.error('AI modifier extraction error:', error);
    }
  }
  
  return {
    city,
    category,
    modifiers: Array.from(foundModifiers),
  };
}

/**
 * Filter destinations by tags containing ALL modifiers
 */
function filterByModifiers(destinations: any[], modifiers: string[]): any[] {
  if (modifiers.length === 0) {
    return destinations;
  }
  
  return destinations.filter(dest => {
    const tags = dest.tags || [];
    const lowerTags = tags.map((tag: string) => tag.toLowerCase());
    
    // All modifiers must be present in tags
    return modifiers.every(modifier => 
      lowerTags.some((tag: string) => tag === modifier || tag.includes(modifier))
    );
  });
}

/**
 * Generate context using the gemini service
 */
async function generateContextString(
  query: string,
  city: string | undefined,
  category: string | undefined,
  modifiers: string[],
  resultCount: number,
  noModifierMatches: boolean,
  matchingDestinations: any[]
): Promise<string> {
  // Convert destinations to Listing format
  const listings: Listing[] = matchingDestinations.map(d => ({
    slug: d.slug,
    name: d.name,
    city: d.city,
    category: d.category,
    description: d.description,
    tags: d.tags || [],
  }));
  
  // Get seasonal context
  const seasonality = city ? getSeasonalContext(city) : undefined;
  
  if (noModifierMatches) {
    // Use service for fallback message
    const fallback = await generateContext(query, city, [], listings, seasonality);
    return fallback.replace(/Here are our/, "We don't have places matching your specific criteria, but here are our");
  }
  
  return generateContext(query, city, modifiers, listings, seasonality);
}

export const POST = withStandardApi(
  { rateLimit: 'search', auth: 'optional', routeName: '/api/contextual-search' },
  async (request: NextRequest) => {
  const body = await request.json();
  const { query } = body;

  if (!query || query.trim().length < 2) {
    return createSuccessResponse({
      context: 'What would you like to discover? Try searching for a place, city, or experience.',
      results: [],
      noModifierMatches: false,
    });
  }

  // Extract intent (city, category, modifiers)
  const intent = await extractIntent(query);
  console.log('[Contextual Search] Query:', query, 'Intent:', JSON.stringify(intent, null, 2));

  const supabase = getSupabaseClient();

  // Build base query
  let baseQuery = supabase
    .from('destinations')
    .select('slug, name, city, category, micro_description, description, content, image, michelin_stars, crown, rating, price_level, tags, style_tags, ambience_tags, experience_tags')
    .limit(1000);

  // Apply city filter
  if (intent.city) {
    baseQuery = baseQuery.ilike('city', `%${intent.city}%`);
  }

  // Apply category filter using centralized resolver
  if (intent.category) {
    const normalizedCategory = resolveCategory(intent.category) || intent.category;
    baseQuery = baseQuery.ilike('category', `%${normalizedCategory}%`);
  }

  // Get base results
  const { data: baseResults, error } = await baseQuery;

  if (error) {
    console.error('[Contextual Search] Error fetching base results:', error);
    throw error;
  }

  const results = baseResults || [];

  // Filter by modifiers if any (use tags + style/ambience/experience)
  let filteredResults = results;
  let noModifierMatches = false;

  if (intent.modifiers.length > 0) {
    const lowerModifiers = intent.modifiers.map(m => m.toLowerCase());
    filteredResults = results.filter((d: any) => {
      const tags = (d.tags || []).concat(d.style_tags || [], d.ambience_tags || [], d.experience_tags || []);
      const lowerTags = (tags as any[]).map((t: any) => String(t).toLowerCase());
      return lowerModifiers.every((m: string) => lowerTags.some((t: string) => t === m || t.includes(m)));
    });

    if (filteredResults.length === 0) {
      // No matches for modifiers, fall back to base results
      noModifierMatches = true;
      filteredResults = results;
    }
  }

  // Boosting: apply simple scoring for presentation order
  const boosted = filteredResults
    .map((d: any) => {
      let score = 0;
      // Popularity proxies
      if (d.michelin_stars && d.michelin_stars > 0) score += 15;
      if (d.rating) score += d.rating * 2;
      // Modifiers match bonus across style/ambience
      const pool = (d.style_tags || []).concat(d.ambience_tags || [], d.experience_tags || [], d.tags || []);
      const lowerPool = (pool as any[]).map((t: any) => String(t).toLowerCase());
      score += intent.modifiers.reduce((acc: number, m: string) => acc + (lowerPool.some((t: string) => t === m || t.includes(m)) ? 3 : 0), 0);
      return { ...d, _score: score };
    })
    .sort((a: any, b: any) => b._score - a._score);

  // Generate context string using gemini service
  const context = await generateContextString(
    query,
    intent.city,
    intent.category,
    intent.modifiers,
    boosted.length,
    noModifierMatches,
    boosted
  );

  return createSuccessResponse({
    context,
    results: boosted.slice(0, 50), // Limit to 50 results
    noModifierMatches,
    intent,
  });
});

