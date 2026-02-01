/**
 * Travel Intelligence API v2
 *
 * A unified, conversational travel search endpoint that combines:
 * - Semantic vector search (Upstash)
 * - Natural language understanding
 * - 8-factor intelligent ranking
 * - Knowledge graph relationships
 * - Conversation memory
 * - Personalization
 * - LLM-powered conversational responses
 * - Itinerary planning mode
 * - Multi-turn clarification
 * - Taste profile learning
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling } from '@/lib/errors';
import { queryVectorIndex, VectorSearchResult } from '@/lib/upstash-vector';
import { generateTextEmbedding } from '@/lib/ml/embeddings';
import { searchRankingAlgorithm } from '@/services/intelligence/search-ranking';
import { knowledgeGraphService } from '@/services/intelligence/knowledge-graph';
import { generateText, generateJSON } from '@/lib/llm';
import { tasteProfileEvolutionService } from '@/services/intelligence/taste-profile-evolution';
import { searchRatelimit, memorySearchRatelimit, getIdentifier, createRateLimitResponse, isUpstashConfigured } from '@/lib/rate-limit';
import { unifiedIntelligenceCore, UnifiedContext, AutonomousAction } from '@/services/intelligence/unified-intelligence-core';
import { sanitizeForIlike } from '@/lib/sanitize';

// Types
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  metadata?: {
    intent?: string;
    filters?: SearchFilters;
    destinationIds?: number[];
  };
}

interface SearchFilters {
  city?: string | null;
  category?: string | null;
  neighborhood?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  michelin?: boolean;
  occasion?: string | null;
  vibe?: string[];
  openNow?: boolean;
}

interface TravelIntelligenceRequest {
  query: string;
  conversationHistory?: ConversationMessage[];
  filters?: SearchFilters;
  limit?: number;
}

// Deterministic UI types
type RefinementKind = 'vibe' | 'price' | 'neighborhood' | 'category' | 'city' | 'misc';

interface ContextChip {
  key: string;
  label: string;
  removable?: boolean;
  patch?: Partial<SearchFilters>;
}

interface RefinementChip {
  label: string;
  patch: Partial<SearchFilters>;
  kind: RefinementKind;
}

interface QuestionCard {
  prompt: string;
  options: Array<{
    label: string;
    patch: Partial<SearchFilters>;
  }>;
}

interface DeterministicUI {
  contextChips: ContextChip[];
  refinements: RefinementChip[];
  question?: QuestionCard;
  whyBySlug?: Record<string, string[]>;
}

interface ParsedIntent {
  searchQuery: string;
  filters: SearchFilters;
  intent: 'search' | 'recommendation' | 'discovery' | 'comparison' | 'more_like_this' | 'itinerary' | 'clarification_response' | 'group_recommendation';
  occasion?: string;
  vibes: string[];
  timeContext?: 'breakfast' | 'lunch' | 'dinner' | 'late_night';
  priceContext?: 'budget' | 'mid_range' | 'splurge';
  socialContext?: 'solo' | 'date' | 'group' | 'business' | 'family';
  referenceDestination?: string;
  itineraryDuration?: 'half_day' | 'full_day' | 'multi_day';
  needsClarification?: boolean;
  clarificationType?: 'city' | 'category' | 'occasion' | 'price';
  // Collaborative trip planning
  groupPreferences?: GroupPreference[];
}

interface GroupPreference {
  person: string; // 'me', 'friend', 'partner', etc.
  cuisines?: string[];
  vibes?: string[];
  priceContext?: 'budget' | 'mid_range' | 'splurge';
}

interface ItinerarySlot {
  timeSlot: 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening';
  label: string;
  category: string;
  destination?: any;
}

// Vibe keywords mapping
const VIBE_KEYWORDS: Record<string, string[]> = {
  romantic: ['romantic', 'intimate', 'cozy', 'date night', 'anniversary', 'special occasion'],
  trendy: ['trendy', 'hip', 'cool', 'instagram', 'hot spot', 'buzzy', 'scene'],
  hidden_gem: ['hidden gem', 'local', 'secret', 'off the beaten path', 'authentic', 'undiscovered'],
  upscale: ['upscale', 'fancy', 'luxury', 'fine dining', 'elegant', 'high-end', 'splurge'],
  casual: ['casual', 'relaxed', 'laid back', 'chill', 'easy going'],
  lively: ['lively', 'energetic', 'fun', 'vibrant', 'bustling'],
  quiet: ['quiet', 'peaceful', 'serene', 'calm', 'tranquil'],
  design: ['design', 'architecture', 'beautiful space', 'aesthetic', 'minimalist', 'interior'],
};

// Occasion keywords
const OCCASION_KEYWORDS: Record<string, string[]> = {
  anniversary: ['anniversary', 'celebration', 'special occasion', 'milestone'],
  birthday: ['birthday', 'celebration'],
  business: ['business', 'client', 'meeting', 'work', 'professional'],
  date: ['date', 'romantic', 'date night', 'first date'],
  family: ['family', 'kids', 'children', 'parents'],
  friends: ['friends', 'group', 'catch up', 'reunion'],
};

// City name variations
const CITY_VARIATIONS: Record<string, string[]> = {
  // Taiwan
  'taipei': ['taipei', 'da\'an', 'xinyi', 'zhongshan', 'songshan', 'wanhua', 'shilin', 'beitou'],
  'kaohsiung': ['kaohsiung', 'kaohsiung city'],
  'taichung': ['taichung'],
  'tainan': ['tainan'],
  'pintung': ['pintung'],
  'chiayi': ['chiayi'],

  // Japan
  'tokyo': ['tokyo', 'tōkyō', 'shibuya', 'shinjuku', 'ginza', 'roppongi', 'harajuku', 'ebisu', 'nakameguro', 'aoyama', 'daikanyama'],
  'kyoto': ['kyoto', 'kyōto', 'gion', 'arashiyama', 'higashiyama'],
  'osaka': ['osaka'],
  'fukuoka': ['fukuoka'],
  'sapporo': ['sapporo'],
  'nagoya': ['nagoya'],
  'kobe': ['kobe'],
  'yokohama': ['yokohama'],
  'nara': ['nara'],
  'hiroshima': ['hiroshima'],
  'kyushu': ['kyushu'],
  'nagato': ['nagato'],
  'karuizawa': ['karuizawa'],
  'okinawa': ['okinawa'],
  'kamakura': ['kamakura'],
  'kanazawa': ['kanazawa'],
  'atami': ['atami'],
  'hakone': ['hakone'],

  // USA
  'new york': ['new york', 'nyc', 'manhattan', 'brooklyn', 'soho', 'tribeca', 'williamsburg', 'greenwich village', 'east village', 'west village', 'lower east side', 'upper east side', 'upper west side', 'chelsea', 'flatiron', 'nolita', 'noho', 'new-york'],
  'los angeles': ['los angeles', 'la', 'silver lake', 'echo park', 'west hollywood', 'venice', 'santa monica', 'downtown la', 'dtla', 'highland park', 'los feliz', 'koreatown', 'beverly hills', 'culver city', 'los-angeles'],
  'san francisco': ['san francisco', 'sf', 'san-francisco'],
  'chicago': ['chicago'],
  'miami': ['miami'],
  'seattle': ['seattle'],
  'boston': ['boston'],
  'portland': ['portland'],
  'austin': ['austin'],
  'denver': ['denver'],
  'las vegas': ['las vegas', 'vegas', 'las-vegas'],
  'washington dc': ['washington dc', 'washington', 'dc', 'washington-dc'],
  'philadelphia': ['philadelphia', 'philly'],
  'san diego': ['san diego', 'san-diego'],
  'nashville': ['nashville'],
  'new orleans': ['new orleans', 'new-orleans', 'nola'],
  'colorado': ['colorado'],
  'charleston': ['charleston'],
  'hawaii': ['hawaii'],
  'orlando': ['orlando'],
  'hudson valley': ['hudson valley', 'hudson-valley'],

  // UK
  'london': ['london', 'soho', 'shoreditch', 'mayfair', 'notting hill', 'covent garden', 'chelsea', 'kensington', 'fitzrovia', 'marylebone', 'hackney', 'brixton'],
  'edinburgh': ['edinburgh'],
  'manchester': ['manchester'],
  'liverpool': ['liverpool'],
  'bristol': ['bristol'],
  'oxford': ['oxford'],
  'cambridge': ['cambridge'],

  // France
  'paris': ['paris', 'le marais', 'montmartre', 'saint-germain', 'bastille', 'belleville', 'pigalle', 'opera', 'chatelet'],
  'lyon': ['lyon'],
  'marseille': ['marseille'],
  'nice': ['nice'],
  'bordeaux': ['bordeaux'],
  'cannes': ['cannes'],

  // Italy
  'rome': ['rome', 'roma'],
  'milan': ['milan', 'milano'],
  'florence': ['florence', 'firenze'],
  'venice': ['venice', 'venezia'],
  'naples': ['naples', 'napoli'],
  'bologna': ['bologna'],
  'turin': ['turin', 'torino'],
  'como': ['como'],
  'lake como': ['lake como', 'lake-como'],

  // Spain
  'barcelona': ['barcelona'],
  'madrid': ['madrid'],
  'seville': ['seville', 'sevilla'],
  'valencia': ['valencia'],
  'bilbao': ['bilbao'],
  'san sebastian': ['san sebastian', 'san-sebastian'],

  // Germany
  'berlin': ['berlin'],
  'munich': ['munich', 'münchen'],
  'hamburg': ['hamburg'],
  'frankfurt': ['frankfurt'],
  'cologne': ['cologne', 'köln'],
  'dresden': ['dresden'],

  // Netherlands
  'amsterdam': ['amsterdam'],
  'rotterdam': ['rotterdam'],
  'the hague': ['the hague', 'the-hague', 'den haag'],
  'utrecht': ['utrecht'],

  // Switzerland
  'zurich': ['zurich', 'zürich'],
  'geneva': ['geneva', 'genève'],
  'basel': ['basel'],
  'bern': ['bern'],
  'lausanne': ['lausanne'],
  'luzern': ['luzern', 'lucerne'],
  'valais': ['valais'],

  // Austria
  'vienna': ['vienna', 'wien'],
  'salzburg': ['salzburg'],
  'innsbruck': ['innsbruck'],

  // Belgium
  'brussels': ['brussels', 'bruxelles'],
  'bruges': ['bruges', 'brugge'],
  'antwerp': ['antwerp', 'antwerpen'],
  'ghent': ['ghent', 'gent'],

  // Scandinavia
  'copenhagen': ['copenhagen', 'københavn'],
  'stockholm': ['stockholm'],
  'oslo': ['oslo'],
  'helsinki': ['helsinki'],
  'reykjavik': ['reykjavik', 'reykjavík'],

  // Southern Europe
  'lisbon': ['lisbon', 'lisboa'],
  'porto': ['porto'],
  'athens': ['athens'],
  'santorini': ['santorini'],
  'mykonos': ['mykonos'],
  'istanbul': ['istanbul'],

  // Middle East
  'dubai': ['dubai'],
  'abu dhabi': ['abu dhabi', 'abu-dhabi'],

  // Asia
  'singapore': ['singapore', 'orchard', 'marina bay', 'chinatown', 'little india', 'tiong bahru', 'kampong glam', 'dempsey'],
  'hong kong': ['hong kong', 'hk', 'central', 'wan chai', 'causeway bay', 'tsim sha tsui', 'mong kok', 'sheung wan', 'hong-kong'],
  'seoul': ['seoul'],
  'busan': ['busan'],
  'beijing': ['beijing'],
  'shanghai': ['shanghai'],
  'bangkok': ['bangkok', 'sukhumvit', 'silom', 'sathorn', 'thonglor', 'ekkamai', 'ari', 'chinatown'],
  'kuala lumpur': ['kuala lumpur', 'kuala-lumpur', 'kl'],
  'bali': ['bali'],
  'hanoi': ['hanoi'],
  'ho chi minh city': ['ho chi minh city', 'ho-chi-minh-city', 'saigon'],

  // Oceania
  'sydney': ['sydney'],
  'melbourne': ['melbourne'],
  'auckland': ['auckland'],

  // Americas
  'toronto': ['toronto'],
  'vancouver': ['vancouver'],
  'montreal': ['montreal'],
  'mexico city': ['mexico city', 'mexico-city', 'cdmx'],
  'buenos aires': ['buenos aires', 'buenos-aires'],
  'sao paulo': ['sao paulo', 'são paulo', 'sao-paulo'],
  'rio de janeiro': ['rio de janeiro', 'rio-de-janeiro', 'rio'],

  // Africa
  'cape town': ['cape town', 'cape-town'],
  'marrakech': ['marrakech', 'marrakesh'],
};

// Category variations
const CATEGORY_VARIATIONS: Record<string, string[]> = {
  'restaurant': ['restaurant', 'restaurants', 'food', 'dining', 'eat', 'eating', 'dinner', 'lunch', 'breakfast', 'brunch', 'cuisine', 'kitchen'],
  'hotel': ['hotel', 'hotels', 'stay', 'accommodation', 'lodging', 'sleep', 'boutique hotel', 'ryokan'],
  'bar': ['bar', 'bars', 'drinks', 'cocktails', 'cocktail bar', 'wine bar', 'speakeasy', 'nightlife', 'drinking'],
  'cafe': ['cafe', 'cafes', 'coffee', 'coffee shop', 'coffeehouse', 'espresso', 'specialty coffee'],
  'shop': ['shop', 'shopping', 'store', 'retail', 'boutique', 'buy'],
};

// Cuisine keywords for collaborative recommendations
const CUISINE_KEYWORDS: Record<string, string[]> = {
  'japanese': ['japanese', 'sushi', 'ramen', 'izakaya', 'omakase', 'kaiseki', 'tempura', 'udon', 'soba', 'yakitori', 'wagyu'],
  'italian': ['italian', 'pasta', 'pizza', 'trattoria', 'osteria', 'risotto', 'gelato'],
  'french': ['french', 'bistro', 'brasserie', 'patisserie', 'croissant', 'crepes'],
  'chinese': ['chinese', 'dim sum', 'cantonese', 'szechuan', 'dumpling', 'peking'],
  'korean': ['korean', 'bbq', 'bibimbap', 'kimchi', 'kbbq'],
  'thai': ['thai', 'pad thai', 'curry', 'som tam'],
  'mexican': ['mexican', 'tacos', 'taqueria', 'mezcal', 'margarita'],
  'indian': ['indian', 'curry', 'tandoori', 'naan', 'biryani'],
  'mediterranean': ['mediterranean', 'greek', 'hummus', 'falafel', 'mezze'],
  'american': ['american', 'burger', 'bbq', 'steakhouse', 'diner'],
  'seafood': ['seafood', 'fish', 'oyster', 'lobster', 'crab', 'sashimi'],
  'vegetarian': ['vegetarian', 'vegan', 'plant-based', 'veggie'],
  'fusion': ['fusion', 'modern', 'contemporary', 'innovative'],
};

/**
 * Check if query needs clarification
 */
function checkNeedsClarification(
  query: string,
  intent: ParsedIntent,
  conversationHistory: ConversationMessage[]
): { needsClarification: boolean; clarificationType?: string; clarificationQuestion?: string } {
  const lowerQuery = query.toLowerCase();

  // If it's a response to a clarification question, don't ask again
  if (conversationHistory.length > 0) {
    const lastAssistant = [...conversationHistory].reverse().find(m => m.role === 'assistant');
    if (lastAssistant?.content.includes('Which city') || lastAssistant?.content.includes('What kind of')) {
      return { needsClarification: false };
    }
  }

  // Check for ambiguous queries that need city
  const needsCityPatterns = [
    /^(?:best|good|nice|great)\s+(?:restaurants?|hotels?|bars?|cafes?|coffee)/i,
    /^(?:where|what)\s+(?:should|can|to)\s+(?:i|we)\s+(?:eat|stay|go|visit)/i,
    /^(?:recommend|suggest)\s+(?:a|some|me)/i,
  ];

  const hasCity = !!intent.filters.city;
  const hasCategory = !!intent.filters.category;

  // If query matches a pattern but has no city
  if (!hasCity && needsCityPatterns.some(p => p.test(lowerQuery))) {
    // Check if city was mentioned in recent conversation
    const recentCityMention = conversationHistory.slice(-4).some(m => {
      const content = m.content.toLowerCase();
      return Object.values(CITY_VARIATIONS).flat().some(v => content.includes(v));
    });

    if (!recentCityMention) {
      return {
        needsClarification: true,
        clarificationType: 'city',
        clarificationQuestion: `Which city are you looking for ${hasCategory ? intent.filters.category + 's' : 'places'} in? I cover Tokyo, Kyoto, New York, London, Paris, Taipei, and more.`,
      };
    }
  }

  // Generic query without any context
  if (!hasCity && !hasCategory && lowerQuery.length < 20 && !intent.vibes.length) {
    const genericPatterns = [/^show me/i, /^find me/i, /^i want/i, /^looking for/i];
    if (genericPatterns.some(p => p.test(lowerQuery))) {
      return {
        needsClarification: true,
        clarificationType: 'category',
        clarificationQuestion: `What are you looking for? I can help you find restaurants, hotels, cafes, bars, or shops.`,
      };
    }
  }

  return { needsClarification: false };
}

/**
 * Parse natural language query to extract intent, filters, and context
 */
function parseQueryIntent(
  query: string,
  conversationHistory: ConversationMessage[] = []
): ParsedIntent {
  const lowerQuery = query.toLowerCase();
  const result: ParsedIntent = {
    searchQuery: query,
    filters: {},
    intent: 'search',
    vibes: [],
  };

  // Check for group/collaborative preferences
  // Patterns like "my friend likes X, I like Y" or "one wants Italian, another wants Japanese"
  const groupPatterns = [
    /(?:my\s+)?(?:friend|partner|wife|husband|colleague|group)\s+(?:likes?|wants?|prefers?)\s+(\w+).*?(?:i|we|and\s+i)\s+(?:like|want|prefer)\s+(\w+)/i,
    /(?:one\s+(?:of\s+us|person)?)\s+(?:likes?|wants?)\s+(\w+).*?(?:another|the\s+other|someone\s+else)\s+(?:likes?|wants?)\s+(\w+)/i,
    /(\w+)\s+for\s+(?:my\s+)?(?:friend|partner|wife|husband).*?(\w+)\s+for\s+me/i,
    /(?:we|us)\s+(?:both|all)\s+(?:like|want)\s+(?:different|mixed).*?(\w+)\s+and\s+(\w+)/i,
  ];

  for (const pattern of groupPatterns) {
    const match = query.match(pattern);
    if (match) {
      result.intent = 'group_recommendation';
      result.groupPreferences = [];

      // Extract cuisines from the match groups
      const preference1 = match[1].toLowerCase();
      const preference2 = match[2].toLowerCase();

      // Find cuisine matches
      const findCuisine = (term: string): string | null => {
        for (const [cuisine, keywords] of Object.entries(CUISINE_KEYWORDS)) {
          if (keywords.some(k => k.includes(term) || term.includes(k))) {
            return cuisine;
          }
        }
        // Also check if the term itself is a cuisine name
        if (CUISINE_KEYWORDS[term]) return term;
        return null;
      };

      const cuisine1 = findCuisine(preference1);
      const cuisine2 = findCuisine(preference2);

      if (cuisine1) {
        result.groupPreferences.push({
          person: 'friend',
          cuisines: [cuisine1],
        });
      }
      if (cuisine2) {
        result.groupPreferences.push({
          person: 'me',
          cuisines: [cuisine2],
        });
      }

      // Default to restaurant category for group dining
      result.filters.category = 'restaurant';
      break;
    }
  }

  // Check for itinerary/day planning intent
  const itineraryPatterns = [
    /plan\s+(?:my|a|the)\s+(?:day|trip|itinerary)/i,
    /(?:day|full day|half day)\s+(?:in|at|around)/i,
    /what\s+(?:should|can)\s+(?:i|we)\s+do\s+(?:in|for)\s+a\s+day/i,
    /(?:perfect|ideal)\s+day\s+in/i,
    /how\s+(?:should|to)\s+spend\s+(?:a|my|the)\s+day/i,
  ];

  if (itineraryPatterns.some(p => p.test(lowerQuery)) && result.intent !== 'group_recommendation') {
    result.intent = 'itinerary';
    if (/half\s*day/i.test(lowerQuery)) {
      result.itineraryDuration = 'half_day';
    } else if (/multi|several|few\s*days?/i.test(lowerQuery)) {
      result.itineraryDuration = 'multi_day';
    } else {
      result.itineraryDuration = 'full_day';
    }
  }

  // Check for "more like X" pattern
  const moreLikePattern = /(?:more like|similar to|like)\s+(.+?)(?:\s+in\s+|\s*$)/i;
  const moreLikeMatch = query.match(moreLikePattern);
  if (moreLikeMatch && result.intent !== 'itinerary') {
    result.intent = 'more_like_this';
    result.referenceDestination = moreLikeMatch[1].trim();
  }

  // Extract city from query
  for (const [city, variations] of Object.entries(CITY_VARIATIONS)) {
    for (const variation of variations) {
      const cityPattern = new RegExp(`\\b${variation}\\b`, 'i');
      if (cityPattern.test(lowerQuery)) {
        result.filters.city = city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        break;
      }
    }
    if (result.filters.city) break;
  }

  // Check conversation history for city context
  if (!result.filters.city && conversationHistory.length > 0) {
    for (const msg of [...conversationHistory].reverse()) {
      for (const [city, variations] of Object.entries(CITY_VARIATIONS)) {
        for (const variation of variations) {
          if (msg.content.toLowerCase().includes(variation)) {
            result.filters.city = city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            break;
          }
        }
        if (result.filters.city) break;
      }
      if (result.filters.city) break;
    }
  }

  // Extract category
  for (const [category, variations] of Object.entries(CATEGORY_VARIATIONS)) {
    for (const variation of variations) {
      const catPattern = new RegExp(`\\b${variation}\\b`, 'i');
      if (catPattern.test(lowerQuery)) {
        result.filters.category = category;
        break;
      }
    }
    if (result.filters.category) break;
  }

  // Extract vibes
  for (const [vibe, keywords] of Object.entries(VIBE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword)) {
        result.vibes.push(vibe);
        break;
      }
    }
  }

  // Extract occasion
  for (const [occasion, keywords] of Object.entries(OCCASION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword)) {
        result.occasion = occasion;
        result.filters.occasion = occasion;
        break;
      }
    }
    if (result.occasion) break;
  }

  // Extract price context
  if (/\b(cheap|budget|affordable|inexpensive|value)\b/i.test(lowerQuery)) {
    result.priceContext = 'budget';
    result.filters.priceMax = 2;
  } else if (/\b(mid-range|moderate|reasonable)\b/i.test(lowerQuery)) {
    result.priceContext = 'mid_range';
    result.filters.priceMin = 2;
    result.filters.priceMax = 3;
  } else if (/\b(expensive|splurge|fancy|luxury|high-end|upscale|fine dining)\b/i.test(lowerQuery)) {
    result.priceContext = 'splurge';
    result.filters.priceMin = 3;
  }

  // Extract time context
  if (/\b(breakfast|morning)\b/i.test(lowerQuery)) {
    result.timeContext = 'breakfast';
  } else if (/\b(lunch|midday)\b/i.test(lowerQuery)) {
    result.timeContext = 'lunch';
  } else if (/\b(dinner|evening)\b/i.test(lowerQuery)) {
    result.timeContext = 'dinner';
  } else if (/\b(late night|after hours|night)\b/i.test(lowerQuery)) {
    result.timeContext = 'late_night';
  }

  // Extract social context
  if (/\b(solo|alone|by myself)\b/i.test(lowerQuery)) {
    result.socialContext = 'solo';
  } else if (/\b(date|romantic|anniversary|couples?)\b/i.test(lowerQuery)) {
    result.socialContext = 'date';
  } else if (/\b(group|friends|party)\b/i.test(lowerQuery)) {
    result.socialContext = 'group';
  } else if (/\b(business|client|meeting|corporate)\b/i.test(lowerQuery)) {
    result.socialContext = 'business';
  } else if (/\b(family|kids|children)\b/i.test(lowerQuery)) {
    result.socialContext = 'family';
  }

  // Check for Michelin
  if (/\b(michelin|starred|stars?)\b/i.test(lowerQuery)) {
    result.filters.michelin = true;
  }

  // Check for "open now"
  if (/\b(open now|open right now|currently open)\b/i.test(lowerQuery)) {
    result.filters.openNow = true;
  }

  // Determine intent (if not already set)
  if (result.intent === 'search') {
    if (/\b(recommend|suggestion|what should|where should)\b/i.test(lowerQuery)) {
      result.intent = 'recommendation';
    } else if (/\b(discover|explore|surprise|hidden|secret)\b/i.test(lowerQuery)) {
      result.intent = 'discovery';
    } else if (/\b(compare|vs|versus|better|difference)\b/i.test(lowerQuery)) {
      result.intent = 'comparison';
    }
  }

  return result;
}

/**
 * Build a rich search text for embedding
 */
function buildSemanticSearchText(intent: ParsedIntent): string {
  const parts: string[] = [intent.searchQuery];

  if (intent.vibes.length > 0) {
    parts.push(`vibe: ${intent.vibes.join(', ')}`);
  }

  if (intent.occasion) {
    parts.push(`occasion: ${intent.occasion}`);
  }

  if (intent.socialContext) {
    parts.push(`for: ${intent.socialContext}`);
  }

  if (intent.priceContext) {
    parts.push(`price: ${intent.priceContext}`);
  }

  return parts.join(' | ');
}

/**
 * Generate LLM-powered conversational response
 */
async function generateLLMResponse(
  intent: ParsedIntent,
  results: any[],
  query: string,
  conversationHistory: ConversationMessage[],
  tasteProfile: any | null
): Promise<string> {
  const count = results.length;
  const city = intent.filters.city;
  const category = intent.filters.category;

  // Build context for LLM
  const topResults = results.slice(0, 5).map(r => ({
    name: r.name,
    category: r.category,
    city: r.city,
    michelin: r.michelin_stars || 0,
    rating: r.rating,
    vibes: r.vibe_tags?.slice(0, 3) || [],
    price: r.price_level,
  }));

  const userPreferences = tasteProfile ? {
    favoriteCategories: tasteProfile.preferences?.categories?.slice(0, 3).map((c: any) => c.category) || [],
    favoriteCities: tasteProfile.preferences?.cities?.slice(0, 3).map((c: any) => c.city) || [],
    pricePreference: tasteProfile.preferences?.priceRange || null,
  } : null;

  const prompt = `You are a knowledgeable travel concierge for Urban Manual, a curated travel guide.
Generate a brief, helpful response (2-3 sentences max) for this search.

User query: "${query}"
Intent: ${intent.intent}
City: ${city || 'not specified'}
Category: ${category || 'not specified'}
Vibes: ${intent.vibes.join(', ') || 'none'}
Occasion: ${intent.occasion || 'not specified'}
Results found: ${count}
${userPreferences ? `User preferences: Likes ${userPreferences.favoriteCategories.join(', ')} in ${userPreferences.favoriteCities.join(', ')}` : ''}

Top results:
${topResults.map((r, i) => `${i + 1}. ${r.name} (${r.category} in ${r.city}${r.michelin ? `, ${r.michelin}⭐` : ''})`).join('\n')}

Guidelines:
- Be concise and warm, not robotic
- If there are Michelin stars, mention them naturally
- Reference the specific vibe/occasion if mentioned
- Don't list all results, just give a helpful intro
- If no results, suggest alternatives`;

  try {
    const llmResponse = await generateText(prompt, { maxTokens: 150, temperature: 0.7 });
    if (llmResponse) {
      return llmResponse;
    }
  } catch (error) {
    console.error('LLM response generation failed:', error);
  }

  // Fallback to rule-based response
  return generateFallbackResponse(intent, results, query);
}

/**
 * Fallback response generator (non-LLM)
 */
function generateFallbackResponse(
  intent: ParsedIntent,
  results: any[],
  query: string
): string {
  const count = results.length;
  const city = intent.filters.city;
  const category = intent.filters.category;

  if (count === 0) {
    if (city && category) {
      return `I couldn't find any ${category}s in ${city} matching your criteria. Try broadening your search.`;
    } else if (city) {
      return `I couldn't find places in ${city} matching your search. Try a different query.`;
    }
    return `No results found. Try searching for a specific city or category.`;
  }

  const vibeText = intent.vibes.length > 0 ? intent.vibes.join(' and ') + ' ' : '';
  const occasionText = intent.occasion ? `for ${intent.occasion} ` : '';

  if (intent.intent === 'itinerary') {
    return `Here's a curated day plan for ${city || 'your trip'}. I've selected the best spots for each part of your day.`;
  } else if (intent.intent === 'more_like_this') {
    return `Found ${count} similar ${category || 'place'}${count > 1 ? 's' : ''} ${city ? `in ${city}` : ''}.`;
  } else if (intent.intent === 'discovery') {
    return `Discovered ${count} ${vibeText}${category || 'place'}${count > 1 ? 's' : ''} ${city ? `in ${city}` : ''}. These are some hidden gems worth exploring.`;
  } else if (intent.intent === 'recommendation') {
    return `Here are ${count} recommended ${vibeText}${category || 'place'}${count > 1 ? 's' : ''} ${occasionText}${city ? `in ${city}` : ''}.`;
  }

  if (city && category) {
    let response = `Found ${count} ${vibeText}${category}${count > 1 ? 's' : ''} in ${city}${occasionText ? ` ${occasionText}` : ''}.`;
    const michelinCount = results.filter(r => r.michelin_stars > 0).length;
    if (michelinCount > 0) {
      response += ` Including ${michelinCount} Michelin-starred.`;
    }
    return response;
  } else if (city) {
    return `Found ${count} ${vibeText}place${count > 1 ? 's' : ''} in ${city}.`;
  } else if (category) {
    return `Found ${count} ${vibeText}${category}${count > 1 ? 's' : ''}.`;
  }

  return `Found ${count} result${count > 1 ? 's' : ''} for "${query}".`;
}

/**
 * Generate itinerary for a day
 */
async function generateItinerary(
  city: string,
  duration: 'half_day' | 'full_day' | 'multi_day',
  vibes: string[],
  occasion: string | undefined,
  supabase: any
): Promise<{ itinerary: ItinerarySlot[]; destinations: any[] }> {
  const slots: ItinerarySlot[] = [];
  const allDestinations: any[] = [];

  // Define time slots based on duration
  const timeSlots: Array<{ slot: ItinerarySlot['timeSlot']; label: string; category: string }> = duration === 'half_day'
    ? [
        { slot: 'morning', label: '☕ Morning', category: 'cafe' },
        { slot: 'lunch', label: '🍽️ Lunch', category: 'restaurant' },
        { slot: 'afternoon', label: '🛍️ Afternoon', category: 'shop' },
      ]
    : [
        { slot: 'morning', label: '☕ Morning Coffee', category: 'cafe' },
        { slot: 'lunch', label: '🍽️ Lunch', category: 'restaurant' },
        { slot: 'afternoon', label: '🛍️ Afternoon Explore', category: 'shop' },
        { slot: 'dinner', label: '🍷 Dinner', category: 'restaurant' },
        { slot: 'evening', label: '🍸 Evening Drinks', category: 'bar' },
      ];

  // Fetch destinations for each slot
  for (const timeSlot of timeSlots) {
    // Handle both "New York" and "new-york" formats
    const cityWithSpace = sanitizeForIlike(city);
    const cityWithHyphen = sanitizeForIlike(city.replace(/\s+/g, '-'));

    let query = supabase
      .from('destinations')
      .select('*')
      .or(`city.ilike.%${cityWithSpace}%,city.ilike.%${cityWithHyphen}%`)
      .ilike('category', `%${timeSlot.category}%`);

    // Apply vibe filtering if specified
    if (vibes.length > 0) {
      // Boost for matching vibes but don't require
    }

    // For dinner on special occasions, prefer Michelin or highly rated
    if (timeSlot.slot === 'dinner' && occasion) {
      query = query.or('michelin_stars.gt.0,rating.gte.4.5');
    }

    query = query.limit(10);

    const { data: destinations } = await query;

    if (destinations && destinations.length > 0) {
      // Pick a random one from top results for variety
      const selected = destinations[Math.floor(Math.random() * Math.min(3, destinations.length))];

      slots.push({
        timeSlot: timeSlot.slot,
        label: timeSlot.label,
        category: timeSlot.category,
        destination: selected,
      });

      allDestinations.push(selected);
    }
  }

  return { itinerary: slots, destinations: allDestinations };
}

/**
 * ActionPatch type for structured follow-up suggestions
 */
interface ActionPatch {
  label: string;
  patch: {
    filters?: {
      city?: string | null;
      category?: string | null;
      neighborhood?: string | null;
      priceMin?: number | null;
      priceMax?: number | null;
      michelin?: boolean;
      occasion?: string | null;
      vibes?: string[];
      openNow?: boolean;
      cuisine?: string | null;
      ratingMin?: number | null;
      timeContext?: 'breakfast' | 'lunch' | 'dinner' | 'late_night' | null;
    };
    query?: {
      set?: string;
      append?: string;
      clear?: boolean;
    };
    intent?: {
      mode?: 'search' | 'recommendation' | 'discovery' | 'comparison' | 'more_like_this' | 'itinerary' | 'clarification';
      referenceSlug?: string;
      itineraryDuration?: 'half_day' | 'full_day' | 'multi_day';
      socialContext?: 'solo' | 'date' | 'group' | 'business' | 'family';
    };
    clearFilters?: boolean;
    reset?: boolean;
  };
  reason: {
    type: 'refine' | 'expand' | 'related' | 'personalized' | 'popular' | 'contextual' | 'clarification' | 'alternative';
    text?: string;
  };
  icon?: 'location' | 'time' | 'price' | 'rating' | 'category' | 'cuisine' | 'vibe' | 'trip' | 'search' | 'filter' | 'michelin' | 'default';
  priority?: number;
}

/**
 * Generate intelligent follow-up suggestions as ActionPatch objects
 */
function generateFollowUps(
  intent: ParsedIntent,
  results: any[],
  conversationHistory: ConversationMessage[],
  tasteProfile: any | null
): ActionPatch[] {
  const suggestions: ActionPatch[] = [];
  const city = intent.filters.city;
  const category = intent.filters.category;

  // Itinerary-specific follow-ups
  if (intent.intent === 'itinerary') {
    if (city) {
      suggestions.push({
        label: `More restaurants in ${city}`,
        patch: { filters: { city, category: 'restaurant' } },
        reason: { type: 'expand', text: 'Find more restaurants' },
        icon: 'category',
        priority: 8,
      });
      suggestions.push({
        label: `Hidden gems in ${city}`,
        patch: { filters: { city, vibes: ['hidden_gem'] } },
        reason: { type: 'expand', text: 'Discover local favorites' },
        icon: 'vibe',
        priority: 7,
      });
      suggestions.push({
        label: `Bars in ${city}`,
        patch: { filters: { city, category: 'bar' } },
        reason: { type: 'expand', text: 'Find nightlife' },
        icon: 'category',
        priority: 6,
      });
    }
    return suggestions.slice(0, 4);
  }

  // Based on current results
  if (results.length > 0) {
    const topResult = results[0];

    // Suggest similar
    if (topResult.name && topResult.slug) {
      suggestions.push({
        label: `More like ${topResult.name}`,
        patch: { intent: { mode: 'more_like_this', referenceSlug: topResult.slug } },
        reason: { type: 'related', text: `Find places similar to ${topResult.name}` },
        icon: 'search',
        priority: 9,
      });
    }

    // Suggest different category in same city
    if (city) {
      if (category === 'restaurant') {
        suggestions.push({
          label: `Best bars in ${city}`,
          patch: { filters: { city, category: 'bar' } },
          reason: { type: 'expand', text: 'Explore nightlife' },
          icon: 'category',
          priority: 7,
        });
        suggestions.push({
          label: `Coffee in ${city}`,
          patch: { filters: { city, category: 'cafe' } },
          reason: { type: 'expand', text: 'Find coffee spots' },
          icon: 'category',
          priority: 6,
        });
      } else if (category === 'bar') {
        suggestions.push({
          label: `Late night eats in ${city}`,
          patch: { filters: { city, category: 'restaurant', timeContext: 'late_night' } },
          reason: { type: 'expand', text: 'Find late-night dining' },
          icon: 'time',
          priority: 7,
        });
        suggestions.push({
          label: `Restaurants in ${city}`,
          patch: { filters: { city, category: 'restaurant' } },
          reason: { type: 'expand', text: 'Find restaurants' },
          icon: 'category',
          priority: 6,
        });
      } else if (category === 'cafe') {
        suggestions.push({
          label: `Brunch spots in ${city}`,
          patch: { filters: { city, category: 'restaurant', timeContext: 'breakfast' } },
          reason: { type: 'expand', text: 'Find brunch options' },
          icon: 'time',
          priority: 7,
        });
      } else if (category === 'hotel') {
        suggestions.push({
          label: `Restaurants near ${topResult.name || city}`,
          patch: { filters: { city, category: 'restaurant' } },
          reason: { type: 'expand', text: 'Find nearby dining' },
          icon: 'location',
          priority: 7,
        });
      } else {
        suggestions.push({
          label: `Restaurants in ${city}`,
          patch: { filters: { city, category: 'restaurant' } },
          reason: { type: 'expand', text: 'Find restaurants' },
          icon: 'category',
          priority: 7,
        });
        suggestions.push({
          label: `Cafes in ${city}`,
          patch: { filters: { city, category: 'cafe' } },
          reason: { type: 'expand', text: 'Find coffee spots' },
          icon: 'category',
          priority: 6,
        });
      }

      // Suggest itinerary
      suggestions.push({
        label: `Plan my day in ${city}`,
        patch: { filters: { city }, intent: { mode: 'itinerary', itineraryDuration: 'full_day' } },
        reason: { type: 'expand', text: 'Create a day itinerary' },
        icon: 'trip',
        priority: 5,
      });
    }

    // Suggest vibe-based refinement
    if (intent.vibes.length === 0 && category === 'restaurant') {
      suggestions.push({
        label: 'Show me romantic spots',
        patch: { filters: { vibes: ['romantic'] } },
        reason: { type: 'refine', text: 'Filter by atmosphere' },
        icon: 'vibe',
        priority: 6,
      });
      suggestions.push({
        label: 'Hidden gems only',
        patch: { filters: { vibes: ['hidden_gem'] } },
        reason: { type: 'refine', text: 'Discover local favorites' },
        icon: 'vibe',
        priority: 6,
      });
    }

    // Suggest Michelin if not already filtered
    if (!intent.filters.michelin && results.some(r => r.michelin_stars > 0)) {
      suggestions.push({
        label: 'Only Michelin starred',
        patch: { filters: { michelin: true } },
        reason: { type: 'refine', text: 'Filter to Michelin restaurants' },
        icon: 'michelin',
        priority: 8,
      });
    }

    // Personalized suggestions based on taste profile
    if (tasteProfile?.preferences?.categories) {
      const favCategories = tasteProfile.preferences.categories
        .filter((c: any) => c.category !== category)
        .slice(0, 1);

      if (favCategories.length > 0 && city) {
        const favCat = favCategories[0].category;
        suggestions.push({
          label: `${favCat}s in ${city}`,
          patch: { filters: { city, category: favCat } },
          reason: { type: 'personalized', text: 'Based on your preferences' },
          icon: 'category',
          priority: 5,
        });
      }
    }

    // Suggest price refinement
    if (!intent.priceContext) {
      if (results.some(r => r.price_level >= 3)) {
        suggestions.push({
          label: 'More affordable options',
          patch: { filters: { priceMax: 2 } },
          reason: { type: 'refine', text: 'Filter by price' },
          icon: 'price',
          priority: 6,
        });
      }
    }
  } else {
    // No results - suggest broader searches
    if (city) {
      suggestions.push({
        label: `All restaurants in ${city}`,
        patch: { filters: { city, category: 'restaurant' }, clearFilters: false },
        reason: { type: 'expand', text: 'Browse all options' },
        icon: 'category',
        priority: 7,
      });
      suggestions.push({
        label: `Best of ${city}`,
        patch: { filters: { city, ratingMin: 4.5 } },
        reason: { type: 'expand', text: 'Show top-rated places' },
        icon: 'rating',
        priority: 6,
      });
    } else {
      suggestions.push({
        label: 'Restaurants in Tokyo',
        patch: { filters: { city: 'Tokyo', category: 'restaurant' } },
        reason: { type: 'popular', text: 'Popular destination' },
        icon: 'location',
        priority: 7,
      });
      suggestions.push({
        label: 'Hotels in Paris',
        patch: { filters: { city: 'Paris', category: 'hotel' } },
        reason: { type: 'popular', text: 'Popular destination' },
        icon: 'location',
        priority: 6,
      });
      suggestions.push({
        label: 'Plan my day in Tokyo',
        patch: { filters: { city: 'Tokyo' }, intent: { mode: 'itinerary', itineraryDuration: 'full_day' } },
        reason: { type: 'popular', text: 'Start planning' },
        icon: 'trip',
        priority: 5,
      });
    }
  }

  // Add variety based on history
  if (conversationHistory.length > 2) {
    suggestions.push({
      label: 'Show me something different',
      patch: { intent: { mode: 'discovery' } },
      reason: { type: 'expand', text: 'Explore different options' },
      icon: 'search',
      priority: 4,
    });
  }

  // Sort by priority and return top 4
  return suggestions
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .slice(0, 4);
}

/**
 * Update user taste profile based on search
 */
async function updateTasteProfile(
  userId: string,
  intent: ParsedIntent,
  results: any[],
  supabase: any
): Promise<void> {
  try {
    // Log the search interaction for taste learning
    await supabase.from('user_interactions').insert({
      interaction_type: 'search',
      user_id: userId,
      destination_id: null,
      metadata: {
        query: intent.searchQuery,
        intent: intent.intent,
        city: intent.filters.city,
        category: intent.filters.category,
        vibes: intent.vibes,
        occasion: intent.occasion,
        priceContext: intent.priceContext,
        resultsCount: results.length,
        topResultIds: results.slice(0, 5).map(r => r.id),
        source: 'travel-intelligence',
      },
    });

    // If user clicked on specific vibes or occasions, record preference
    if (intent.vibes.length > 0 || intent.occasion) {
      const { data: existingPrefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      const currentVibes = existingPrefs?.preferred_vibes || [];
      const currentOccasions = existingPrefs?.preferred_occasions || [];

      const updatedVibes = [...new Set([...currentVibes, ...intent.vibes])];
      const updatedOccasions = intent.occasion
        ? [...new Set([...currentOccasions, intent.occasion])]
        : currentOccasions;

      await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          preferred_vibes: updatedVibes,
          preferred_occasions: updatedOccasions,
          updated_at: new Date().toISOString(),
        });
    }
  } catch (error) {
    // Best effort - don't fail the request
    console.error('Error updating taste profile:', error);
  }
}

/**
 * Build deterministic UI elements (chips, refinements, questions)
 * No LLM calls - pure logic based on intent, results, and context
 */
function buildDeterministicUI(
  intent: ParsedIntent,
  finalResults: any[],
  conversationHistory: ConversationMessage[]
): DeterministicUI {
  const contextChips: ContextChip[] = [];
  const refinements: RefinementChip[] = [];
  let question: QuestionCard | undefined;
  const whyBySlug: Record<string, string[]> = {};

  const city = intent.filters.city;
  const category = intent.filters.category;

  // === Build Context Chips (what the system assumed) ===
  if (city) {
    contextChips.push({
      key: 'city',
      label: city,
      removable: true,
      patch: { city: null },
    });
  }

  if (category) {
    contextChips.push({
      key: 'category',
      label: category.charAt(0).toUpperCase() + category.slice(1),
      removable: true,
      patch: { category: null },
    });
  }

  if (intent.filters.michelin) {
    contextChips.push({
      key: 'michelin',
      label: 'Michelin starred',
      removable: true,
      patch: { michelin: false },
    });
  }

  if (intent.filters.priceMin || intent.filters.priceMax) {
    const priceLabel = intent.priceContext === 'budget' ? 'Budget-friendly'
      : intent.priceContext === 'splurge' ? 'High-end'
      : intent.priceContext === 'mid_range' ? 'Mid-range'
      : 'Price filtered';
    contextChips.push({
      key: 'price',
      label: priceLabel,
      removable: true,
      patch: { priceMin: null, priceMax: null },
    });
  }

  // Add vibe chips to context
  for (const vibe of intent.vibes) {
    contextChips.push({
      key: `vibe-${vibe}`,
      label: vibe.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      removable: true,
      patch: { vibe: intent.vibes.filter(v => v !== vibe) },
    });
  }

  if (intent.filters.neighborhood) {
    contextChips.push({
      key: 'neighborhood',
      label: intent.filters.neighborhood,
      removable: true,
      patch: { neighborhood: null },
    });
  }

  // === Build Question Card (when ambiguous) ===
  // Missing city but has category
  if (!city && category) {
    // Show popular cities from diverse regions
    const topCities = ['taipei', 'tokyo', 'new york', 'london', 'paris', 'singapore'];
    question = {
      prompt: 'Which city?',
      options: topCities.map(c => ({
        label: c.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        patch: { city: c.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') },
      })),
    };
  }

  // Has city but missing category
  if (city && !category && finalResults.length > 0) {
    const categories = ['restaurant', 'hotel', 'cafe', 'bar', 'shop'];
    question = {
      prompt: `What are you looking for in ${city}?`,
      options: categories.map(cat => ({
        label: cat.charAt(0).toUpperCase() + cat.slice(1) + 's',
        patch: { category: cat },
      })),
    };
  }

  // === Build Refinement Chips ===
  // Price refinements
  if (!intent.filters.priceMax || intent.filters.priceMax > 2) {
    refinements.push({
      label: 'More budget',
      patch: { priceMax: 2, priceMin: null },
      kind: 'price',
    });
  }

  if (!intent.filters.priceMin || intent.filters.priceMin < 3) {
    refinements.push({
      label: 'More premium',
      patch: { priceMin: 3, priceMax: null },
      kind: 'price',
    });
  }

  // Michelin refinement (only for dining-related categories)
  const diningCategories = ['restaurant', 'dining', 'food'];
  const isDining = category && diningCategories.some(dc => category.toLowerCase().includes(dc));
  if (isDining && !intent.filters.michelin && finalResults.some(r => r.michelin_stars > 0)) {
    refinements.push({
      label: 'Michelin only',
      patch: { michelin: true },
      kind: 'misc',
    });
  }

  // Extract top neighborhoods from results
  const neighborhoodCounts = new Map<string, number>();
  for (const dest of finalResults) {
    const hood = dest.neighborhood;
    if (hood && typeof hood === 'string') {
      neighborhoodCounts.set(hood, (neighborhoodCounts.get(hood) || 0) + 1);
    }
  }
  const topNeighborhoods = [...neighborhoodCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  for (const hood of topNeighborhoods) {
    if (hood !== intent.filters.neighborhood) {
      refinements.push({
        label: hood,
        patch: { neighborhood: hood },
        kind: 'neighborhood',
      });
    }
  }

  // Add vibe refinement chips (2-4 vibes not already applied)
  const availableVibes = Object.keys(VIBE_KEYWORDS).filter(
    vibe => !intent.vibes.includes(vibe)
  );
  const vibeRefinements = availableVibes.slice(0, 4);
  for (const vibe of vibeRefinements) {
    refinements.push({
      label: vibe.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      patch: { vibe: [...intent.vibes, vibe] },
      kind: 'vibe',
    });
  }

  // === Build "Why" chips per destination ===
  for (const dest of finalResults.slice(0, 20)) {
    const reasons: string[] = [];

    // Michelin star reason
    if (dest.michelin_stars > 0) {
      reasons.push(`${dest.michelin_stars} Michelin star${dest.michelin_stars > 1 ? 's' : ''}`);
    }

    // High rating reason
    if (dest.rating && dest.rating >= 4.5) {
      reasons.push(`Highly rated (${dest.rating})`);
    }

    // Vibe match reasons
    if (intent.vibes.length > 0 && dest.vibe_tags) {
      const matchedVibes = intent.vibes.filter(v =>
        dest.vibe_tags.some((dv: string) => dv.toLowerCase().includes(v))
      );
      if (matchedVibes.length > 0) {
        reasons.push(`${matchedVibes[0].replace(/_/g, ' ')} vibe`);
      }
    }

    // Rank explanation reason (if available)
    if (dest.rankExplanation && reasons.length < 2) {
      // Take first sentence or short phrase
      const explanation = dest.rankExplanation.split('.')[0];
      if (explanation && explanation.length < 40) {
        reasons.push(explanation);
      }
    }

    // Neighborhood match
    if (dest.neighborhood && intent.filters.neighborhood === dest.neighborhood) {
      reasons.push(`In ${dest.neighborhood}`);
    }

    if (reasons.length > 0 && dest.slug) {
      whyBySlug[dest.slug] = reasons.slice(0, 2);
    }
  }

  return {
    contextChips,
    refinements: refinements.slice(0, 8), // Limit to 8 refinements
    question,
    whyBySlug: Object.keys(whyBySlug).length > 0 ? whyBySlug : undefined,
  };
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Rate limiting
  const identifier = getIdentifier(request);
  const limiter = isUpstashConfigured() ? searchRatelimit : memorySearchRatelimit;
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    return createRateLimitResponse('Rate limit exceeded. Please try again later.', limit, remaining, reset);
  }

  const body: TravelIntelligenceRequest = await request.json();
  const { query, conversationHistory = [], filters: explicitFilters = {}, limit: resultLimit = 20 } = body;

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  try {
    // 1. Parse query intent
    const intent = parseQueryIntent(query, conversationHistory);

    // Merge explicit filters (expanded to support all patchable fields)
    if (explicitFilters.city !== undefined) {
      intent.filters.city = explicitFilters.city;
    }
    if (explicitFilters.category !== undefined) {
      intent.filters.category = explicitFilters.category;
    }
    if (explicitFilters.michelin !== undefined) {
      intent.filters.michelin = explicitFilters.michelin;
    }
    if (explicitFilters.priceMin !== undefined) {
      intent.filters.priceMin = explicitFilters.priceMin;
    }
    if (explicitFilters.priceMax !== undefined) {
      intent.filters.priceMax = explicitFilters.priceMax;
    }
    if (explicitFilters.neighborhood !== undefined) {
      intent.filters.neighborhood = explicitFilters.neighborhood;
    }
    if (explicitFilters.vibe !== undefined) {
      intent.vibes = explicitFilters.vibe || [];
      intent.filters.vibe = explicitFilters.vibe;
    }
    if (explicitFilters.openNow !== undefined) {
      intent.filters.openNow = explicitFilters.openNow;
    }
    if (explicitFilters.occasion !== undefined) {
      intent.filters.occasion = explicitFilters.occasion;
      intent.occasion = explicitFilters.occasion || undefined;
    }

    // 2. Check if clarification is needed
    const clarification = checkNeedsClarification(query, intent, conversationHistory);
    if (clarification.needsClarification) {
      // Popular cities to show in clarification (diverse selection)
      const popularCities = ['taipei', 'tokyo', 'new york', 'london', 'paris', 'singapore', 'hong kong', 'bangkok'];

      // Generate city suggestion patches for clarification
      const cityPatches: ActionPatch[] = popularCities.slice(0, 4).map(city => {
        const capitalizedCity = city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        return {
          label: capitalizedCity,
          patch: {
            filters: { city: capitalizedCity },
          },
          reason: {
            type: 'clarification' as const,
            text: 'Select a city',
          },
          icon: 'location' as const,
        };
      });

      // Build deterministic UI for clarification
      const clarificationUI: DeterministicUI = {
        contextChips: [],
        refinements: [],
        question: clarification.clarificationType === 'city'
          ? {
              prompt: 'Which city?',
              options: popularCities.slice(0, 8).map(c => ({
                label: c.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                patch: { city: c.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') },
              })),
            }
          : {
              prompt: 'What are you looking for?',
              options: ['restaurant', 'hotel', 'cafe', 'bar', 'shop'].map(cat => ({
                label: cat.charAt(0).toUpperCase() + cat.slice(1) + 's',
                patch: { category: cat },
              })),
            },
      };

      return NextResponse.json({
        response: clarification.clarificationQuestion,
        destinations: [],
        filters: intent.filters,
        followUps: cityPatches,
        intent: 'clarification',
        needsClarification: true,
        clarificationType: clarification.clarificationType,
        ui: clarificationUI,
        meta: { query },
      });
    }

    // 3. Get user taste profile for personalization
    let tasteProfile = null;
    if (userId) {
      try {
        tasteProfile = await tasteProfileEvolutionService.getTasteProfile(userId);
      } catch (error) {
        console.error('Error fetching taste profile:', error);
      }
    }

    // 3.5 Build unified intelligence context
    const sessionId = request.headers.get('x-session-id') || `session-${Date.now()}`;
    let unifiedContext: UnifiedContext | null = null;
    let intelligenceActions: AutonomousAction[] = [];
    let contextualHints: string[] = [];

    try {
      const intelligence = await unifiedIntelligenceCore.processIntelligentQuery(
        query,
        userId || null,
        sessionId,
        {
          includeReasoning: true,
          currentCity: intent.filters.city || undefined,
        }
      );

      unifiedContext = intelligence.context;
      intelligenceActions = intelligence.suggestedActions;
      contextualHints = intelligence.contextualHints;

      // Apply trip-aware context if user is planning a trip
      if (unifiedContext?.activeTrip && !intent.filters.city) {
        // Auto-set city from active trip if not specified
        const tripDestinations = unifiedContext.activeTrip.destinations;
        if (tripDestinations.length > 0) {
          intent.filters.city = tripDestinations[0];
        }
      }

      // Apply taste fingerprint to personalize
      if (unifiedContext?.tasteFingerprint && unifiedContext.tasteFingerprint.confidence > 0.3) {
        const fp = unifiedContext.tasteFingerprint;

        // Boost vibes based on fingerprint
        if (fp.adventurousness > 0.7 && !intent.vibes.includes('hidden_gem')) {
          intent.vibes.push('hidden_gem');
        }
        if (fp.designSensitivity > 0.7 && !intent.vibes.includes('design')) {
          intent.vibes.push('design');
        }
      }
    } catch (error) {
      console.error('Error building unified context:', error);
    }

    // 4. Handle itinerary mode
    if (intent.intent === 'itinerary' && intent.filters.city) {
      const { itinerary, destinations } = await generateItinerary(
        intent.filters.city,
        intent.itineraryDuration || 'full_day',
        intent.vibes,
        intent.occasion,
        supabase
      );

      const response = await generateLLMResponse(
        intent,
        destinations,
        query,
        conversationHistory,
        tasteProfile
      );

      const followUps = generateFollowUps(intent, destinations, conversationHistory, tasteProfile);

      // Build deterministic UI for itinerary
      const itineraryUI = buildDeterministicUI(intent, destinations, conversationHistory);

      // Update taste profile
      if (userId) {
        await updateTasteProfile(userId, intent, destinations, supabase);
      }

      return NextResponse.json({
        response,
        destinations,
        itinerary,
        filters: intent.filters,
        followUps,
        intent: intent.intent,
        vibes: intent.vibes,
        ui: itineraryUI,
        meta: {
          query,
          totalResults: destinations.length,
          isItinerary: true,
          duration: intent.itineraryDuration,
        },
      });
    }

    // 5. Handle group/collaborative recommendations
    if (intent.intent === 'group_recommendation' && intent.groupPreferences && intent.groupPreferences.length > 0) {
      // Get all unique cuisines from group preferences
      const allCuisines = intent.groupPreferences.flatMap(p => p.cuisines || []);

      // Build query for fusion/multi-cuisine restaurants or places that satisfy both
      let results: any[] = [];

      // Strategy 1: Find fusion restaurants that combine cuisines
      let dbQuery = supabase
        .from('destinations')
        .select('*')
        .ilike('category', '%restaurant%');

      if (intent.filters.city) {
        // Handle both "New York" and "new-york" formats
        const cityWithSpace = sanitizeForIlike(intent.filters.city);
        const cityWithHyphen = sanitizeForIlike(intent.filters.city.replace(/\s+/g, '-'));
        dbQuery = dbQuery.or(`city.ilike.%${cityWithSpace}%,city.ilike.%${cityWithHyphen}%`);
      }

      // Search for places mentioning multiple cuisines or fusion
      const cuisineSearchTerms = allCuisines.map(c => `%${c}%`).join('|');
      dbQuery = dbQuery.or(
        allCuisines.map(c => `description.ilike.%${c}%`).join(',') +
        `,tags.cs.{${allCuisines.join(',')}}` +
        `,micro_description.ilike.%fusion%`
      );

      const { data: multiCuisineResults } = await dbQuery.limit(30);
      if (multiCuisineResults) {
        // Score by how many cuisines they match
        results = multiCuisineResults.map(dest => {
          const desc = (dest.description || '').toLowerCase();
          const micro = (dest.micro_description || '').toLowerCase();
          const tags = (dest.tags || []).map((t: string) => t.toLowerCase());

          let matchScore = 0;
          for (const cuisine of allCuisines) {
            const cuisineKeywords = CUISINE_KEYWORDS[cuisine] || [cuisine];
            for (const keyword of cuisineKeywords) {
              if (desc.includes(keyword) || micro.includes(keyword) || tags.some((t: string) => t.includes(keyword))) {
                matchScore++;
                break;
              }
            }
          }

          return {
            ...dest,
            groupMatchScore: matchScore,
          };
        });

        // Sort by match score (places matching more cuisines first)
        results.sort((a, b) => b.groupMatchScore - a.groupMatchScore);
      }

      // Strategy 2: If not enough fusion results, get top from each cuisine
      if (results.length < 5) {
        for (const cuisine of allCuisines) {
          const cuisineKeywords = CUISINE_KEYWORDS[cuisine] || [cuisine];
          const { data: cuisineResults } = await supabase
            .from('destinations')
            .select('*')
            .ilike('category', '%restaurant%')
            .or(cuisineKeywords.slice(0, 3).map(k => `description.ilike.%${k}%`).join(','))
            .limit(5);

          if (cuisineResults) {
            for (const r of cuisineResults) {
              if (!results.find(existing => existing.id === r.id)) {
                results.push({
                  ...r,
                  cuisineType: cuisine,
                  groupMatchScore: 1,
                });
              }
            }
          }
        }
      }

      // Generate personalized response for group
      const cuisineList = allCuisines.join(' and ');
      const fusionCount = results.filter(r => r.groupMatchScore >= 2).length;

      let groupResponse = '';
      if (fusionCount > 0) {
        groupResponse = `Great news for your group! I found ${fusionCount} place${fusionCount > 1 ? 's' : ''} that blend ${cuisineList} cuisines. `;
        if (results.length > fusionCount) {
          groupResponse += `Plus ${results.length - fusionCount} more options for each preference.`;
        }
      } else {
        groupResponse = `I've curated ${results.length} options for your group with ${cuisineList} preferences. You could alternate between cuisines or find a spot with a diverse menu.`;
      }

      const finalResults = results.slice(0, 20);
      const cuisine1 = allCuisines[0] || 'fusion';
      const cuisine2 = allCuisines[1] || 'restaurant';
      const followUps: ActionPatch[] = [
        {
          label: `More ${cuisine1} options`,
          patch: { filters: { cuisine: cuisine1, city: intent.filters.city } },
          reason: { type: 'refine', text: `Find more ${cuisine1}` },
          icon: 'cuisine',
          priority: 8,
        },
        {
          label: `More ${cuisine2} options`,
          patch: { filters: { cuisine: cuisine2, city: intent.filters.city } },
          reason: { type: 'refine', text: `Find more ${cuisine2}` },
          icon: 'cuisine',
          priority: 7,
        },
        intent.filters.city ? {
          label: `Other cuisines in ${intent.filters.city}`,
          patch: { filters: { city: intent.filters.city, cuisine: null } },
          reason: { type: 'expand', text: 'Explore other cuisines' },
          icon: 'location',
          priority: 6,
        } : {
          label: 'Plan a food tour',
          patch: { intent: { mode: 'itinerary' } },
          reason: { type: 'expand', text: 'Create a food itinerary' },
          icon: 'trip',
          priority: 6,
        },
        {
          label: 'Find a fusion restaurant',
          patch: { filters: { vibes: ['fusion'] } },
          reason: { type: 'related', text: 'Find places that blend cuisines' },
          icon: 'cuisine',
          priority: 5,
        },
      ];

      // Build deterministic UI for group recommendations
      const groupUI = buildDeterministicUI(intent, finalResults, conversationHistory);

      return NextResponse.json({
        response: groupResponse,
        destinations: finalResults,
        filters: intent.filters,
        followUps,
        intent: intent.intent,
        groupPreferences: intent.groupPreferences,
        ui: groupUI,
        meta: {
          query,
          totalResults: finalResults.length,
          isGroupRecommendation: true,
          cuisines: allCuisines,
        },
      });
    }

    // 6. Handle "more like this" queries
    if (intent.intent === 'more_like_this' && intent.referenceDestination) {
      const safeRef = sanitizeForIlike(intent.referenceDestination);
      const { data: refDest } = await supabase
        .from('destinations')
        .select('id, slug, name, city, category, tags, vibe_tags')
        .or(`name.ilike.%${safeRef}%,slug.ilike.%${safeRef}%`)
        .limit(1)
        .single();

      if (refDest) {
        const similar = await knowledgeGraphService.findSimilar(String(refDest.id), 10);

        if (similar.length > 0) {
          const similarIds = similar.map(s => s.destination_id);
          const { data: similarDests } = await supabase
            .from('destinations')
            .select('*')
            .in('id', similarIds);

          if (similarDests && similarDests.length > 0) {
            const response = await generateLLMResponse(
              intent,
              similarDests,
              query,
              conversationHistory,
              tasteProfile
            );
            const followUps = generateFollowUps(intent, similarDests, conversationHistory, tasteProfile);

            // Build deterministic UI for similar results
            const similarUI = buildDeterministicUI(intent, similarDests, conversationHistory);

            if (userId) {
              await updateTasteProfile(userId, intent, similarDests, supabase);
            }

            return NextResponse.json({
              response,
              destinations: similarDests,
              filters: intent.filters,
              followUps,
              intent: intent.intent,
              ui: similarUI,
              meta: { similarTo: refDest.name },
            });
          }
        }

        // Fallback
        intent.filters.city = refDest.city;
        intent.filters.category = refDest.category;
        if (refDest.vibe_tags && refDest.vibe_tags.length > 0) {
          intent.vibes = refDest.vibe_tags;
        }
      }
    }

    // 6. Generate embedding for semantic search
    const searchText = buildSemanticSearchText(intent);
    let embedding: number[] | null = null;

    try {
      const embeddingResult = await generateTextEmbedding(searchText);
      embedding = embeddingResult.embedding;
    } catch (embeddingError) {
      console.error('Embedding generation failed:', embeddingError);
    }

    // 7. Search destinations
    let results: any[] = [];

    // Try database search first (more reliable) and vector search in parallel
    const [dbResults, vectorResults] = await Promise.all([
      // Database search (primary)
      (async () => {
        try {
          let dbQuery = supabase.from('destinations').select('*');

          // Apply filters - use ilike for case-insensitive matching
          if (intent.filters.city) {
            // Handle both "New York" and "new-york" formats
            const cityWithSpace = sanitizeForIlike(intent.filters.city);
            const cityWithHyphen = sanitizeForIlike(intent.filters.city.replace(/\s+/g, '-'));

            // Try both patterns: "New York" OR "new-york"
            dbQuery = dbQuery.or(`city.ilike.%${cityWithSpace}%,city.ilike.%${cityWithHyphen}%`);
          }
          if (intent.filters.category) {
            dbQuery = dbQuery.ilike('category', `%${intent.filters.category}%`);
          }
          if (intent.filters.michelin) {
            dbQuery = dbQuery.gt('michelin_stars', 0);
          }
          if (intent.filters.priceMax) {
            dbQuery = dbQuery.lte('price_level', intent.filters.priceMax);
          }
          if (intent.filters.priceMin) {
            dbQuery = dbQuery.gte('price_level', intent.filters.priceMin);
          }
          if (intent.filters.neighborhood) {
            dbQuery = dbQuery.ilike('neighborhood', `%${intent.filters.neighborhood}%`);
          }

          dbQuery = dbQuery.limit(100);

          const { data, error } = await dbQuery;

          if (error) {
            console.error('[Travel Intelligence] Database error:', error);
            return [];
          }

          console.log('[Travel Intelligence] Database found', data?.length || 0, 'results for', intent.filters.city, intent.filters.category);
          return data || [];
        } catch (e) {
          console.error('[Travel Intelligence] Database query failed:', e);
          return [];
        }
      })(),

      // Vector search (secondary, for semantic ranking)
      (async () => {
        if (!embedding) return [];

        try {
          // Query without filters first to get semantic matches
          // Then filter in memory (more reliable than string matching in metadata)
          const vectorHits = await queryVectorIndex(embedding, {
            topK: 100,
            includeMetadata: true,
          });

          if (vectorHits && vectorHits.length > 0) {
            // Filter results by city/category in memory (case-insensitive)
            let filteredHits = vectorHits;

            if (intent.filters.city) {
              const cityLower = intent.filters.city.toLowerCase();
              const cityWithHyphen = cityLower.replace(/\s+/g, '-');
              filteredHits = filteredHits.filter(r => {
                const metaCity = r.metadata.city?.toLowerCase() || '';
                // Match either "new york" or "new-york" format
                return metaCity.includes(cityLower) || metaCity.includes(cityWithHyphen);
              });
            }

            if (intent.filters.category) {
              const catLower = intent.filters.category.toLowerCase();
              filteredHits = filteredHits.filter(r =>
                r.metadata.category?.toLowerCase().includes(catLower)
              );
            }

            console.log('[Travel Intelligence] Vector search found', filteredHits.length, 'filtered results');
            return filteredHits;
          }
          return [];
        } catch (vectorError) {
          console.error('[Travel Intelligence] Vector search failed:', vectorError);
          return [];
        }
      })(),
    ]);

    // Merge results: Use database results as base, boost with vector similarity
    if (dbResults.length > 0) {
      const vectorScoreMap = new Map(
        vectorResults.map(v => [v.metadata.destination_id, v.score])
      );

      results = dbResults.map(dest => ({
        ...dest,
        similarity: vectorScoreMap.get(dest.id) || 0,
      }));

      // Sort by similarity if we have vector results
      if (vectorResults.length > 0) {
        results.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
      }
    } else if (vectorResults.length > 0) {
      // Fallback to vector results only if DB returned nothing
      const ids = vectorResults.map(r => r.metadata.destination_id);
      const { data: fullDests } = await supabase
        .from('destinations')
        .select('*')
        .in('id', ids);

      if (fullDests) {
        results = fullDests.map(dest => {
          const vectorResult = vectorResults.find(r => r.metadata.destination_id === dest.id);
          return {
            ...dest,
            similarity: vectorResult?.score || 0,
          };
        });
      }
    }

    // 8. Apply vibe filtering and boost
    if (intent.vibes.length > 0 && results.length > 0) {
      results = results.map(dest => {
        const destVibes = dest.vibe_tags || [];
        const vibeMatch = intent.vibes.filter(v =>
          destVibes.some((dv: string) => dv.toLowerCase().includes(v))
        ).length;

        return {
          ...dest,
          vibeScore: vibeMatch / intent.vibes.length,
        };
      });

      results.sort((a, b) => (b.vibeScore || 0) - (a.vibeScore || 0));
    }

    // 9. Apply intelligent ranking
    let rankedResults = results;

    try {
      const ranked = await searchRankingAlgorithm.rankResults(
        results,
        query,
        userId,
        {
          city: intent.filters.city || undefined,
          category: intent.filters.category || undefined,
          modifiers: intent.vibes,
        }
      );

      rankedResults = ranked.map(r => ({
        ...r.destination,
        rankScore: r.score,
        rankExplanation: r.explanation,
      }));
    } catch (rankError) {
      console.error('Ranking failed:', rankError);
    }

    // 10. Limit results
    const finalResults = rankedResults.slice(0, resultLimit);

    // 11. Generate LLM-powered response
    const response = await generateLLMResponse(
      intent,
      finalResults,
      query,
      conversationHistory,
      tasteProfile
    );

    // 12. Generate follow-ups
    const followUps = generateFollowUps(intent, finalResults, conversationHistory, tasteProfile);

    // 13. Build deterministic UI (no LLM calls)
    const ui = buildDeterministicUI(intent, finalResults, conversationHistory);

    // 14. Update taste profile
    if (userId) {
      await updateTasteProfile(userId, intent, finalResults, supabase);
    }

    return NextResponse.json({
      response,
      destinations: finalResults,
      filters: intent.filters,
      followUps,
      intent: intent.intent,
      vibes: intent.vibes,
      // Deterministic UI layer (new)
      ui,
      // Intelligence layer data
      intelligence: {
        // Contextual hints for UI
        hints: contextualHints,
        // Suggested actions the AI can take
        actions: intelligenceActions,
        // Active trip context
        activeTrip: unifiedContext?.activeTrip ? {
          id: unifiedContext.activeTrip.id,
          name: unifiedContext.activeTrip.name,
          destinations: unifiedContext.activeTrip.destinations,
          gaps: unifiedContext.activeTrip.gaps.slice(0, 3), // First 3 gaps
        } : null,
        // Taste fingerprint summary
        tasteFingerprint: unifiedContext?.tasteFingerprint ? {
          adventurousness: unifiedContext.tasteFingerprint.adventurousness,
          priceAffinity: unifiedContext.tasteFingerprint.priceAffinity,
          designSensitivity: unifiedContext.tasteFingerprint.designSensitivity,
          confidence: unifiedContext.tasteFingerprint.confidence,
        } : null,
        // Related from knowledge graph
        relatedArchitects: unifiedContext?.relatedArchitects || [],
        relatedMovements: unifiedContext?.relatedMovements || [],
      },
      meta: {
        query,
        totalResults: finalResults.length,
        hasVectorSearch: !!embedding,
        ranked: true,
        personalized: !!tasteProfile,
        hasUnifiedContext: !!unifiedContext,
      },
    });
  } catch (error: any) {
    console.error('Travel intelligence error:', error);
    // Return ActionPatch format for error fallback suggestions
    const fallbackPatches: ActionPatch[] = [
      {
        label: 'Restaurants in Tokyo',
        patch: { filters: { city: 'Tokyo', category: 'restaurant' } },
        reason: { type: 'popular', text: 'Popular destination' },
        icon: 'location',
      },
      {
        label: 'Hotels in Paris',
        patch: { filters: { city: 'Paris', category: 'hotel' } },
        reason: { type: 'popular', text: 'Popular destination' },
        icon: 'location',
      },
      {
        label: 'Plan my day in Tokyo',
        patch: { filters: { city: 'Tokyo' }, intent: { mode: 'itinerary', itineraryDuration: 'full_day' } },
        reason: { type: 'popular', text: 'Start planning' },
        icon: 'trip',
      },
    ];
    return NextResponse.json({
      error: 'Search failed',
      response: 'Sorry, I had trouble with that search. Please try again.',
      destinations: [],
      followUps: fallbackPatches,
    }, { status: 500 });
  }
});
