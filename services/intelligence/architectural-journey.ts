/**
 * Architectural Journey Generator
 * Core intelligence product - generates architectural journeys
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { ArchitecturalJourney, ArchitectureDestination } from '@/types/architecture';

// Lazy Supabase client to avoid build-time errors
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    _supabase = createClient(supabaseUrl, supabaseKey);
  }
  return _supabase;
}

export interface JourneyInput {
  city: string;
  type?: 'movement' | 'architect' | 'material' | 'period' | 'city';
  focus?: string; // Movement slug, architect slug, material slug, etc.
  limit?: number;
}

/**
 * Generate architectural journey
 */
export async function generateArchitecturalJourney(
  input: JourneyInput
): Promise<ArchitecturalJourney> {
  let destinations: ArchitectureDestination[] = [];

  if (input.type === 'movement' && input.focus) {
    destinations = await getDestinationsByMovement(input.city, input.focus, input.limit);
  } else if (input.type === 'architect' && input.focus) {
    destinations = await getDestinationsByArchitect(input.city, input.focus, input.limit);
  } else if (input.type === 'material' && input.focus) {
    destinations = await getDestinationsByMaterial(input.city, input.focus, input.limit);
  } else {
    destinations = await getDestinationsByCity(input.city, input.limit);
  }

  const narrative = generateNarrative(destinations, input.type, input.focus || input.city);
  const insights = await generateInsights(destinations);

  return {
    id: `journey-${Date.now()}`,
    title: generateTitle(destinations, input.type, input.focus || input.city),
    description: narrative,
    type: input.type || 'city',
    focus: input.focus || input.city,
    destinations: destinations,
    narrative: narrative,
    insights: insights,
    created_at: new Date().toISOString(),
  };
}

/**
 * Get destinations by movement
 */
async function getDestinationsByMovement(
  city: string,
  movementSlug: string,
  limit = 20
): Promise<ArchitectureDestination[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
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
    .eq('city', city.toLowerCase().replace(/\s+/g, '-'))
    .not('movement_id', 'is', null)
    .order('intelligence_score', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch destinations by movement: ${error.message}`);
  }

  // Filter by movement slug (would be better with proper join)
  const { data: movement } = await supabase
    .from('design_movements')
    .select('id')
    .eq('slug', movementSlug)
    .single();

  // Transform data to match ArchitectureDestination type
  const transformDestination = (d: any): ArchitectureDestination => ({
    ...d,
    architect: Array.isArray(d.architect_ref) && d.architect_ref.length > 0 ? d.architect_ref[0] : d.architect_ref || null,
    movement: Array.isArray(d.movement) && d.movement.length > 0 ? d.movement[0] : d.movement || null,
    created_at: d.created_at || new Date().toISOString(),
    country: d.country || '',
  });

  if (movement) {
    return (data || []).filter(d => d.movement_id === movement.id).map(transformDestination);
  }

  return (data || []).map(transformDestination);
}

/**
 * Get destinations by architect
 */
async function getDestinationsByArchitect(
  city: string,
  architectSlug: string,
  limit = 20
): Promise<ArchitectureDestination[]> {
  const supabase = getSupabase();
  const { data: architect } = await supabase
    .from('architects')
    .select('id')
    .eq('slug', architectSlug)
    .single();

  if (!architect) {
    return [];
  }

  const { data, error } = await supabase
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
    .eq('city', city.toLowerCase().replace(/\s+/g, '-'))
    .eq('architect_id', architect.id)
    .order('intelligence_score', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch destinations by architect: ${error.message}`);
  }

  // Transform data to match ArchitectureDestination type
  return (data || []).map((d: any) => ({
    ...d,
    architect: Array.isArray(d.architect_ref) && d.architect_ref.length > 0 ? d.architect_ref[0] : d.architect_ref || null,
    movement: Array.isArray(d.movement) && d.movement.length > 0 ? d.movement[0] : d.movement || null,
    created_at: d.created_at || new Date().toISOString(),
    country: d.country || '',
  })) as ArchitectureDestination[];
}

/**
 * Get destinations by material
 */
async function getDestinationsByMaterial(
  city: string,
  materialSlug: string,
  limit = 20
): Promise<ArchitectureDestination[]> {
  const supabase = getSupabase();
  const { data: material } = await supabase
    .from('materials')
    .select('id')
    .eq('slug', materialSlug)
    .single();

  if (!material) {
    return [];
  }

  const { data: materialLinks } = await supabase
    .from('destination_materials')
    .select('destination_id')
    .eq('material_id', material.id);

  if (!materialLinks || materialLinks.length === 0) {
    return [];
  }

  const destinationIds = materialLinks.map(link => link.destination_id);

  const { data, error } = await supabase
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
    .eq('city', city.toLowerCase().replace(/\s+/g, '-'))
    .in('id', destinationIds)
    .order('intelligence_score', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch destinations by material: ${error.message}`);
  }

  // Transform data to match ArchitectureDestination type
  return (data || []).map((d: any) => ({
    ...d,
    architect: Array.isArray(d.architect_ref) && d.architect_ref.length > 0 ? d.architect_ref[0] : d.architect_ref || null,
    movement: Array.isArray(d.movement) && d.movement.length > 0 ? d.movement[0] : d.movement || null,
    created_at: d.created_at || new Date().toISOString(),
    country: d.country || '',
  })) as ArchitectureDestination[];
}

/**
 * Get destinations by city
 */
async function getDestinationsByCity(
  city: string,
  limit = 20
): Promise<ArchitectureDestination[]> {
  const { data, error } = await getSupabase()
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
    .eq('city', city.toLowerCase().replace(/\s+/g, '-'))
    .not('architect_id', 'is', null)
    .order('intelligence_score', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch destinations by city: ${error.message}`);
  }

  // Transform data to match ArchitectureDestination type
  return (data || []).map((d: any) => ({
    ...d,
    architect: Array.isArray(d.architect_ref) && d.architect_ref.length > 0 ? d.architect_ref[0] : d.architect_ref || null,
    movement: Array.isArray(d.movement) && d.movement.length > 0 ? d.movement[0] : d.movement || null,
    created_at: d.created_at || new Date().toISOString(),
    country: d.country || '',
  })) as ArchitectureDestination[];
}

/**
 * Generate narrative
 */
function generateNarrative(
  destinations: ArchitectureDestination[],
  type?: string,
  focus?: string
): string {
  if (type === 'movement' && focus) {
    return `Explore ${destinations.length} destinations that exemplify ${focus} architecture. This journey reveals how the movement shaped the city's architectural identity through bold forms, innovative materials, and visionary design.`;
  } else if (type === 'architect' && focus) {
    return `Discover ${destinations.length} works by ${focus}, showcasing their distinctive design philosophy and architectural vision. Each destination reveals different aspects of their creative evolution and design language.`;
  } else {
    return `An architectural journey through ${destinations.length} carefully selected destinations. From historic landmarks to contemporary masterpieces, explore the architectural diversity that defines this city.`;
  }
}

/**
 * Generate title
 */
function generateTitle(
  destinations: ArchitectureDestination[],
  type?: string,
  focus?: string
): string {
  if (type === 'movement' && focus) {
    return `${focus} Architecture Journey`;
  } else if (type === 'architect' && focus) {
    return `${focus}'s Architectural Works`;
  } else {
    return `Architectural Journey`;
  }
}

/**
 * Generate insights
 */
async function generateInsights(
  destinations: ArchitectureDestination[]
): Promise<ArchitecturalJourney['insights']> {
  const insights: ArchitecturalJourney['insights'] = [];

  // Group by architect
  const byArchitect = new Map<string, ArchitectureDestination[]>();
  for (const dest of destinations) {
    if (dest.architect_id) {
      if (!byArchitect.has(dest.architect_id)) {
        byArchitect.set(dest.architect_id, []);
      }
      byArchitect.get(dest.architect_id)!.push(dest);
    }
  }

  // Multiple works by same architect
  for (const [architectId, archDests] of byArchitect.entries()) {
    if (archDests.length > 1 && archDests[0].architect) {
      insights.push({
        type: 'evolution',
        title: `Multiple works by ${archDests[0].architect.name}`,
        description: `Explore ${archDests.length} destinations designed by the same architect, revealing their design evolution and architectural philosophy.`,
        destinations: archDests.map(d => d.id),
      });
    }
  }

  return insights;
}

