import { supabase } from './supabase';
import { Destination } from '@/types/destination';

// Time-based category weights
const TIME_CATEGORY_WEIGHTS: Record<string, Record<string, number>> = {
  morning: {
    cafe: 1.5,
    bakery: 1.5,
    breakfast: 2.0,
    coffee: 1.5,
  },
  lunch: {
    restaurant: 1.5,
    cafe: 1.2,
    food: 1.3,
  },
  afternoon: {
    cafe: 1.3,
    shop: 1.2,
    hotel: 1.1,
    museum: 1.3,
  },
  evening: {
    restaurant: 1.5,
    bar: 1.3,
    hotel: 1.2,
    nightlife: 1.4,
  },
  night: {
    bar: 1.5,
    nightlife: 1.5,
    restaurant: 1.2,
  },
};

// Get current time of day
function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

// Calculate category affinity from interactions
async function calculateCategoryAffinity(userId: string | null, sessionId: string) {
  const query = supabase
    .from('user_interactions')
    .select('category, interaction_type, duration_seconds')
    .eq('session_id', sessionId);

  if (userId) {
    query.or(`user_id.eq.${userId},session_id.eq.${sessionId}`);
  }

  const { data: interactions } = await query;

  const categoryScores: Record<string, number> = {};

  (interactions as any[])?.forEach((interaction: any) => {
    if (!interaction.category) return;

    const category = interaction.category.toLowerCase();
    if (!categoryScores[category]) {
      categoryScores[category] = 0;
    }

    // Weight by interaction type
    const weights = {
      view: 1,
      click: 2,
      save: 5,
      visit: 3,
      search: 4,
    };

    categoryScores[category] += weights[interaction.interaction_type as keyof typeof weights] || 1;

    // Bonus for time spent
    if (interaction.duration_seconds && interaction.duration_seconds > 30) {
      categoryScores[category] += 2;
    }
  });

  // Normalize scores to 0-1 range
  const maxScore = Math.max(...Object.values(categoryScores), 1);
  Object.keys(categoryScores).forEach((key) => {
    categoryScores[key] = categoryScores[key] / maxScore;
  });

  return categoryScores;
}

// Calculate city affinity from interactions
async function calculateCityAffinity(userId: string | null, sessionId: string) {
  const query = supabase
    .from('user_interactions')
    .select('city, interaction_type, duration_seconds')
    .eq('session_id', sessionId);

  if (userId) {
    query.or(`user_id.eq.${userId},session_id.eq.${sessionId}`);
  }

  const { data: interactions } = await query;

  const cityScores: Record<string, number> = {};

  (interactions as any[])?.forEach((interaction: any) => {
    if (!interaction.city) return;

    const city = interaction.city.toLowerCase();
    if (!cityScores[city]) {
      cityScores[city] = 0;
    }

    // Weight by interaction type
    const weights = {
      view: 1,
      click: 2,
      save: 5,
      visit: 3,
      search: 4,
    };

    cityScores[city] += weights[interaction.interaction_type as keyof typeof weights] || 1;

    // Bonus for time spent
    if (interaction.duration_seconds && interaction.duration_seconds > 30) {
      cityScores[city] += 2;
    }
  });

  // Normalize scores to 0-1 range
  const maxScore = Math.max(...Object.values(cityScores), 1);
  Object.keys(cityScores).forEach((key) => {
    cityScores[key] = cityScores[key] / maxScore;
  });

  return cityScores;
}

// Algorithm 1: Cold Start Recommendations
export async function getColdStartRecommendations(
  limit: number = 20
): Promise<Destination[]> {
  const timeOfDay = getTimeOfDay();
  const categoryWeights = TIME_CATEGORY_WEIGHTS[timeOfDay] || {};

  // Get all destinations
  const { data: destinations } = await supabase
    .from('destinations')
    .select('*')
    .limit(100);

  if (!destinations) return [];

  // Score destinations based on time of day and quality signals
  const scored = (destinations as any[]).map((dest: any) => {
    let score = 0;

    // Time-based category boost
    const category = dest.category?.toLowerCase() || '';
    const categoryWeight = categoryWeights[category] || 1.0;
    score += categoryWeight * 10;

    // Quality signals (reduced from previous)
    if (dest.crown) score += 5;
    if (dest.image) score += 3;

    // Random factor for diversity
    score += Math.random() * 5;

    return { ...dest, _score: score };
  });

  // Sort by score and return top results
  return scored
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
}

// Algorithm 2: Rapid Learning (Session-based)
export async function getRapidLearningRecommendations(
  userId: string | null,
  sessionId: string,
  limit: number = 20
): Promise<Destination[]> {
  const categoryScores = await calculateCategoryAffinity(userId, sessionId);
  const cityScores = await calculateCityAffinity(userId, sessionId);

  // Get all destinations
  const { data: destinations } = await supabase
    .from('destinations')
    .select('*')
    .limit(200);

  if (!destinations) return [];

  // Score destinations based on learned preferences
  const scored = (destinations as any[]).map((dest: any) => {
    let score = 0;

    // Category affinity
    const category = dest.category?.toLowerCase() || '';
    if (categoryScores[category]) {
      score += categoryScores[category] * 20;
    }

    // City affinity
    const city = dest.city?.toLowerCase() || '';
    if (cityScores[city]) {
      score += cityScores[city] * 15;
    }

    // Quality signals
    if (dest.crown) score += 3;
    if (dest.image) score += 2;

    // Random exploration factor (20%)
    score += Math.random() * 5;

    return { ...dest, _score: score };
  });

  // Sort by score and return top results
  return scored
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
}

// Algorithm 3: Content-Based Filtering
export async function getContentBasedRecommendations(
  userId: string,
  limit: number = 20
): Promise<Destination[]> {
  // Get user's saved and visited destinations
  const { data: savedPlaces } = await supabase
    .from('saved_places')
    .select('destination_slug')
    .eq('user_id', userId);

  const { data: visitedPlaces } = await supabase
    .from('visited_places')
    .select('destination_slug')
    .eq('user_id', userId);

  const userDestinationSlugs = [
    ...((savedPlaces as any[])?.map((s: any) => s.destination_slug) || []),
    ...((visitedPlaces as any[])?.map((v: any) => v.destination_slug) || []),
  ];

  if (userDestinationSlugs.length === 0) {
    return getColdStartRecommendations(limit);
  }

  // Get user's preferred destinations
  const { data: userDestinations } = await supabase
    .from('destinations')
    .select('*')
    .in('slug', userDestinationSlugs);

  if (!userDestinations || userDestinations.length === 0) {
    return getColdStartRecommendations(limit);
  }

  // Extract user preferences
  const preferredCategories = Array.from(
    new Set((userDestinations as any[]).map((d: any) => d.category?.toLowerCase()).filter(Boolean))
  );
  const preferredCities = Array.from(
    new Set((userDestinations as any[]).map((d: any) => d.city?.toLowerCase()).filter(Boolean))
  );

  // Get candidate destinations
  const { data: candidates } = await supabase
    .from('destinations')
    .select('*')
    .not('slug', 'in', `(${userDestinationSlugs.join(',')})`)
    .limit(200);

  if (!candidates) return [];

  // Score candidates based on similarity
  const scored = (candidates as any[]).map((dest: any) => {
    let score = 0;

    const category = dest.category?.toLowerCase() || '';
    const city = dest.city?.toLowerCase() || '';

    // Same category + same city = highly relevant
    if (preferredCategories.includes(category) && preferredCities.includes(city)) {
      score += 30;
    } else if (preferredCategories.includes(category)) {
      score += 20;
    } else if (preferredCities.includes(city)) {
      score += 15;
    }

    // Quality signals
    if (dest.crown) score += 5;
    if (dest.image) score += 2;

    // Exploration factor
    score += Math.random() * 5;

    return { ...dest, _score: score };
  });

  return scored
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
}

// Algorithm 4: Hybrid Recommendations
export async function getHybridRecommendations(
  userId: string | null,
  sessionId: string,
  limit: number = 20
): Promise<Destination[]> {
  // Check if user has interaction history
  const { data: interactions } = await supabase
    .from('user_interactions')
    .select('id')
    .eq('session_id', sessionId)
    .limit(1);

  const hasHistory = (interactions?.length || 0) > 0;

  // For first-time visitors: Cold Start + Popular
  if (!userId && !hasHistory) {
    const coldStart = await getColdStartRecommendations(limit);
    return coldStart;
  }

  // For engaged visitors (same session): Rapid Learning + Cold Start
  if (!userId && hasHistory) {
    const rapidLearning = await getRapidLearningRecommendations(null, sessionId, Math.floor(limit * 0.6));
    const coldStart = await getColdStartRecommendations(Math.floor(limit * 0.4));

    return [...rapidLearning, ...coldStart].slice(0, limit);
  }

  // For returning users: Content-Based + Rapid Learning
  if (userId) {
    const contentBased = await getContentBasedRecommendations(userId, Math.floor(limit * 0.5));
    const rapidLearning = await getRapidLearningRecommendations(userId, sessionId, Math.floor(limit * 0.3));
    const coldStart = await getColdStartRecommendations(Math.floor(limit * 0.2));

    // Combine and deduplicate
    const combined = [...contentBased, ...rapidLearning, ...coldStart];
    const unique = Array.from(
      new Map(combined.map((dest) => [dest.slug, dest])).values()
    );

    return unique.slice(0, limit);
  }

  return getColdStartRecommendations(limit);
}

// Update user preferences periodically
export async function updateUserPreferences(userId: string) {
  try {
    // Get all user interactions
    const { data: interactions } = await supabase
      .from('user_interactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (!interactions || interactions.length === 0) return;

    // Calculate category scores
    const categoryScores: Record<string, number> = {};
    const cityScores: Record<string, number> = {};

    (interactions as any[]).forEach((interaction: any) => {
      // Category scores
      if (interaction.category) {
        const category = interaction.category.toLowerCase();
        if (!categoryScores[category]) {
          categoryScores[category] = 0;
        }

        const weights = {
          view: 1,
          click: 2,
          save: 5,
          visit: 3,
          search: 4,
        };

        categoryScores[category] += weights[interaction.interaction_type as keyof typeof weights] || 1;
      }

      // City scores
      if (interaction.city) {
        const city = interaction.city.toLowerCase();
        if (!cityScores[city]) {
          cityScores[city] = 0;
        }

        const weights = {
          view: 1,
          click: 2,
          save: 5,
          visit: 3,
          search: 4,
        };

        cityScores[city] += weights[interaction.interaction_type as keyof typeof weights] || 1;
      }
    });

    // Normalize scores
    const maxCategoryScore = Math.max(...Object.values(categoryScores), 1);
    Object.keys(categoryScores).forEach((key) => {
      categoryScores[key] = categoryScores[key] / maxCategoryScore;
    });

    const maxCityScore = Math.max(...Object.values(cityScores), 1);
    Object.keys(cityScores).forEach((key) => {
      cityScores[key] = cityScores[key] / maxCityScore;
    });

    // Update or create user preferences
    const { error } = await (supabase
      .from('user_preferences')
      .upsert as any)({
        user_id: userId,
        category_scores: categoryScores,
        city_scores: cityScores,
        last_updated: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Error updating user preferences:', error);
    }
  } catch (error) {
    console.error('Failed to update user preferences:', error);
  }
}
