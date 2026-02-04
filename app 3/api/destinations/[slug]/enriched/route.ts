/**
 * API Route: Get enriched destination data
 * GET /api/destinations/[slug]/enriched
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processPlacePhotos } from '@/lib/enrichment/photos';
import { fetchWeather } from '@/lib/enrichment/weather';
import { fetchNearbyEvents } from '@/lib/enrichment/events';
import { calculateRouteFromCityCenter } from '@/lib/enrichment/routes';
import { generateDestinationMap } from '@/lib/enrichment/static-maps';
import { getCurrencyCodeForCity, getExchangeRate } from '@/lib/enrichment/currency';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = getSupabaseClient();

    // Fetch destination
    const { data: destination, error } = await supabase
      .from('destinations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !destination) {
      return NextResponse.json(
        { error: 'Destination not found' },
        { status: 404 }
      );
    }

    // Return enriched data from database
    const enriched = {
      slug: destination.slug,
      name: destination.name,
      city: destination.city,
      
      // Photos
      photos: destination.photos_json ? JSON.parse(destination.photos_json) : null,
      primaryPhotoUrl: destination.primary_photo_url,
      photoCount: destination.photo_count || 0,
      
      // Weather
      currentWeather: destination.current_weather_json ? JSON.parse(destination.current_weather_json) : null,
      weatherForecast: destination.weather_forecast_json ? JSON.parse(destination.weather_forecast_json) : null,
      bestVisitMonths: destination.best_visit_months,
      
      // Events
      nearbyEvents: destination.nearby_events_json ? JSON.parse(destination.nearby_events_json) : null,
      upcomingEventCount: destination.upcoming_event_count || 0,
      
      // Routes
      routeFromCityCenter: destination.route_from_city_center_json ? JSON.parse(destination.route_from_city_center_json) : null,
      walkingTimeFromCenter: destination.walking_time_from_center_minutes,
      distanceFromCenter: destination.distance_from_center_meters,
      
      // Maps
      staticMapUrl: destination.static_map_url,
      
      // Currency
      currencyCode: destination.currency_code,
      exchangeRateToUSD: destination.exchange_rate_to_usd,
      
      // Timestamps
      weatherUpdatedAt: destination.weather_updated_at,
      eventsUpdatedAt: destination.events_updated_at,
      advancedEnrichmentAt: destination.advanced_enrichment_at,
    };

    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error('Error fetching enriched destination:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enriched destination data' },
      { status: 500 }
    );
  }
}

