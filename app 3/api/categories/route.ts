import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { withErrorHandling, handleSupabaseError } from '@/lib/errors';

/**
 * GET /api/categories
 *
 * Returns all unique categories from the destinations table
 * Useful for debugging category filter issues
 */
export const GET = withErrorHandling(async () => {
  const { data: destinations, error } = await supabase
    .from('destinations')
    .select('category');

  if (error) {
    throw handleSupabaseError(error);
  }

  // Get unique categories and count
  const categoryMap = new Map<string, number>();

  destinations?.forEach((dest: any) => {
    if (dest.category) {
      const cat = dest.category.trim();
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    }
  });

  // Convert to array and sort by count
  const categories = Array.from(categoryMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    categories,
    total: categories.length,
  });
});
