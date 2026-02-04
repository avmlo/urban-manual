import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

function getSupabaseClient() {
  // Use service role client for admin operations (bypasses RLS)
  // Falls back to anon key if service role is not available
  try {
    return createServiceRoleClient();
  } catch (error) {
    // If service role is not configured, log error but continue
    // The client will be a placeholder and operations will fail gracefully
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const radius = parseFloat(searchParams.get('radius') || '5'); // km
    const limit = parseInt(searchParams.get('limit') || '50');
    const city = searchParams.get('city'); // Optional city filter
    const category = searchParams.get('category'); // Optional category filter

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Try using the database function first (if migration has been run)
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
        // Function doesn't exist, use fallback
        console.log('Database function not found, using fallback method');
        usesFallback = true;
      } else {
        destinations = data || [];
      }
    } catch (error) {
      // Function doesn't exist, use fallback
      console.log('Database function error, using fallback method');
      usesFallback = true;
    }

    // Fallback: Fetch all destinations and calculate distance client-side
    if (usesFallback) {
      const { data, error } = await supabase
        .from('destinations')
        .select('slug, name, city, category, description, content, image, michelin_stars, crown, latitude, longitude');

      if (error) {
        console.error('Error fetching destinations:', error);
        return NextResponse.json(
          { error: 'Failed to fetch destinations', details: error.message },
          { status: 500 }
        );
      }

      // Calculate distances for destinations that have coordinates
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

    // Apply additional filters if provided
    let filtered = destinations || [];

    if (city) {
      filtered = filtered.filter((d: any) => d.city === city);
    }

    if (category) {
      filtered = filtered.filter((d: any) => d.category === category);
    }

    return NextResponse.json({
      destinations: filtered,
      userLocation: { lat, lng },
      radius,
      count: filtered.length,
      usesFallback,
    });
  } catch (error: any) {
    console.error('Error in nearby API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
