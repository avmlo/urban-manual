/**
 * Enhanced Re-Ranker for Urban Manual Search
 * 
 * This re-ranker improves search results by considering multiple signals:
 * 1. Semantic similarity (vector embeddings)
 * 2. Rank score (computed intelligence metrics)
 * 3. Trending score (recent popularity)
 * 4. User engagement signals (views, saves)
 * 5. Editorial quality (ratings, reviews, Michelin stars)
 * 6. Contextual relevance (query intent matching)
 */

interface RerankOptions {
  query?: string;
  queryIntent?: {
    city?: string;
    category?: string;
    meal?: string;
    cuisine?: string;
    mood?: string;
    price_level?: number;
    weather_preference?: 'indoor' | 'outdoor' | null; // New: weather-aware ranking
    event_context?: boolean; // New: boost places near events
  };
  userId?: string;
  boostPersonalized?: boolean;
  enrichedContext?: {
    currentWeather?: any;
    nearbyEvents?: any[];
  };
}

interface DestinationWithScore {
  id: number;
  slug: string;
  name: string;
  city: string;
  category: string;
  similarity_score?: number;
  rank_score?: number;
  trending_score?: number;
  rating?: number;
  reviews_count?: number;
  michelin_stars?: number;
  views_count?: number;
  saves_count?: number;
  is_open_now?: boolean;
  [key: string]: any;
}

/**
 * Calculate enriched data boost (weather, events, routes)
 */
function calculateEnrichmentBoost(
  destination: DestinationWithScore,
  options: RerankOptions
): number {
  let boost = 0;

  // Weather-aware boosting
  if (options.enrichedContext?.currentWeather) {
    const weather = options.enrichedContext.currentWeather;
    const weatherCode = weather.weatherCode;

    // Boost indoor options if it's raining/snowing
    if (options.queryIntent?.weather_preference === 'indoor' || 
        (weatherCode >= 61 && weatherCode <= 86)) {
      // Check if destination has indoor seating (heuristic: hotels, cafes, restaurants)
      if (destination.category?.toLowerCase().includes('hotel') ||
          destination.category?.toLowerCase().includes('cafe') ||
          destination.category?.toLowerCase().includes('dining')) {
        boost += 0.1;
      }
    }

    // Boost outdoor options if weather is clear
    if (options.queryIntent?.weather_preference === 'outdoor' ||
        (weatherCode === 0 || weatherCode === 1)) {
      // Boost places with outdoor seating (heuristic: check tags or description)
      if (destination.tags?.some((tag: string) => 
        tag.toLowerCase().includes('outdoor') || 
        tag.toLowerCase().includes('terrace') ||
        tag.toLowerCase().includes('rooftop'))) {
        boost += 0.1;
      }
    }
  }

  // Event proximity boost
  if (options.enrichedContext?.nearbyEvents && 
      options.enrichedContext.nearbyEvents.length > 0) {
    // Boost destinations near events
    if (destination.nearbyEvents && destination.nearbyEvents.length > 0) {
      boost += 0.05 * Math.min(destination.nearbyEvents.length, 3);
    }
  }

  // Walking distance boost (closer = better)
  if (destination.walkingTimeFromCenter) {
    const walkingMinutes = destination.walkingTimeFromCenter;
    if (walkingMinutes <= 5) {
      boost += 0.15; // Very close
    } else if (walkingMinutes <= 15) {
      boost += 0.1; // Convenient
    } else if (walkingMinutes <= 30) {
      boost += 0.05; // Accessible
    }
  }

  // Photo availability boost (more photos = more trustworthy)
  if (destination.photos && Array.isArray(destination.photos)) {
    const photoCount = destination.photos.length;
    boost += Math.min(photoCount * 0.01, 0.1); // Max 0.1 boost
  }

  return boost;
}

/**
 * Calculate boosted similarity score based on query intent matching
 */
function calculateIntentMatchBoost(
  destination: DestinationWithScore,
  intent: RerankOptions['queryIntent']
): number {
  if (!intent) return 0;

  let boost = 0;

  // City match (strong boost)
  if (intent.city && destination.city?.toLowerCase().includes(intent.city.toLowerCase())) {
    boost += 0.3;
  }

  // Category match (strong boost)
  if (intent.category && destination.category?.toLowerCase() === intent.category.toLowerCase()) {
    boost += 0.25;
  }

  // Price level match (moderate boost)
  if (intent.price_level && destination.price_level === intent.price_level) {
    boost += 0.15;
  }

  // Michelin stars preference (if user is looking for fine dining)
  if (intent.category?.toLowerCase().includes('dining') && destination.michelin_stars && destination.michelin_stars > 0) {
    boost += 0.1;
  }

  return Math.min(boost, 0.5); // Cap at 50% boost
}

/**
 * Calculate editorial quality score
 */
function calculateEditorialQuality(destination: DestinationWithScore): number {
  let quality = 0;

  // High ratings boost
  if (destination.rating && destination.rating >= 4.5) {
    quality += 0.3;
  } else if (destination.rating && destination.rating >= 4.0) {
    quality += 0.2;
  } else if (destination.rating && destination.rating >= 3.5) {
    quality += 0.1;
  }

  // Michelin stars boost
  if (destination.michelin_stars) {
    quality += destination.michelin_stars * 0.15;
  }

  // Review count (social proof)
  if (destination.reviews_count) {
    if (destination.reviews_count >= 100) {
      quality += 0.15;
    } else if (destination.reviews_count >= 50) {
      quality += 0.1;
    } else if (destination.reviews_count >= 10) {
      quality += 0.05;
    }
  }

  return Math.min(quality, 0.8); // Cap at 80%
}

/**
 * Calculate engagement score (recent popularity)
 */
function calculateEngagementScore(destination: DestinationWithScore): number {
  let engagement = 0;

  // Normalize views_count (0-1 scale, assuming max ~10000 views)
  if (destination.views_count) {
    engagement += Math.min(destination.views_count / 10000, 1) * 0.2;
  }

  // Normalize saves_count (0-1 scale, assuming max ~1000 saves)
  if (destination.saves_count) {
    engagement += Math.min(destination.saves_count / 1000, 1) * 0.3;
  }

  // Trending score (already normalized 0-1)
  if (destination.trending_score) {
    engagement += destination.trending_score * 0.3;
  }

  // Open now boost (time relevance)
  if (destination.is_open_now) {
    engagement += 0.2;
  }

  return Math.min(engagement, 1); // Cap at 100%
}

/**
 * Re-rank search results using multiple signals
 * 
 * Final score formula:
 * - Base similarity: 40%
 * - Rank score (intelligence): 25%
 * - Engagement (trending, views, saves): 20%
 * - Editorial quality (ratings, Michelin): 10%
 * - Intent match boost: 5% (additive)
 */
export function rerankDestinations(
  destinations: DestinationWithScore[],
  options: RerankOptions = {}
): DestinationWithScore[] {
  if (!destinations || destinations.length === 0) {
    return [];
  }

  // Normalize scores to 0-1 range
  const normalize = (value: number, min: number, max: number): number => {
    if (max === min) return 0.5;
    return (value - min) / (max - min);
  };

  // Find min/max for normalization
  const similarityScores = destinations.map(d => d.similarity_score || 0).filter(s => s > 0);
  const rankScores = destinations.map(d => d.rank_score || 0).filter(s => s > 0);
  const trendingScores = destinations.map(d => d.trending_score || 0).filter(s => s > 0);

  const minSimilarity = similarityScores.length > 0 ? Math.min(...similarityScores) : 0;
  const maxSimilarity = similarityScores.length > 0 ? Math.max(...similarityScores) : 1;
  const minRank = rankScores.length > 0 ? Math.min(...rankScores) : 0;
  const maxRank = rankScores.length > 0 ? Math.max(...rankScores) : 1;
  const minTrending = trendingScores.length > 0 ? Math.min(...trendingScores) : 0;
  const maxTrending = trendingScores.length > 0 ? Math.max(...trendingScores) : 1;

  // Calculate final scores
  const scored = destinations.map(dest => {
    // Normalize individual scores
    const normSimilarity = normalize(dest.similarity_score || 0, minSimilarity, maxSimilarity);
    const normRank = normalize(dest.rank_score || 0, minRank, maxRank);
    const normTrending = normalize(dest.trending_score || 0, minTrending, maxTrending);

    // Calculate component scores
    const baseSimilarity = normSimilarity * 0.40;
    const intelligenceScore = normRank * 0.25;
    const engagementScore = calculateEngagementScore(dest) * 0.20;
    const qualityScore = calculateEditorialQuality(dest) * 0.10;
    const intentBoost = calculateIntentMatchBoost(dest, options.queryIntent) * 0.05;
    const enrichmentBoost = calculateEnrichmentBoost(dest, options); // New: weather/events/routes boost

    // Personalization boost (if user has saved/visited similar places)
    let personalizationBoost = 0;
    if (options.boostPersonalized && options.userId) {
      // This would be enhanced with actual user data
      // For now, we'll use trending as a proxy
      personalizationBoost = normTrending * 0.05;
    }

    // Final score (enrichment boost is additive, max 0.15)
    const finalScore =
      baseSimilarity +
      intelligenceScore +
      engagementScore +
      qualityScore +
      intentBoost +
      personalizationBoost +
      Math.min(enrichmentBoost, 0.15); // Cap enrichment boost

    return {
      ...dest,
      _rerank_score: finalScore,
      _components: {
        similarity: baseSimilarity,
        intelligence: intelligenceScore,
        engagement: engagementScore,
        quality: qualityScore,
        intent: intentBoost,
        personalized: personalizationBoost,
        enrichment: Math.min(enrichmentBoost, 0.15), // Track enrichment boost
      },
    };
  });

  // Sort by final score (descending)
  const ranked = scored.sort((a: any, b: any) => b._rerank_score - a._rerank_score);

  // Remove internal scoring fields before returning
  return ranked.map(({ _rerank_score, _components, ...rest }: any) => rest);
}

/**
 * Re-rank with cross-encoder style semantic matching
 * This provides a more accurate semantic match than simple cosine similarity
 */
export function rerankWithCrossEncoder(
  destinations: DestinationWithScore[],
  query: string,
  options: RerankOptions = {}
): DestinationWithScore[] {
  // For now, use the multi-signal reranker
  // In the future, you could integrate a lightweight cross-encoder model
  // like: @xenova/transformers (runs in browser/edge) or API-based (Cohere, Jina)
  
  return rerankDestinations(destinations, { ...options, query });
}

