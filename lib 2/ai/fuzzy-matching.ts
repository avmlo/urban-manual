/**
 * Fuzzy matching utilities for comparative queries and budget inference
 */

export interface SimilarPlace {
  id: number;
  name: string;
  city: string;
  category: string;
  tags?: string[];
  price_level?: number;
  rating?: number;
  cuisine?: string;
  style?: string;
}

/**
 * Find a similar place by name (fuzzy match)
 */
export async function findSimilarPlace(
  placeName: string,
  userSavedPlaces: any[],
  supabase: any
): Promise<SimilarPlace | null> {
  // First check user's saved places
  const savedMatch = userSavedPlaces.find((p: any) => {
    const savedName = p.name?.toLowerCase() || p.destination?.name?.toLowerCase() || '';
    const searchName = placeName.toLowerCase();
    return savedName.includes(searchName) || searchName.includes(savedName);
  });

  if (savedMatch) {
    return {
      id: savedMatch.id || savedMatch.destination?.id,
      name: savedMatch.name || savedMatch.destination?.name,
      city: savedMatch.city || savedMatch.destination?.city,
      category: savedMatch.category || savedMatch.destination?.category,
      tags: savedMatch.tags || savedMatch.destination?.tags,
      price_level: savedMatch.price_level || savedMatch.destination?.price_level,
      rating: savedMatch.rating || savedMatch.destination?.rating,
    };
  }

  // Search global destinations
  try {
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .ilike('name', `%${placeName}%`)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      city: data.city,
      category: data.category,
      tags: data.tags,
      price_level: data.price_level,
      rating: data.rating,
      cuisine: data.cuisine,
      style: data.style,
    };
  } catch (error) {
    console.error('Error finding similar place:', error);
    return null;
  }
}

/**
 * Infer price level from budget phrases
 */
export function inferPriceFromBudgetPhrase(phrase: string): {
  min?: number;
  max?: number;
  focused?: 'value' | 'splurge';
} {
  const lowerPhrase = phrase.toLowerCase();

  // Budget indicators
  if (lowerPhrase.match(/cheap|budget|afford|won't break|won't.*break/i)) {
    return { max: 2, focused: 'value' };
  }

  // Splurge indicators
  if (lowerPhrase.match(/splurge|worth.*money|special.*occasion|fancy|luxury|upscale/i)) {
    return { min: 3, focused: 'splurge' };
  }

  // Mid-range
  if (lowerPhrase.match(/reasonable|moderate|mid-range|mid.*range/i)) {
    return { min: 2, max: 3 };
  }

  // Extract numeric budget if present
  const yenMatch = phrase.match(/(\d+)\s*yen/i);
  if (yenMatch) {
    const amount = parseInt(yenMatch[1]);
    if (amount < 2000) return { max: 1 };
    if (amount < 5000) return { max: 2 };
    if (amount < 10000) return { max: 3 };
    return { min: 3 };
  }

  const dollarMatch = phrase.match(/\$(\d+)/);
  if (dollarMatch) {
    const amount = parseInt(dollarMatch[1]);
    if (amount < 20) return { max: 1 };
    if (amount < 50) return { max: 2 };
    if (amount < 100) return { max: 3 };
    return { min: 3 };
  }

  return {};
}

/**
 * Infer group size from phrase
 */
export function inferGroupSize(phrase: string): number | null {
  const groupMatches = phrase.match(/group\s+of\s+(\d+)|(\d+)\s+people|party\s+of\s+(\d+)/i);
  if (groupMatches) {
    return parseInt(groupMatches[1] || groupMatches[2] || groupMatches[3]);
  }

  if (phrase.match(/couple|two|date/i)) return 2;
  if (phrase.match(/solo|alone|myself/i)) return 1;
  if (phrase.match(/family|kids/i)) return 4;
  if (phrase.match(/large.*group|big.*group/i)) return 8;

  return null;
}

