/**
 * API Route: Find nearby destinations
 * GET /api/destinations/nearby?lat=...&lng=...&radius=...
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { findNearbyDestinations } from '@/lib/enrichment/distance-matrix';
import { withErrorHandling, createValidationError, handleSupabaseError, CustomError, ErrorCode } from '@/lib/errors';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = 
    process.env.SUPABASE_SECRET_KEY || 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase configuration is missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE keys.');
  }

  return createClient(url, key);
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const radiusKm = parseFloat(searchParams.get('radius') || '5');
  const maxWalkingMinutes = parseInt(searchParams.get('maxWalkingMinutes') || '15');
  const city = searchParams.get('city');

  if (!lat || !lng) {
    throw createValidationError('Latitude and longitude are required');
  }

  const supabase = getSupabaseClient();

  // Fetch destinations in the area
  let query = supabase
    .from('destinations')
    .select('slug, name, latitude, longitude, city, neighborhood, category')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (city) {
    query = query.eq('city', city);
  }

  const { data: destinations, error } = await query;

  if (error) {
    throw handleSupabaseError(error);
  }

  if (!destinations) {
    throw new CustomError(ErrorCode.EXTERNAL_API_ERROR, 'Failed to fetch destinations', 500);
  }

  // Calculate distances
  const nearby = await findNearbyDestinations(
    { lat, lng },
    destinations.map(d => ({
      lat: d.latitude!,
      lng: d.longitude!,
      slug: d.slug,
    })),
    maxWalkingMinutes,
    'walking'
  );

  // Combine with destination data
  const results = nearby.map(near => {
    const dest = destinations.find(d => d.slug === near.slug);
    return {
      ...dest,
      distanceMeters: near.distanceMeters,
      walkingTimeMinutes: near.durationMinutes,
    };
  });

  return NextResponse.json({
    origin: { lat, lng },
    radiusKm,
    maxWalkingMinutes,
    results,
    count: results.length,
  });
});

