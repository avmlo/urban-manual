import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  withStandardApi,
  createSuccessResponse,
  createValidationError,
} from '@/lib/api';

function getSupabaseClient() {
  try {
    return createServiceRoleClient();
  } catch (error) {
    console.error('[nearby API] Service role client not available, using placeholder');
    const { createClient } = require('@supabase/supabase-js');
    return createClient('https://placeholder.supabase.co', 'placeholder-key');
  }
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const GET = withStandardApi(
  { rateLimit: 'search', auth: 'none', routeName: '/api/nearby' },
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);

    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const radius = parseFloat(searchParams.get('radius') || '5');
    const limit = parseInt(searchParams.get('limit') || '50');
    const city = searchParams.get('city');
    const category = searchParams.get('category');

    if (!lat || !lng) {
      throw createValidationError('Latitude and longitude are required');
    }

    const supabase = getSupabaseClient();
    let destinations: any[] = [];
    let usesFallback = false;

    try {
      const { data, error } = await supabase
        .rpc('destinations_nearby', {
          user_lat: lat,
          user_lng: lng,
          radius_km: radius,
          result_limit: limit
        });

      if (error) {
        console.log('Database function not found, using fallback method');
        usesFallback = true;
      } else {
        destinations = data || [];
      }
    } catch {
      console.log('Database function error, using fallback method');
      usesFallback = true;
    }

    if (usesFallback) {
      const { data, error } = await supabase
        .from('destinations')
        .select('slug, name, city, category, description, content, image, michelin_stars, crown, latitude, longitude');

      if (error) {
        throw error;
      }

      destinations = (data || [])
        .filter((d: any) => d.latitude && d.longitude)
        .map((d: any) => {
          const distance = calculateDistance(lat, lng, d.latitude, d.longitude);
          return {
            ...d,
            distance_km: distance,
            distance_miles: distance * 0.621371
          };
        })
        .filter((d: any) => d.distance_km <= radius)
        .sort((a: any, b: any) => a.distance_km - b.distance_km)
        .slice(0, limit);
    }

    let filtered = destinations || [];
    if (city) {
      filtered = filtered.filter((d: any) => d.city === city);
    }
    if (category) {
      filtered = filtered.filter((d: any) => d.category === category);
    }

    return createSuccessResponse({
      destinations: filtered,
      userLocation: { lat, lng },
      radius,
      count: filtered.length,
      usesFallback,
    });
  }
);
