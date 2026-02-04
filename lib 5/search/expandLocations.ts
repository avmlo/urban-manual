import { createClient } from '@supabase/supabase-js';

// Get Supabase client (works in both server and client contexts)
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = 
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';
  
  if (!url || !key) {
    return createClient('https://placeholder.supabase.co', 'placeholder-key');
  }
  
  return createClient(url, key);
}

export interface LocationData {
  name: string;
  nearby_locations: string[];
  walking_time: Record<string, number>;
  neighborhood_type?: string;
  cultural_notes?: string;
}

/**
 * Expand a location query to include nearby neighborhoods within walking distance
 */
export async function expandNearbyLocations(
  locationName: string,
  maxWalkingMinutes: number = 15
): Promise<string[]> {
  try {
    const supabase = getSupabaseClient();
    
    // Normalize location name (lowercase, trim)
    const normalized = locationName.toLowerCase().trim();
    
    // Get location data
    const { data: location, error } = await supabase
      .from('locations')
      .select('nearby_locations, walking_time')
      .ilike('name', normalized)
      .single();
    
    if (error || !location) {
      // Location not found in our curated data, return original
      return [locationName];
    }
    
    // Filter by walking time
    const nearby = (location.nearby_locations as string[]) || [];
    const walkingTime = (location.walking_time as Record<string, number>) || {};
    
    const accessible = nearby.filter(
      loc => (walkingTime[loc] || Infinity) <= maxWalkingMinutes
    );
    
    // Return original location + nearby accessible locations
    return [locationName, ...accessible];
  } catch (error) {
    console.error('Error expanding locations:', error);
    return [locationName];
  }
}

/**
 * Get location metadata for context
 */
export async function getLocationContext(
  locationName: string
): Promise<LocationData | null> {
  try {
    const supabase = getSupabaseClient();
    
    const normalized = locationName.toLowerCase().trim();
    
    const { data: location, error } = await supabase
      .from('locations')
      .select('name, nearby_locations, walking_time, neighborhood_type, cultural_notes')
      .ilike('name', normalized)
      .single();
    
    if (error || !location) {
      return null;
    }
    
    return {
      name: location.name,
      nearby_locations: (location.nearby_locations as string[]) || [],
      walking_time: (location.walking_time as Record<string, number>) || {},
      neighborhood_type: location.neighborhood_type || undefined,
      cultural_notes: location.cultural_notes || undefined,
    };
  } catch (error) {
    console.error('Error getting location context:', error);
    return null;
  }
}

/**
 * Find a location by partial match (fuzzy search)
 */
export async function findLocationByName(
  partialName: string
): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    
    const normalized = partialName.toLowerCase().trim();
    
    // Try exact match first
    const { data: exact } = await supabase
      .from('locations')
      .select('name')
      .ilike('name', normalized)
      .single();
    
    if (exact) return exact.name;
    
    // Try partial match
    const { data: partial } = await supabase
      .from('locations')
      .select('name')
      .ilike('name', `%${normalized}%`)
      .limit(1)
      .single();
    
    return partial?.name || null;
  } catch (error) {
    console.error('Error finding location:', error);
    return null;
  }
}

