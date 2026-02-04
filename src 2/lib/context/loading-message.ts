export type TemporalContext = {
  timeframe?: string;
  timeOfDay?: string;
};

export type LoadingIntent = {
  city?: string;
  category?: string;
  modifiers?: string[];
  temporalContext?: TemporalContext;
  primaryIntent?: string;
};

export type SeasonalContext = {
  season?: string;
  weather?: string;
};

export type UserContext = {
  preferences?: unknown;
  visitedCities?: string[];
};

export type LoadingMessageOptions = {
  currentDate?: Date;
  random?: () => number;
};

const categoryCityMessages: Record<string, Array<(city: string) => string>> = {
  restaurant: [
    (city: string) => `Discovering ${city}'s finest dining...`,
    (city: string) => `Curating the best restaurants in ${city}...`,
    (city: string) => `Finding ${city}'s culinary gems...`,
    (city: string) => `Exploring ${city}'s food scene...`,
  ],
  cafe: [
    (city: string) => `Locating ${city}'s best cafes...`,
    (city: string) => `Finding cozy spots in ${city}...`,
    (city: string) => `Discovering ${city}'s coffee culture...`,
  ],
  bar: [
    (city: string) => `Exploring ${city}'s nightlife...`,
    (city: string) => `Finding the best bars in ${city}...`,
    (city: string) => `Discovering ${city}'s cocktail scene...`,
  ],
  hotel: [
    (city: string) => `Curating ${city}'s best stays...`,
    (city: string) => `Finding perfect accommodations in ${city}...`,
    (city: string) => `Discovering ${city}'s top hotels...`,
  ],
  shopping: [
    (city: string) => `Exploring ${city}'s shopping scene...`,
    (city: string) => `Finding the best stores in ${city}...`,
    (city: string) => `Discovering ${city}'s retail gems...`,
  ],
};

const categoryMessages: Record<string, string[]> = {
  restaurant: [
    'Exploring culinary destinations...',
    'Finding the perfect dining spots...',
    'Curating restaurant recommendations...',
    'Discovering amazing food experiences...',
  ],
  cafe: [
    'Locating cozy cafes...',
    'Finding the best coffee spots...',
    'Discovering perfect study/work spaces...',
  ],
  bar: [
    'Exploring nightlife options...',
    'Finding great cocktail bars...',
    'Discovering vibrant social scenes...',
  ],
  hotel: [
    'Curating accommodation options...',
    'Finding perfect stays...',
    'Discovering unique lodgings...',
  ],
  shopping: [
    'Exploring shopping destinations...',
    'Finding the best retail spots...',
    'Discovering unique boutiques...',
  ],
  attraction: [
    'Discovering must-see attractions...',
    'Finding cultural landmarks...',
    'Exploring iconic destinations...',
  ],
};

const fallbackMessages = [
  'Finding the perfect spots...',
  'Searching for amazing places...',
  'Discovering hidden gems...',
  'Curating the best destinations...',
  'Exploring top recommendations...',
  'Finding your next adventure...',
  'Locating must-visit places...',
  'Selecting the finest spots...',
];

/**
 * Generates a context-aware loading message using the user's query, derived intent,
 * and seasonal context so the UI can show more personalized copy while searches run.
 *
 * @param query - Raw text entered by the user.
 * @param intent - Parsed search intent including potential city/category/modifier metadata.
 * @param seasonalContext - Derived season or weather information.
 * @param userContext - Additional caller context (currently unused but reserved for future logic).
 * @param options - Optional overrides for the current date/randomizer (useful for testing).
 * @returns Human-friendly loading copy tailored to the provided context.
 */
export function getContextAwareLoadingMessage(
  query: string,
  intent?: LoadingIntent | null,
  seasonalContext?: SeasonalContext | null,
  _userContext?: UserContext | null,
  options?: LoadingMessageOptions
): string {
  const queryLower = query.toLowerCase();
  const now = options?.currentDate ?? new Date();
  const hour = now.getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const random = options?.random ?? Math.random;

  if (intent?.temporalContext?.timeframe === 'now') {
    const cityPart = intent.city ? ` in ${intent.city}` : '';
    return `Finding places open right now${cityPart}...`;
  }

  if (intent?.primaryIntent === 'compare') {
    return 'Comparing options for you...';
  }
  if (intent?.primaryIntent === 'plan') {
    return 'Planning your perfect itinerary...';
  }

  if (intent?.category && intent?.city) {
    const category = intent.category.toLowerCase();
    const city = intent.city;
    const messages = categoryCityMessages[category as keyof typeof categoryCityMessages];
    if (messages && messages.length) {
      const formatter = messages[Math.floor(random() * messages.length)];
      return formatter(city);
    }
  }

  if (intent?.modifiers && intent.modifiers.length > 0) {
    const modifier = intent.modifiers[0].toLowerCase();
    if (modifier.includes('romantic')) {
      return 'Finding intimate spots perfect for two...';
    }
    if (modifier.includes('cozy') || modifier.includes('comfortable')) {
      return 'Seeking warm, welcoming spaces...';
    }
    if (modifier.includes('luxury') || modifier.includes('upscale')) {
      return 'Curating premium experiences...';
    }
    if (modifier.includes('budget') || modifier.includes('cheap')) {
      return 'Finding great value options...';
    }
    if (modifier.includes('hidden') || modifier.includes('secret')) {
      return 'Uncovering hidden gems...';
    }
    if (modifier.includes('trendy') || modifier.includes('popular')) {
      return "Spotting what's hot right now...";
    }
  }

  if (seasonalContext?.season) {
    const season = seasonalContext.season.toLowerCase();
    if (season === 'spring') {
      return 'Finding perfect spring destinations...';
    }
    if (season === 'summer') {
      return 'Discovering summer hotspots...';
    }
    if (season === 'fall' || season === 'autumn') {
      return 'Curating autumn experiences...';
    }
    if (season === 'winter') {
      return 'Finding cozy winter spots...';
    }
  }

  if (intent?.category) {
    const category = intent.category.toLowerCase();
    const messages = categoryMessages[category];
    if (messages) {
      return messages[Math.floor(random() * messages.length)];
    }
  }

  if (intent?.city) {
    return `Exploring ${intent.city}'s best spots...`;
  }

  if (timeOfDay === 'morning') {
    return 'Starting your day with perfect recommendations...';
  }
  if (timeOfDay === 'afternoon') {
    return 'Finding your perfect afternoon escape...';
  }
  if (timeOfDay === 'evening') {
    return 'Discovering evening destinations...';
  }

  if (queryLower.match(/restaurant|dining|food|eat/)) {
    return 'Finding the perfect dining experience...';
  }
  if (queryLower.match(/coffee|cafe|caf[eé]/)) {
    return 'Locating cozy coffee spots...';
  }
  if (queryLower.match(/bar|cocktail|drink|nightlife/)) {
    return 'Exploring nightlife options...';
  }
  if (queryLower.match(/hotel|stay|accommodation/)) {
    return 'Curating accommodation options...';
  }

  return fallbackMessages[Math.floor(random() * fallbackMessages.length)];
}
