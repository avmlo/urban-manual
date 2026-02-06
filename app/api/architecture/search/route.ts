/**
 * Architecture Search API
 * Architecture-aware search that understands design intent
 */

import { NextRequest } from 'next/server';
import { parseArchitectureQuery, isArchitectureQuery } from '@/lib/search/architecture-parser';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling, createSuccessResponse, createValidationError } from '@/lib/errors';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const { query, city, limit = 20 } = await request.json();

  if (!query) {
    throw createValidationError('Query is required');
  }

  // Parse architecture query
  const architectureQuery = parseArchitectureQuery(query);
  const supabase = await createServerClient();

  let destinationsQuery = supabase
    .from('destinations')
    .select(`
      id,
      name,
      slug,
      city,
      country,
      category,
      image,
      architect_id,
      movement_id,
      architectural_significance,
      design_story,
      intelligence_score,
      architect_ref:architects(id, name, slug),
      movement:design_movements(id, name, slug)
    `)
    .not('architect_id', 'is', null)
    .order('intelligence_score', { ascending: false })
    .limit(limit);

  // Filter by city if provided or extracted
  const targetCity = city || architectureQuery.city;
  if (targetCity) {
    destinationsQuery = destinationsQuery.eq(
      'city',
      targetCity.toLowerCase().replace(/\s+/g, '-')
    );
  }

  // Filter by architect if found
  if (architectureQuery.architect) {
    const { data: architect } = await supabase
      .from('architects')
      .select('id')
      .eq('slug', architectureQuery.architect)
      .single();

    if (architect) {
      destinationsQuery = destinationsQuery.eq('architect_id', architect.id);
    }
  }

  // Filter by movement if found
  if (architectureQuery.movement) {
    const { data: movement } = await supabase
      .from('design_movements')
      .select('id')
      .eq('slug', architectureQuery.movement)
      .single();

    if (movement) {
      destinationsQuery = destinationsQuery.eq('movement_id', movement.id);
    }
  }

  // Filter by material if found
  if (architectureQuery.material) {
    const { data: material } = await supabase
      .from('materials')
      .select('id')
      .eq('slug', architectureQuery.material)
      .single();

    if (material) {
      const { data: materialLinks } = await supabase
        .from('destination_materials')
        .select('destination_id')
        .eq('material_id', material.id);

      if (materialLinks && materialLinks.length > 0) {
        const destinationIds = materialLinks.map(link => link.destination_id);
        destinationsQuery = destinationsQuery.in('id', destinationIds);
      } else {
        // No destinations with this material
        return createSuccessResponse({
          destinations: [],
          query: architectureQuery,
        });
      }
    }
  }

  // Filter by category if found
  if (architectureQuery.category) {
    destinationsQuery = destinationsQuery.ilike('category', `%${architectureQuery.category}%`);
  }

  const { data: destinations, error } = await destinationsQuery;

  if (error) {
    throw new Error(`Failed to search destinations: ${error.message}`);
  }

  // Group results by architect or movement for better presentation
  const grouped = groupArchitectureResults(destinations || [], architectureQuery);

  return createSuccessResponse({
    destinations: destinations || [],
    grouped: grouped,
    query: architectureQuery,
    isArchitectureQuery: isArchitectureQuery(query),
  });
});

/**
 * Group architecture search results
 */
function groupArchitectureResults(destinations: any[], query: any) {
  const grouped: Record<string, any[]> = {};

  for (const dest of destinations) {
    if (query.architect && dest.architect_id) {
      const key = `architect-${dest.architect_id}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(dest);
    } else if (query.movement && dest.movement_id) {
      const key = `movement-${dest.movement_id}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(dest);
    } else {
      if (!grouped.other) {
        grouped.other = [];
      }
      grouped.other.push(dest);
    }
  }

  return grouped;
}

