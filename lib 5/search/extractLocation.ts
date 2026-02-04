import { createClient } from '@supabase/supabase-js';
import { validateSupabaseUrl, validateSupabaseAnonKey } from '@/lib/supabase/validation';

// Get Supabase client (works in both server and client contexts)
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = 
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';
  
  const urlValidation = validateSupabaseUrl(url);
  const keyValidation = validateSupabaseAnonKey(key);
  
  if (!urlValidation.valid || !keyValidation.valid) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[extractLocation] Invalid Supabase configuration');
    }
    return createClient('https://placeholder.supabase.co', 'placeholder-key');
  }
  
  return createClient(url, key);
}

// Cache for location names (refreshed periodically)
let locationNamesCache: string[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get all location names from locations table and destinations table
 * Cached for 5 minutes to avoid repeated queries
 */
async function getAllLocationNames(): Promise<string[]> {
  const now = Date.now();
  
  // Return cached if still valid
  if (locationNamesCache && (now - cacheTimestamp) < CACHE_TTL) {
    return locationNamesCache;
  }

  try {
    const supabase = getSupabaseClient();
    
    // Get all locations from locations table (neighborhoods + cities)
    const { data: locations } = await supabase
      .from('locations')
      .select('name, parent_city')
      .limit(1000);

    // Get all unique cities from destinations table
    const { data: destinations } = await supabase
      .from('destinations')
      .select('city')
      .not('city', 'is', null)
      .limit(10000);

    const locationSet = new Set<string>();
    
    // Add locations from locations table
    if (locations) {
      locations.forEach(loc => {
        locationSet.add(loc.name.toLowerCase());
        if (loc.parent_city) {
          locationSet.add(loc.parent_city.toLowerCase());
        }
      });
    }
    
    // Add cities from destinations table
    if (destinations) {
      destinations.forEach(dest => {
        if (dest.city) {
          locationSet.add(dest.city.toLowerCase());
        }
      });
    }

    locationNamesCache = Array.from(locationSet);
    cacheTimestamp = now;
    
    return locationNamesCache;
  } catch (error) {
    console.error('Error fetching location names:', error);
    // Return fallback list if query fails
    return [
      'tokyo', 'shibuya', 'shinjuku', 'ginza', 'aoyama', 'omotesando', 'harajuku', 'roppongi',
      'paris', 'le marais', 'saint-germain', 'montmartre', 'bastille', 'latin quarter',
      'london', 'soho', 'covent garden', 'mayfair', 'shoreditch', 'marylebone', 'notting hill',
      'new york', 'tribeca', 'west village', 'east village', 'chelsea', 'greenwich village',
      'los angeles', 'hollywood', 'west hollywood', 'beverly hills', 'santa monica', 'venice',
      'kyoto', 'osaka', 'singapore', 'hong kong', 'sydney', 'dubai', 'bangkok',
      'berlin', 'amsterdam', 'rome', 'barcelona', 'lisbon', 'madrid', 'vienna', 'prague'
    ];
  }
}

/**
 * Extract location from query using database lookup
 * Now async to query locations table
 */
export async function extractLocation(query: string): Promise<string | null> {
  const lower = query.toLowerCase();
  const locations = await getAllLocationNames();
  
  // Try exact match first (most specific)
  for (const loc of locations) {
    if (lower === loc || lower.includes(loc)) {
      return loc;
    }
  }
  
  return null;
}

