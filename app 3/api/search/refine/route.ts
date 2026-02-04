import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { generateSearchResponseContext } from '@/lib/search/generateSearchContext';
import { generateSuggestions } from '@/lib/search/generateSuggestions';

export async function POST(request: NextRequest) {
  try {
    const { originalQuery, refinements = [], allResults = [] } = await request.json();
    const supabase = await createServerClient();

    if (!allResults || allResults.length === 0) {
      return NextResponse.json({
        filteredResults: [],
        contextResponse: 'No results to filter.',
        suggestions: [],
      });
    }

    // Fetch full data for provided IDs
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('*')
      .in('id', allResults);

    if (error || !destinations) {
      return NextResponse.json({
        filteredResults: [],
        contextResponse: 'No results found.',
        suggestions: [],
      });
    }

    let filtered = [...destinations];
    const appliedFilters: string[] = [];

    // Apply each refinement sequentially (AND logic)
    for (const refinement of refinements) {
      const lower = String(refinement).toLowerCase().trim();
      const beforeCount = filtered.length;

      // Price filters
      if (lower.includes('cheap') || lower.includes('budget') || lower.includes('under')) {
        filtered = filtered.filter((d: any) => (d.price_level ?? 0) <= 2);
        if (filtered.length < beforeCount) appliedFilters.push('budget-friendly');
      } else if (lower.includes('luxury') || lower.includes('expensive') || lower.includes('upscale')) {
        filtered = filtered.filter((d: any) => (d.price_level ?? 0) >= 4);
        if (filtered.length < beforeCount) appliedFilters.push('luxury');
      } else if (lower.includes('¥30k') || lower.includes('30000') || lower.includes('under ¥30k')) {
        filtered = filtered.filter((d: any) => (d.price_level ?? 0) <= 3);
        if (filtered.length < beforeCount) appliedFilters.push('under ¥30k');
      } else if (lower.includes('¥5k') || lower.includes('5000') || lower.includes('under ¥5k')) {
        filtered = filtered.filter((d: any) => (d.price_level ?? 0) <= 1);
        if (filtered.length < beforeCount) appliedFilters.push('under ¥5k');
      }

      // Style filters
      if (lower.includes('design') || lower.includes('design-led') || lower.includes('design-led')) {
        filtered = filtered.filter((d: any) =>
          d.description?.toLowerCase().includes('design') ||
          d.content?.toLowerCase().includes('design') ||
          d.description?.toLowerCase().includes('minimalist') ||
          d.content?.toLowerCase().includes('minimalist') ||
          (Array.isArray(d.tags) && d.tags.some((t: string) => 
            t.toLowerCase().includes('design') || 
            t.toLowerCase().includes('minimalist') ||
            t.toLowerCase().includes('modern')
          ))
        );
        if (filtered.length < beforeCount) appliedFilters.push('design-led');
      } else if (lower.includes('minimalist') || lower.includes('minimal')) {
        filtered = filtered.filter((d: any) =>
          d.description?.toLowerCase().includes('minimalist') ||
          d.content?.toLowerCase().includes('minimalist') ||
          (Array.isArray(d.tags) && d.tags.some((t: string) => t.toLowerCase().includes('minimalist')))
        );
        if (filtered.length < beforeCount) appliedFilters.push('minimalist');
      } else if (lower.includes('traditional') || lower.includes('classic')) {
        filtered = filtered.filter((d: any) =>
          d.description?.toLowerCase().includes('traditional') ||
          d.description?.toLowerCase().includes('classic') ||
          d.content?.toLowerCase().includes('traditional') ||
          d.content?.toLowerCase().includes('classic')
        );
        if (filtered.length < beforeCount) appliedFilters.push('traditional');
      } else if (lower.includes('boutique')) {
        filtered = filtered.filter((d: any) =>
          d.description?.toLowerCase().includes('boutique') ||
          d.content?.toLowerCase().includes('boutique') ||
          (Array.isArray(d.tags) && d.tags.some((t: string) => t.toLowerCase().includes('boutique')))
        );
        if (filtered.length < beforeCount) appliedFilters.push('boutique');
      } else if (lower.includes('casual')) {
        filtered = filtered.filter((d: any) =>
          d.description?.toLowerCase().includes('casual') ||
          d.content?.toLowerCase().includes('casual') ||
          (Array.isArray(d.tags) && d.tags.some((t: string) => t.toLowerCase().includes('casual')))
        );
        if (filtered.length < beforeCount) appliedFilters.push('casual');
      } else if (lower.includes('fine dining') || lower.includes('fine-dining')) {
        filtered = filtered.filter((d: any) =>
          d.description?.toLowerCase().includes('fine dining') ||
          d.content?.toLowerCase().includes('fine dining') ||
          d.description?.toLowerCase().includes('upscale') ||
          d.content?.toLowerCase().includes('upscale')
        );
        if (filtered.length < beforeCount) appliedFilters.push('fine dining');
      }

      // Status filters
      if (lower.includes('open now') || lower.includes('open now') || lower.includes('currently open')) {
        filtered = filtered.filter((d: any) => d.is_open_now === true);
        if (filtered.length < beforeCount) appliedFilters.push('open now');
      }

      // Quality filters
      if (lower.includes('michelin') || lower.includes('michelin-starred')) {
        filtered = filtered.filter((d: any) => (d.michelin_stars ?? 0) > 0);
        if (filtered.length < beforeCount) appliedFilters.push('Michelin-starred');
      }

      // Location filters
      if (lower.startsWith('in ') || lower.includes('location:')) {
        const location = lower.replace(/^(in |location:)/, '').trim();
        filtered = filtered.filter((d: any) =>
          d.city?.toLowerCase().includes(location) ||
          d.neighborhood?.toLowerCase().includes(location) ||
          d.address?.toLowerCase().includes(location)
        );
        if (filtered.length < beforeCount) appliedFilters.push(`in ${location}`);
      }

      // Category filters
      const categoryMap: Record<string, string[]> = {
        'restaurant': ['Dining', 'Restaurant'],
        'hotel': ['Hotel', 'Accommodation'],
        'cafe': ['Cafe', 'Coffee'],
        'bar': ['Bar', 'Nightlife'],
        'museum': ['Culture', 'Museum'],
        'gallery': ['Culture', 'Gallery', 'Art'],
        'shop': ['Shopping', 'Retail'],
        'store': ['Shopping', 'Retail'],
      };

      for (const [key, categories] of Object.entries(categoryMap)) {
        if (lower.includes(key)) {
          filtered = filtered.filter((d: any) =>
            categories.some(cat => d.category?.toLowerCase().includes(cat.toLowerCase()))
          );
          if (filtered.length < beforeCount) appliedFilters.push(key);
          break;
        }
      }
    }

    // Generate contextual response
    let contextResponse = '';
    try {
      contextResponse = await generateSearchResponseContext({
        query: originalQuery,
        results: filtered,
        filters: {},
      }) || '';
    } catch (error) {
      console.error('Error generating context response:', error);
      contextResponse = generateFallbackResponse(filtered.length, destinations.length, appliedFilters);
    }

    // Generate suggestions
    let suggestions: Array<{ label: string; refinement: string }> = [];
    try {
      suggestions = await generateSuggestions({
        query: originalQuery,
        results: filtered,
        refinements,
        filters: {},
      }) || [];
    } catch (error) {
      console.error('Error generating suggestions:', error);
      suggestions = [];
    }

    return NextResponse.json({
      filteredResults: filtered,
      contextResponse,
      suggestions,
      appliedFilters,
    });
  } catch (error: any) {
    console.error('Refine endpoint error:', error);
    return NextResponse.json({
      filteredResults: [],
      contextResponse: 'Sorry, there was an error filtering results. Please try again.',
      suggestions: [],
    });
  }
}

function generateFallbackResponse(
  filteredCount: number,
  originalCount: number,
  appliedFilters: string[]
): string {
  if (filteredCount === 0) {
    return `No matches for ${appliedFilters.join(' + ')}. Want to try different filters?`;
  }
  if (filteredCount === 1) {
    return `One place matches ${appliedFilters.join(' + ')}.`;
  }
  const parts: string[] = [];
  if (filteredCount < originalCount) {
    parts.push(`Narrowed to ${filteredCount} of ${originalCount} places.`);
  } else {
    parts.push(`${filteredCount} places.`);
  }
  if (appliedFilters.length > 0) {
    parts.push(`Filtered by: ${appliedFilters.join(', ')}.`);
  }
  return parts.join(' ');
}
