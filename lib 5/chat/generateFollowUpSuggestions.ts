/**
 * Generate contextual follow-up suggestions based on conversation history and results
 */

interface FollowUpSuggestion {
  text: string;
  icon?: 'location' | 'time' | 'price' | 'rating' | 'default';
  type?: 'refine' | 'expand' | 'related';
}

interface GenerateSuggestionsParams {
  query: string;
  intent?: {
    city?: string;
    category?: string;
    filters?: {
      priceLevel?: string | number;
      openNow?: boolean;
    };
  };
  destinations?: Array<{
    city?: string;
    category?: string;
    michelin_stars?: number;
    rating?: number;
  }>;
  conversationHistory?: Array<{ role: string; content: string }>;
  userContext?: {
    favoriteCities?: string[];
    favoriteCategories?: string[];
  };
}

export function generateFollowUpSuggestions({
  query,
  intent,
  destinations = [],
  conversationHistory = [],
  userContext,
}: GenerateSuggestionsParams): FollowUpSuggestion[] {
  const suggestions: FollowUpSuggestion[] = [];
  const queryLower = query.toLowerCase();

  // Extract context from conversation history for better suggestions
  const conversationText = conversationHistory
    .slice(-6) // Last 6 messages (3 turns)
    .map(msg => msg.content.toLowerCase())
    .join(' ');
  
  const fullContext = `${queryLower} ${conversationText}`;
  
  const hasCity = intent?.city || fullContext.match(/\b(tokyo|taipei|new york|london|paris|barcelona|rome|milan|berlin|amsterdam|seoul|singapore|hong kong|bangkok|bali|sydney|melbourne)\b/i);
  const hasCategory = intent?.category || fullContext.match(/\b(restaurant|hotel|cafe|bar|shop|museum|gallery|park|beach|temple|shrine)\b/i);
  const hasPrice = intent?.filters?.priceLevel;
  const hasRating = fullContext.match(/\b(rating|rated|stars|michelin)\b/i);
  const hasTime = fullContext.match(/\b(breakfast|lunch|dinner|brunch|late night|open|closing)\b/i);
  const hasLocation = fullContext.match(/\b(near|close|walking|distance|area|neighborhood|district)\b/i);
  
  // Detect conversational patterns
  const isFollowUp = queryLower.match(/\b(more|another|different|also|and|plus|show me|what about|how about)\b/i);
  const isRefinement = queryLower.match(/\b(with|without|that|this|these|those|like|similar)\b/i);
  const isComparison = queryLower.match(/\b(compare|versus|vs|better|best|difference)\b/i);

  // Get unique cities and categories from results
  const resultCities = [...new Set(destinations.map(d => d.city).filter(Boolean))];
  const resultCategories = [...new Set(destinations.map(d => d.category).filter(Boolean))];
  const hasMichelin = destinations.some(d => d.michelin_stars && d.michelin_stars > 0);
  const hasHighRating = destinations.some(d => d.rating && d.rating >= 4.5);

  // Type 1: Refinement suggestions (narrow down)
  if (hasCity && !hasCategory) {
    suggestions.push({
      text: `Show me ${resultCategories[0] || 'restaurants'} in ${intent?.city || 'this city'}`,
      icon: 'location',
      type: 'refine',
    });
  }

  if (hasCategory && !hasPrice) {
    suggestions.push({
      text: 'Show me budget-friendly options',
      icon: 'price',
      type: 'refine',
    });
  }

  if (!hasTime && hasCategory) {
    suggestions.push({
      text: 'What\'s good for dinner?',
      icon: 'time',
      type: 'refine',
    });
  }

  if (!hasRating && hasCategory) {
    suggestions.push({
      text: 'Show me highly rated places',
      icon: 'rating',
      type: 'refine',
    });
  }

  if (hasCity && !hasLocation) {
    suggestions.push({
      text: 'Show me places near the city center',
      icon: 'location',
      type: 'refine',
    });
  }

  // Type 2: Expansion suggestions (broaden search)
  if (hasCity && resultCities.length === 1) {
    suggestions.push({
      text: `Show me places in nearby cities`,
      icon: 'location',
      type: 'expand',
    });
  }

  if (hasCategory && resultCategories.length === 1) {
    suggestions.push({
      text: `What else is good in ${intent?.city || 'this area'}?`,
      icon: 'default',
      type: 'expand',
    });
  }

  // Type 3: Related suggestions (contextual)
  if (hasMichelin) {
    suggestions.push({
      text: 'Show me more Michelin-starred restaurants',
      icon: 'rating',
      type: 'related',
    });
  }

  if (hasHighRating && !hasRating) {
    suggestions.push({
      text: 'Show me the highest rated places',
      icon: 'rating',
      type: 'related',
    });
  }

  // Context-aware suggestions based on user preferences
  if (userContext?.favoriteCities && userContext.favoriteCities.length > 0) {
    const favoriteCity = userContext.favoriteCities[0];
    if (!hasCity || intent?.city?.toLowerCase() !== favoriteCity.toLowerCase()) {
      suggestions.push({
        text: `What's good in ${favoriteCity}?`,
        icon: 'location',
        type: 'related',
      });
    }
  }

  if (userContext?.favoriteCategories && userContext.favoriteCategories.length > 0) {
    const favoriteCategory = userContext.favoriteCategories[0];
    if (!hasCategory || intent?.category?.toLowerCase() !== favoriteCategory.toLowerCase()) {
      suggestions.push({
        text: `Show me ${favoriteCategory}`,
        icon: 'default',
        type: 'related',
      });
    }
  }

  // Conversation-aware suggestions based on history
  if (isFollowUp && conversationHistory.length > 0) {
    // If user is asking for more, suggest related but different options
    suggestions.push({
      text: 'Show me something different',
      icon: 'default',
      type: 'expand',
    });
  }
  
  if (isRefinement && conversationHistory.length > 0) {
    // If refining, suggest removing filters
    suggestions.push({
      text: 'Show me all options',
      icon: 'default',
      type: 'expand',
    });
  }
  
  if (isComparison) {
    suggestions.push({
      text: 'Show me the best rated',
      icon: 'rating',
      type: 'refine',
    });
  }

  // Generic fallback suggestions
  if (suggestions.length < 3) {
    if (!hasTime) {
      suggestions.push({
        text: 'What\'s open now?',
        icon: 'time',
        type: 'refine',
      });
    }

    if (hasCity) {
      suggestions.push({
        text: 'Show me hidden gems',
        icon: 'default',
        type: 'expand',
      });
    }

    if (hasCategory) {
      suggestions.push({
        text: 'Show me with outdoor seating',
        icon: 'location',
        type: 'refine',
      });
    }
  }

  // Limit to 3-4 suggestions and prioritize by type
  const prioritized = [
    ...suggestions.filter(s => s.type === 'refine'),
    ...suggestions.filter(s => s.type === 'expand'),
    ...suggestions.filter(s => s.type === 'related'),
  ].slice(0, 4);

  return prioritized.length > 0 ? prioritized : [
    { text: 'Show me more options', icon: 'default', type: 'expand' },
    { text: 'What else is good here?', icon: 'default', type: 'related' },
  ];
}

