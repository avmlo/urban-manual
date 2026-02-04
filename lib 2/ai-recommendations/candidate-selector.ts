import { createServerClient } from '@/lib/supabase-server';
import { Destination } from '@/types/destination';
import { UserBehaviorProfile } from './profile-extractor';

export async function selectCandidates(
  userId: string,
  profile: UserBehaviorProfile,
  limit: number = 100
): Promise<Destination[]> {
  const supabase = await createServerClient();
  
  // Get already saved/visited destinations to exclude
  const { data: savedSlugs } = await supabase
    .from('saved_places')
    .select('destination_slug')
    .eq('user_id', userId);
  
  // Get destination IDs from slugs to exclude
  const slugs = savedSlugs?.map(s => s.destination_slug).filter(Boolean) || [];
  const { data: savedDests } = slugs.length > 0 ? await supabase
    .from('destinations')
    .select('id')
    .in('slug', slugs) : { data: null };
  
  const excludeIds = savedDests?.map(d => d.id) || [];
  
  // Build query with smart filtering
  let query = supabase
    .from('destinations')
    .select('*');
  
  // Exclude already saved destinations
  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  } else {
    // If no exclusions, use a dummy condition
    query = query.not('id', 'eq', -1);
  }
  
  // Prefer user's favorite cities (70% of candidates)
  const favoriteCities = [
    ...profile.favoriteCities,
    ...profile.topVisitedCities.slice(0, 3).map(c => c.city),
    ...profile.topSavedCities.slice(0, 3).map(c => c.city)
  ];
  
  const uniqueFavCities = [...new Set(favoriteCities)];
  
  if (uniqueFavCities.length > 0) {
    // Get destinations from favorite cities
    const cityLimit = Math.floor(limit * 0.7);
    const { data: cityDests } = await query
      .in('city', uniqueFavCities)
      .limit(cityLimit);
    
    // Get remaining from other cities
    const remainingLimit = limit - (cityDests?.length || 0);
    
    if (remainingLimit > 0) {
      const cityIds = cityDests?.map(d => d.id) || [];
      const excludeIdsWithCities = [...excludeIds, ...cityIds];
      
      const otherQuery = supabase
        .from('destinations')
        .select('*');
      
      if (excludeIdsWithCities.length > 0) {
        otherQuery.not('id', 'in', `(${excludeIdsWithCities.join(',')})`);
      }
      
      otherQuery.not('city', 'in', `(${uniqueFavCities.map(c => `'${c.replace(/'/g, "''")}'`).join(',')})`);
      
      const { data: otherDests } = await otherQuery.limit(remainingLimit);
      
      return [...(cityDests || []), ...(otherDests || [])];
    }
    
    return cityDests || [];
  }
  
  // No favorite cities yet, get diverse selection
  const { data } = await query.limit(limit);
  return data || [];
}

