import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { withErrorHandling, handleSupabaseError } from '@/lib/errors';
import { enforceRateLimit, apiRatelimit, memoryApiRatelimit } from '@/lib/rate-limit';

/**
 * GET /api/categories
 *
 * Returns all unique categories from the destinations table
 * Useful for debugging category filter issues
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  // Rate limit check to prevent abuse
  const rateLimitResponse = await enforceRateLimit({
    request,
    message: 'Too many requests',
    limiter: apiRatelimit,
    memoryLimiter: memoryApiRatelimit,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { data: destinations, error } = await supabase
    .from('destinations')
    .select('category');

  if (error) {
    throw handleSupabaseError(error);
  }

  // Get unique categories and count
  const categoryMap = new Map<string, number>();

  destinations?.forEach((dest: { category: string | null }) => {
    if (dest.category) {
      const cat = dest.category.trim();
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    }
  });

  // Convert to array and sort by count
  const categories = Array.from(categoryMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Add cache headers - categories rarely change
  const response = NextResponse.json({
    categories,
    total: categories.length,
  });
  response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
  return response;
});

// Force dynamic because we use request headers for rate limiting
export const dynamic = 'force-dynamic';
