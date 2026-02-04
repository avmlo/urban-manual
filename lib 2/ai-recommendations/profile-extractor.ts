import { createServerClient } from '@/lib/supabase-server';
import { Destination } from '@/types/destination';

export interface UserBehaviorProfile {
  // Demographics
  userId: string;
  displayName?: string;
  
  // Explicit preferences (from profile)
  favoriteCities: string[];
  followedCities: string[]; // Cities user explicitly follows (highest priority)
  favoriteCategories: string[];
  dietaryPreferences: string[];
  pricePreference: number; // 1-4
  travelStyle: string;
  interests: string[];
  
  // Implicit preferences (from behavior)
  topVisitedCities: Array<{ city: string; count: number; avgDuration: number }>;
  topVisitedCategories: Array<{ category: string; count: number }>;
  topSavedCities: Array<{ city: string; count: number }>;
  topSavedCategories: Array<{ category: string; count: number }>;
  
  // Patterns
  avgPriceLevel: number;
  michelinPreference: number; // 0-1 (percentage of Michelin places)
  avgRating: number;
  avgVisitDuration: number; // seconds
  
  // Recency
  recentSearches: string[];
  recentlyViewed: Array<{ id: number; name: string; category: string; city: string }>;
  recentlySaved: Array<{ id: number; name: string; category: string; city: string }>;
  
  // Stats
  totalSaved: number;
  totalVisited: number;
  totalViews: number;
  accountAge: number; // days
}

export async function extractUserProfile(userId: string): Promise<UserBehaviorProfile> {
  const supabase = await createServerClient();
  
  // 1. Get explicit preferences from profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) {
    console.warn('extractUserProfile: profile lookup failed', profileError.message);
  }
  
  // 2. Get followed cities (explicit follows - highest priority)
  const { data: followedCitiesData } = await supabase
    .from('follow_cities')
    .select('city_slug')
    .eq('user_id', userId);
  
  const followedCities = followedCitiesData?.map(f => f.city_slug) || [];
  
  // 3. Get visit history (last 100 visits)
  const { data: visits } = await supabase
    .from('visit_history')
    .select(`
      destination_id,
      visited_at,
      duration_seconds,
      search_query,
      destination:destinations(id, name, city, category, price_level, rating, michelin_stars)
    `)
    .eq('user_id', userId)
    .order('visited_at', { ascending: false })
    .limit(100);
  
  // 4. Get saved destinations
  const { data: saved } = await supabase
    .from('saved_places')
    .select(`
      destination_slug,
      saved_at,
      notes,
      tags,
      destination:destinations!inner(id, name, city, category, price_level, rating, michelin_stars)
    `)
    .eq('user_id', userId);
  
  // 5. Analyze patterns
  const visitedDests = visits?.map((v: any) => v.destination).filter(Boolean) || [];
  const savedDests = saved?.map((s: any) => s.destination).filter(Boolean) || [];
  // Note: saved_places doesn't have 'visited' field - use visited_places for visited status
  const allDests = [...visitedDests, ...savedDests];
  
  // City frequency
  const cityCount: Record<string, { count: number; totalDuration: number }> = {};
  visits?.forEach((v: any) => {
    if (!v.destination?.city) return;
    const city = v.destination.city;
    if (!cityCount[city]) cityCount[city] = { count: 0, totalDuration: 0 };
    cityCount[city].count++;
    cityCount[city].totalDuration += v.duration_seconds || 0;
  });
  
  const topVisitedCities = Object.entries(cityCount)
    .map(([city, data]) => ({
      city,
      count: data.count,
      avgDuration: data.count > 0 ? data.totalDuration / data.count : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // Category frequency
  const categoryCount: Record<string, number> = {};
  visitedDests.forEach((d: any) => {
    if (!d?.category) return;
    categoryCount[d.category] = (categoryCount[d.category] || 0) + 1;
  });
  
  const topVisitedCategories = Object.entries(categoryCount)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // Saved cities/categories
  const savedCityCount: Record<string, number> = {};
  const savedCategoryCount: Record<string, number> = {};
  savedDests.forEach((d: any) => {
    if (d?.city) savedCityCount[d.city] = (savedCityCount[d.city] || 0) + 1;
    if (d?.category) savedCategoryCount[d.category] = (savedCategoryCount[d.category] || 0) + 1;
  });
  
  const topSavedCities = Object.entries(savedCityCount)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  const topSavedCategories = Object.entries(savedCategoryCount)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // Price level analysis
  const priceLevels = allDests.map((d: any) => d?.price_level).filter(Boolean);
  const avgPriceLevel = priceLevels.length > 0
    ? priceLevels.reduce((a: number, b: number) => a + b, 0) / priceLevels.length
    : 2;
  
  // Michelin preference
  const michelinCount = allDests.filter((d: any) => d?.michelin_stars && d.michelin_stars > 0).length;
  const michelinPreference = allDests.length > 0 ? michelinCount / allDests.length : 0;
  
  // Rating preference
  const ratings = allDests.map((d: any) => d?.rating).filter(Boolean);
  const avgRating = ratings.length > 0
    ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
    : 4.0;
  
  // Visit duration
  const durations = visits?.map((v: any) => v.duration_seconds).filter(Boolean) || [];
  const avgVisitDuration = durations.length > 0
    ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length
    : 0;
  
  // Recent searches (extract from visit history)
  const recentSearches = visits
    ?.map((v: any) => v.search_query)
    .filter(Boolean)
    .slice(0, 10) || [];
  
  // Recently viewed/saved
  const recentlyViewed = visitedDests.slice(0, 10).map((d: any) => ({
    id: d.id,
    name: d.name,
    category: d.category,
    city: d.city
  }));
  
  const recentlySaved = savedDests.slice(0, 10).map((d: any) => ({
    id: d.id,
    name: d.name,
    category: d.category,
    city: d.city
  }));
  
  // Account age
  const accountCreated = profile?.created_at ? new Date(profile.created_at) : new Date();
  const accountAge = Math.floor((Date.now() - accountCreated.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    userId,
    displayName: profile?.display_name,
    
    // Explicit
    favoriteCities: profile?.favorite_cities || [],
    followedCities, // Highest priority - explicitly followed cities
    favoriteCategories: profile?.favorite_categories || [],
    dietaryPreferences: profile?.dietary_preferences || [],
    pricePreference: profile?.price_preference || 2,
    travelStyle: profile?.travel_style || 'Balanced',
    interests: profile?.interests || [],
    
    // Implicit
    topVisitedCities,
    topVisitedCategories,
    topSavedCities,
    topSavedCategories,
    
    // Patterns
    avgPriceLevel,
    michelinPreference,
    avgRating,
    avgVisitDuration,
    
    // Recency
    recentSearches: [...new Set(recentSearches)], // dedupe
    recentlyViewed,
    recentlySaved,
    
    // Stats
    totalSaved: saved?.length || 0,
    totalVisited: visits?.length || 0,
    totalViews: visits?.length || 0,
    accountAge
  };
}
