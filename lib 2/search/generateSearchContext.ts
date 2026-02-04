import { extractLocation as extractLocationAsync } from './extractLocation';

interface SearchContextInput {
  query: string;
  results: any[];
  totalMatches?: number;
  filters?: {
    openNow?: boolean;
    priceMax?: number;
    priceMin?: number;
  };
  userLocation?: { city: string; country: string; timezone: string };
  inferredCity?: string | null;
}

export async function generateSearchResponseContext(input: SearchContextInput): Promise<string> {
  const { query, results, filters } = input;
  const count = results.length;

  const intent = await extractIntent(query);
  const timeGreeting = getTimeGreeting(input.userLocation?.timezone);
  const parts: string[] = [];

  if (intent.category && intent.location) {
    parts.push(`${capitalize(intent.category)} in ${capitalize(intent.location)} — ${timeGreeting}.`);
  }

  // If user location is known and query didn't specify a location, acknowledge
  if (!intent.location && input.userLocation?.city && intent.category) {
    parts.push(`${capitalize(intent.category)} in ${capitalize(input.userLocation.city)} — ${timeGreeting}.`);
  }

  if (count === 0) {
    return generateZeroResultsText(intent);
  } else if (count === 1) {
    parts.push(`One place fits that exactly.`);
    if ((results[0] as any)?.michelin_stars) {
      parts.push(`${(results[0] as any).michelin_stars} Michelin stars — it's exceptional.`);
    }
  } else if (count <= 4) {
    parts.push(`${count} places here.`);
    parts.push(`It's a specific ask, but these are excellent.`);
  } else if (count <= 9) {
    parts.push(`Found ${count} places.`);
    const insight = generateCategoryInsight(intent.category, results);
    if (insight) parts.push(insight);
  } else {
    parts.push(`Found ${count} places.`);
    // Always try to generate category insight first
    const insight = generateCategoryInsight(intent.category, results);
    if (insight) {
      parts.push(insight);
    } else {
      // Fallback to variety analysis if no category insight
      const variety = analyzeVariety(results);
      if (variety) parts.push(variety);
    }
  }

  if (count > 0) {
    parts.push(`Each one's earned its place here.`);
  }

  if (filters?.openNow) {
    const openCount = results.filter((r: any) => r.is_open_now).length;
    if (openCount < count) parts.push(`${openCount} are open right now.`);
  }

  return parts.join(' ');
}

async function extractIntent(query: string) {
  const lower = query.toLowerCase();
  const location = await extractLocationAsync(query);
  return {
    category: extractCategory(lower),
    location,
    cuisine: extractCuisine(lower),
    priceSignal: extractPriceSignal(lower),
    occasion: extractOccasion(lower),
  };
}

function extractCategory(query: string): string | null {
  const categories: Record<string, string> = {
    hotel: 'hotels',
    hotels: 'hotels',
    restaurant: 'restaurants',
    restaurants: 'restaurants',
    dining: 'restaurants',
    cafe: 'cafés',
    cafes: 'cafés',
    cafés: 'cafés',
    coffee: 'coffee shops',
    'coffee shop': 'coffee shops',
    'coffee shops': 'coffee shops',
    bar: 'bars',
    bars: 'bars',
    museum: 'Culture',
    museums: 'Culture',
    gallery: 'Culture',
    galleries: 'Culture',
    art: 'Culture',
  };
  for (const [k, v] of Object.entries(categories)) if (query.includes(k)) return v;
  return null;
}

function extractCuisine(query: string): string | null {
  const cuisines = ['french', 'italian', 'japanese', 'chinese', 'korean', 'thai', 'indian', 'spanish', 'mexican'];
  for (const c of cuisines) if (query.includes(c)) return c;
  return null;
}

function extractPriceSignal(query: string): string | null {
  if (query.includes('cheap') || query.includes('budget')) return 'budget';
  if (query.includes('expensive') || query.includes('luxury')) return 'luxury';
  return null;
}

function extractOccasion(query: string): string | null {
  if (query.includes('romantic') || query.includes('date')) return 'romantic';
  if (query.includes('business')) return 'business';
  if (query.includes('casual')) return 'casual';
  return null;
}

function getTimeGreeting(timezone?: string): string {
  try {
    const hourStr = new Date().toLocaleString('en-US', { timeZone: timezone || 'UTC', hour: '2-digit', hour12: false });
    const hour = parseInt(hourStr, 10);
    if (hour < 12) return 'good morning';
    if (hour < 18) return 'good afternoon';
    return 'good evening';
  } catch {
    const hour = new Date().getHours();
    if (hour < 12) return 'good morning';
    if (hour < 18) return 'good afternoon';
    return 'good evening';
  }
}

function generateCategoryInsight(category: string | null, results: any[]): string | null {
  if (category === 'hotels') {
    const hasDesign = results.some((r: any) => 
      r.description?.toLowerCase().includes('design') || 
      r.description?.toLowerCase().includes('boutique') ||
      r.style_tags?.some((tag: string) => tag?.toLowerCase().includes('design') || tag?.toLowerCase().includes('boutique'))
    );
    const hasLuxury = results.some((r: any) => 
      (r.price_level ?? 0) >= 4 ||
      r.description?.toLowerCase().includes('luxury') ||
      r.tags?.some((tag: string) => tag?.toLowerCase().includes('luxury'))
    );
    if (hasDesign && hasLuxury) return 'Mix of design-led boutiques and established luxury.';
    if (hasDesign) return 'Mostly design-focused boutiques.';
    if (hasLuxury) return 'Established luxury properties.';
  }
  if (category === 'restaurants') {
    const michelin = results.filter((r: any) => r.michelin_stars && r.michelin_stars > 0).length;
    if (michelin >= 3) return `${michelin} Michelin-recognized among them.`;
    if (michelin > 0) return `${michelin} Michelin-recognized.`;
    const styles = analyzeRestaurantStyles(results);
    return styles;
  }
  if (category === 'cafés' || category === 'coffee shops') {
    const hasSpecialty = results.some((r: any) => 
      r.description?.toLowerCase().includes('specialty') ||
      r.description?.toLowerCase().includes('third wave') ||
      r.tags?.some((tag: string) => tag?.toLowerCase().includes('specialty'))
    );
    if (hasSpecialty) return 'Mix of specialty coffee and classic cafés.';
  }
  return null;
}

function analyzeRestaurantStyles(results: any[]): string {
  const hasTraditional = results.some((r: any) => r.description?.toLowerCase().includes('traditional') || r.description?.toLowerCase().includes('classic'));
  const hasModern = results.some((r: any) => r.description?.toLowerCase().includes('modern') || r.description?.toLowerCase().includes('contemporary'));
  if (hasTraditional && hasModern) return 'Ranging from traditional to contemporary.';
  return 'Varied styles and approaches.';
}

function analyzeVariety(results: any[]): string | null {
  const priceRange = analyzePriceRange(results);
  if (priceRange === 'varied') return 'Mix of price points — from casual to refined.';
  return null;
}

function analyzePriceRange(results: any[]): 'varied' | 'consistent' {
  const prices = results.map((r: any) => r.price_level).filter((p: any) => p != null);
  if (prices.length < 2) return 'consistent';
  const unique = new Set(prices);
  return unique.size >= 3 ? 'varied' : 'consistent';
}

function generateZeroResultsText(intent: any): string {
  const category = intent.category || 'places';
  const location = intent.location || 'the area';
  return `Nothing in my collection for ${category} in ${location} yet. Two paths: I can show you ${category} in nearby areas, or similar options in ${location}. Which interests you?`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}


