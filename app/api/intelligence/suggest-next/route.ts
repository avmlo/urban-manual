import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { withErrorHandling, createSuccessResponse, createValidationError } from '@/lib/errors';
import {
  searchRatelimit,
  memorySearchRatelimit,
  enforceRateLimit,
} from '@/lib/rate-limit';
import { sanitizeForIlike } from '@/lib/sanitize';

/**
 * POST /api/intelligence/suggest-next
 *
 * Suggests the next destination to add to a trip based on:
 * - Current items in the trip
 * - Time of day preference
 * - Geographic proximity
 * - Category balance
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Rate limiting (IP-based as this is a public endpoint)
  const rateLimitResponse = await enforceRateLimit({
    request,
    userId: null, // Public endpoint, use IP
    message: 'Too many suggestion requests',
    limiter: searchRatelimit,
    memoryLimiter: memorySearchRatelimit,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const body = await request.json();
  const { city, currentItems = [], timeOfDay = 'afternoon' } = body;

  if (!city) {
    throw createValidationError('City is required');
  }

  // Validate currentItems
  if (!Array.isArray(currentItems) || currentItems.some(item => typeof item !== 'string')) {
    throw createValidationError('currentItems must be an array of strings');
  }

  const supabase = createServiceRoleClient();

  // Get categories of current items to balance
  const currentSlugs = new Set(currentItems);

  // Determine what category would complement the trip
  // Simple heuristic: if no restaurants, suggest food; if no activities, suggest activities
  const { data: currentDestinations } = await supabase
    .from('destinations')
    .select('category')
    .in('slug', currentItems);

  const currentCategories = new Set(
    currentDestinations?.map(d => d.category?.toLowerCase()) || []
  );

  // Build query for suggestions
  let query = supabase
    .from('destinations')
    .select('*')
    .ilike('city', `%${sanitizeForIlike(city)}%`)
    .not('slug', 'in', currentItems)
    .order('rating', { ascending: false })
    .limit(10);

  // Time-based category preferences
  const categoryPreferences: Record<string, string[]> = {
    morning: ['cafe', 'coffee', 'breakfast', 'bakery', 'temple', 'shrine', 'park'],
    afternoon: ['museum', 'gallery', 'shopping', 'attraction', 'landmark'],
    evening: ['restaurant', 'bar', 'izakaya', 'dining'],
    night: ['bar', 'cocktail', 'nightlife', 'izakaya'],
  };

  const preferredCategories = categoryPreferences[timeOfDay] || categoryPreferences.afternoon;

  // If we don't have a food spot and it's meal time, prioritize restaurants
  const hasFoodSpot = ['restaurant', 'dining', 'cafe', 'breakfast', 'brunch', 'izakaya'].some(
    cat => Array.from(currentCategories).some(c => c?.includes(cat))
  );

  if (!hasFoodSpot && (timeOfDay === 'morning' || timeOfDay === 'evening')) {
    // Prioritize food
    if (Array.isArray(preferredCategories)) {
      query = query.or(
        preferredCategories.map(cat => `category.ilike.%${cat}%`).join(',')
      );
    }
  }

  const { data: suggestions, error } = await query;

  if (error) {
    console.error('Error fetching suggestions:', error);
    throw error;
  }

  if (!suggestions || suggestions.length === 0) {
    return createSuccessResponse({ destination: null, alternatives: [] });
  }

  // Score suggestions based on:
  // 1. Category match with time of day
  // 2. Rating
  // 3. Category diversity (don't repeat categories)
  const scoredSuggestions = suggestions.map(dest => {
    let score = (dest.rating || 3) * 10;

    // Bonus for matching time of day
    const destCategory = dest.category?.toLowerCase() || '';
    if (Array.isArray(preferredCategories) && preferredCategories.some(pref => destCategory.includes(pref))) {
      score += 20;
    }

    // Bonus for category diversity
    if (!currentCategories.has(destCategory)) {
      score += 15;
    }

    // Michelin bonus
    if (dest.michelin_stars && dest.michelin_stars > 0) {
      score += dest.michelin_stars * 5;
    }

    return { ...dest, score };
  });

  // Sort by score and return top suggestion
  scoredSuggestions.sort((a, b) => b.score - a.score);

  return createSuccessResponse({
    destination: scoredSuggestions[0],
    alternatives: scoredSuggestions.slice(1, 4),
  });
});
