/**
 * Agent Tools - Functions that agents can use autonomously
 */

import { createServerClient } from '@/lib/supabase-server';
import { Tool } from '../base-agent';

/**
 * Search Tool - Search for destinations
 */
export const searchTool: Tool = {
  name: 'search_destinations',
  description: 'Search for destinations by city, category, or query',
  execute: async (params: { query?: string; city?: string; category?: string; limit?: number }) => {
    const supabase = await createServerClient();
    let query = supabase
      .from('destinations')
      .select('*')
      .is('parent_destination_id', null); // Only top-level destinations

    if (params.city) {
      query = query.ilike('city', `%${params.city}%`);
    }
    if (params.category) {
      query = query.eq('category', params.category);
    }
    if (params.query) {
      query = query.or(`name.ilike.%${params.query}%,description.ilike.%${params.query}%`);
    }

    const limit = params.limit || 50;
    const { data, error } = await query.limit(limit);

    if (error) throw error;
    return data || [];
  },
};

/**
 * Weather Tool - Get weather information
 */
export const weatherTool: Tool = {
  name: 'get_weather',
  description: 'Get current weather and forecast for a location',
  execute: async (params: { city?: string; lat?: number; lng?: number }) => {
    // Use existing weather API if available, or return mock data
    // In production, integrate with actual weather API
    return {
      temperature: 22,
      condition: 'sunny',
      forecast: 'Clear skies',
    };
  },
};

/**
 * User Profile Tool - Get user preferences and history
 */
export const userProfileTool: Tool = {
  name: 'get_user_profile',
  description: 'Get user preferences, saved places, and visit history',
  execute: async (params: { userId: string }) => {
    const supabase = await createServerClient();
    
    const [savedResult, visitedResult, profileResult] = await Promise.all([
      supabase
        .from('saved_places')
        .select('destination_slug')
        .eq('user_id', params.userId),
      supabase
        .from('visited_places')
        .select('destination_slug, visited_at, rating')
        .eq('user_id', params.userId)
        .order('visited_at', { ascending: false })
        .limit(100),
      supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', params.userId)
        .single(),
    ]);

    return {
      saved: savedResult.data || [],
      visited: visitedResult.data || [],
      profile: profileResult.data || null,
    };
  },
};

/**
 * Route Optimization Tool - Optimize route between destinations
 */
export const routeOptimizationTool: Tool = {
  name: 'optimize_route',
  description: 'Optimize the order of destinations to minimize travel time',
  execute: async (params: { destinations: Array<{ id: number; lat?: number; lng?: number }> }) => {
    // Simple distance-based optimization
    // In production, use Google Maps Directions API
    const { destinations } = params;
    
    if (destinations.length <= 1) return destinations;

    // For now, return destinations in original order
    // TODO: Implement actual route optimization using Google Maps
    return destinations;
  },
};

/**
 * Opening Hours Tool - Check if destinations are open
 */
export const openingHoursTool: Tool = {
  name: 'check_opening_hours',
  description: 'Check opening hours and current availability of destinations',
  execute: async (params: { destinationIds: number[]; date?: string }) => {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('destinations')
      .select('id, name, opening_hours')
      .in('id', params.destinationIds);

    if (error) throw error;

    const date = params.date ? new Date(params.date) : new Date();
    const dayOfWeek = date.getDay();
    const hour = date.getHours();

    return (data || []).map((dest: any) => {
      const hours = dest.opening_hours;
      const isOpen = hours ? checkIfOpen(hours, dayOfWeek, hour) : null;
      return {
        id: dest.id,
        name: dest.name,
        isOpen,
        hours,
      };
    });
  },
};

function checkIfOpen(hours: any, dayOfWeek: number, hour: number): boolean {
  // Simple check - in production, parse opening_hours JSON properly
  if (!hours || typeof hours !== 'object') return true; // Assume open if no data
  return true; // Placeholder
}

/**
 * Nearby Places Tool - Find places near a location
 */
export const nearbyPlacesTool: Tool = {
  name: 'find_nearby_places',
  description: 'Find destinations near a specific location',
  execute: async (params: { lat: number; lng: number; radius?: number; limit?: number }) => {
    const supabase = await createServerClient();
    const radius = params.radius || 5; // km
    const limit = params.limit || 20;

    // Use the existing nearby function if available
    const { data, error } = await supabase.rpc('destinations_nearby', {
      p_lat: params.lat,
      p_lng: params.lng,
      p_radius_km: radius,
      p_limit: limit,
    });

    if (error) throw error;
    return data || [];
  },
};

/**
 * Time Context Tool - Get current time and day information
 */
export const timeContextTool: Tool = {
  name: 'get_time_context',
  description: 'Get current time, day of week, and time of day context',
  execute: async () => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'night';

    return {
      currentTime: now.toISOString(),
      hour,
      dayOfWeek,
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
      timeOfDay,
    };
  },
};

/**
 * Get all available tools
 */
export function getAllTools(): Tool[] {
  return [
    searchTool,
    weatherTool,
    userProfileTool,
    routeOptimizationTool,
    openingHoursTool,
    nearbyPlacesTool,
    timeContextTool,
  ];
}

