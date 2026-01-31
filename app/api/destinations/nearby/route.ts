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
  // Use service role key only - do not fallback to anon key for server-side operations
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error('Supabase configuration is missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createClient(url, key);
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');
  const radiusKm = parseFloat(searchParams.get('radius') || '5');
  const maxWalkingMinutes = parseInt(searchParams.get('maxWalkingMinutes') || '15', 10);
  const city = searchParams.get('city');

  // Validate lat/lng are provided (not just falsy check - 0 is valid coordinate)
  if (latParam === null || lngParam === null) {
    throw createValidationError('Latitude and longitude are required');
  }

  const lat = parseFloat(latParam);
  const lng = parseFloat(lngParam);

  // Validate coordinates are valid numbers
  if (isNaN(lat) || isNaN(lng)) {
    throw createValidationError('Latitude and longitude must be valid numbers');
  }

  // Validate coordinate ranges
  if (lat < -90 || lat > 90) {
    throw createValidationError('Latitude must be between -90 and 90');
  }
  if (lng < -180 || lng > 180) {
    throw createValidationError('Longitude must be between -180 and 180');
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

  const response = NextResponse.json({
    origin: { lat, lng },
    radiusKm,
    maxWalkingMinutes,
    results,
    count: results.length,
  });

  // Nearby destinations are geo-stable; cache for 5 minutes
  response.headers.set(
    'Cache-Control',
    'public, s-maxage=300, stale-while-revalidate=600'
  );

  return response;
});

