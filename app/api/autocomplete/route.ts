import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling } from '@/lib/errors';
import { searchRatelimit, memorySearchRatelimit, getIdentifier, createRateLimitResponse, isUpstashConfigured } from '@/lib/rate-limit';
import { sanitizeForIlike } from '@/lib/sanitize';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const identifier = getIdentifier(request);
  const limiter = isUpstashConfigured() ? searchRatelimit : memorySearchRatelimit;
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    return createRateLimitResponse('Rate limit exceeded. Please try again later.', limit, remaining, reset);
  }

  try {
    const supabase = await createServerClient();
    const { query } = await request.json();

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const searchTerm = query.toLowerCase().trim();
    const safeSearchTerm = sanitizeForIlike(searchTerm);
    const suggestions: string[] = [];

    // 1. Search cities
    const { data: cities } = await (async () => {
      const cityQuery = supabase
        .from('destinations')
        .select('city')
        .ilike('city', `%${safeSearchTerm}%`)
        .limit(5);
      return await cityQuery;
    })();

    if (cities) {
      const uniqueCities = Array.from(new Set(cities.map((c: { city: string }) => c.city)));
      suggestions.push(...uniqueCities.map((c) => `📍 ${c}`));
    }

    // 2. Search destinations
    const { data: destinations } = await (async () => {
      const destQuery = supabase
        .from('destinations')
        .select('name, city')
        .or(`name.ilike.%${safeSearchTerm}%,content.ilike.%${safeSearchTerm}%`)
        .limit(5);
      return await destQuery;
    })();

    if (destinations) {
      destinations.forEach((dest: { name: string; city: string }) => {
        suggestions.push(`🏛️ ${dest.name} - ${dest.city}`);
      });
    }

    // 3. Search categories
    const categories = ['Hotels', 'Restaurants', 'Cafes', 'Bars', 'Shops', 'Museums', 'Parks', 'Spas'];
    const matchingCategories = categories.filter(cat => 
      cat.toLowerCase().includes(searchTerm)
    );

    matchingCategories.forEach(cat => {
      suggestions.push(`🏷️ ${cat}`);
    });

    // Remove duplicates and limit
    const uniqueSuggestions = Array.from(new Set(suggestions)).slice(0, 8);

    return NextResponse.json({ suggestions: uniqueSuggestions });
  } catch (error) {
    console.error('Autocomplete error:', error);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
});

