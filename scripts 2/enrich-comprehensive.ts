/**
 * Comprehensive Enrichment Script
 * Fetches all available data from multiple APIs for destinations
 * Usage: npm run enrich:comprehensive [limit] [offset]
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { processPlacePhotos } from '../lib/enrichment/photos';
import { fetchWeather } from '../lib/enrichment/weather';
import { fetchNearbyEvents } from '../lib/enrichment/events';
import { calculateRouteFromCityCenter } from '../lib/enrichment/routes';
import { generateDestinationMap } from '../lib/enrichment/static-maps';
import { getCurrencyCodeForCity, getExchangeRate } from '../lib/enrichment/currency';
import { findNearbyDestinations } from '../lib/enrichment/distance-matrix';

// Load environment variables FIRST
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!GOOGLE_API_KEY) {
  console.error('❌ GOOGLE_API_KEY not found in .env.local');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase URL or Key not found in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Get city center coordinates (simplified - could be enhanced with geocoding)
 */
function getCityCenter(city: string): { lat: number; lng: number } | null {
  const cityCenters: Record<string, { lat: number; lng: number }> = {
    'new york': { lat: 40.7128, lng: -74.0060 },
    'london': { lat: 51.5074, lng: -0.1278 },
    'paris': { lat: 48.8566, lng: 2.3522 },
    'tokyo': { lat: 35.6762, lng: 139.6503 },
    'singapore': { lat: 1.3521, lng: 103.8198 },
    'sydney': { lat: -33.8688, lng: 151.2093 },
    'hong kong': { lat: 22.3193, lng: 114.1694 },
    'taipei': { lat: 25.0330, lng: 121.5654 },
    'bangkok': { lat: 13.7563, lng: 100.5018 },
    'seoul': { lat: 37.5665, lng: 126.9780 },
    'osaka': { lat: 34.6937, lng: 135.5023 },
    'kyoto': { lat: 35.0116, lng: 135.7681 },
    'milan': { lat: 45.4642, lng: 9.1900 },
    'madrid': { lat: 40.4168, lng: -3.7038 },
    'barcelona': { lat: 41.3851, lng: 2.1734 },
    'vienna': { lat: 48.2082, lng: 16.3738 },
    'zurich': { lat: 47.3769, lng: 8.5417 },
  };

  const cityLower = city.toLowerCase();
  return cityCenters[cityLower] || null;
}

/**
 * Comprehensive enrichment for a single destination
 */
async function enrichDestinationComplete(dest: any): Promise<{ slug: string; ok: boolean; error?: string; updates: string[] }> {
  const updates: string[] = [];
  
  try {
    if (!dest.latitude || !dest.longitude) {
      return { slug: dest.slug, ok: false, error: 'Missing coordinates', updates: [] };
    }

    const lat = dest.latitude;
    const lng = dest.longitude;
    const placeId = dest.google_place_id;

    // 1. Google Places Photos
    if (placeId) {
      try {
        console.log(`  📸 Fetching photos...`);
        const photos = await processPlacePhotos(placeId, 10);
        if (photos.length > 0) {
          updates.push('photos');
          await new Promise(r => setTimeout(r, 200)); // Rate limiting
        }
      } catch (error: any) {
        console.warn(`    ⚠️  Photos error: ${error.message}`);
      }
    }

    // 2. Weather Data
    try {
      console.log(`  🌤️  Fetching weather...`);
      const weather = await fetchWeather(lat, lng);
      if (weather) {
        updates.push('weather');
      }
    } catch (error: any) {
      console.warn(`    ⚠️  Weather error: ${error.message}`);
    }

    // 3. Nearby Events
    try {
      console.log(`  🎭 Fetching events...`);
      const events = await fetchNearbyEvents(lat, lng, 5, 10);
      if (events.length > 0) {
        updates.push('events');
      }
    } catch (error: any) {
      console.warn(`    ⚠️  Events error: ${error.message}`);
    }

    // 4. Route from City Center
    const cityCenter = getCityCenter(dest.city);
    if (cityCenter) {
      try {
        console.log(`  🗺️  Calculating route...`);
        const route = await calculateRouteFromCityCenter(
          { lat, lng },
          cityCenter,
          'walking'
        );
        if (route) {
          updates.push('route');
        }
        await new Promise(r => setTimeout(r, 200)); // Rate limiting
      } catch (error: any) {
        console.warn(`    ⚠️  Route error: ${error.message}`);
      }
    }

    // 5. Static Map
    try {
      console.log(`  🗺️  Generating static map...`);
      const mapUrl = generateDestinationMap({ lat, lng, name: dest.name });
      updates.push('static_map');
    } catch (error: any) {
      console.warn(`    ⚠️  Static map error: ${error.message}`);
    }

    // 6. Currency
    try {
      console.log(`  💰 Determining currency...`);
      const currencyCode = getCurrencyCodeForCity(dest.city);
      if (currencyCode && currencyCode !== 'USD') {
        const exchangeRate = await getExchangeRate(currencyCode, 'USD');
        if (exchangeRate) {
          updates.push('currency');
        }
      }
    } catch (error: any) {
      console.warn(`    ⚠️  Currency error: ${error.message}`);
    }

    // Build update object
    const updateData: any = {
      advanced_enrichment_at: new Date().toISOString(),
      enrichment_version: 1,
    };

    // Add each enrichment if available
    if (placeId) {
      try {
        const photos = await processPlacePhotos(placeId, 10);
        if (photos.length > 0) {
          updateData.photos_json = JSON.stringify(photos);
          updateData.primary_photo_url = photos[0]?.url || null;
          updateData.photo_count = photos.length;
        }
      } catch (e) {}
    }

    const weather = await fetchWeather(lat, lng);
    if (weather) {
      updateData.current_weather_json = JSON.stringify(weather.current);
      updateData.weather_forecast_json = JSON.stringify(weather.forecast);
      updateData.weather_updated_at = new Date().toISOString();
      updateData.best_visit_months = weather.bestMonths;
    }

    const events = await fetchNearbyEvents(lat, lng, 5, 10);
    if (events.length > 0) {
      updateData.nearby_events_json = JSON.stringify(events);
      updateData.events_updated_at = new Date().toISOString();
      updateData.upcoming_event_count = events.length;
    }

    if (cityCenter) {
      const route = await calculateRouteFromCityCenter(
        { lat, lng },
        cityCenter,
        'walking'
      );
      if (route) {
        updateData.route_from_city_center_json = JSON.stringify(route);
        updateData.walking_time_from_center_minutes = Math.round(route.durationSeconds / 60);
        updateData.distance_from_center_meters = route.distanceMeters;
      }
    }

    const mapUrl = generateDestinationMap({ lat, lng, name: dest.name });
    updateData.static_map_url = mapUrl;
    updateData.static_map_generated_at = new Date().toISOString();

    const currencyCode = getCurrencyCodeForCity(dest.city);
    if (currencyCode) {
      updateData.currency_code = currencyCode;
      if (currencyCode !== 'USD') {
        const exchangeRate = await getExchangeRate(currencyCode, 'USD');
        if (exchangeRate) {
          updateData.exchange_rate_to_usd = exchangeRate;
          updateData.currency_updated_at = new Date().toISOString();
        }
      }
    }

    // Update database
    // Filter out columns that might not exist yet (graceful degradation)
    const { error: updateError } = await supabase
      .from('destinations')
      .update(updateData)
      .eq('slug', dest.slug);

    if (updateError) {
      // If error is about missing columns, try with only basic fields
      if (updateError.message?.includes('column') || updateError.message?.includes('does not exist')) {
        console.warn(`    ⚠️  Some columns missing - migration may need to be run first`);
        // Try updating with only fields that definitely exist
        const basicUpdate: any = {
          static_map_url: updateData.static_map_url,
          currency_code: updateData.currency_code,
        };
        const { error: basicError } = await supabase
          .from('destinations')
          .update(basicUpdate)
          .eq('slug', dest.slug);
        
        if (basicError) {
          return { slug: dest.slug, ok: false, error: `Migration needed: ${updateError.message}`, updates };
        } else {
          return { slug: dest.slug, ok: true, updates: updates.filter(u => ['static_map', 'currency'].includes(u)) };
        }
      }
      return { slug: dest.slug, ok: false, error: updateError.message, updates };
    }

    return { slug: dest.slug, ok: true, updates };
  } catch (error: any) {
    return { slug: dest.slug, ok: false, error: error.message, updates };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const limit = args[0] ? parseInt(args[0]) : undefined;
  const offset = args[1] ? parseInt(args[1]) : 0;

  console.log('🚀 Comprehensive Enrichment Script\n');
  console.log('This will fetch:');
  console.log('  ✅ Google Places Photos');
  console.log('  ✅ Weather Data (Open-Meteo)');
  console.log('  ✅ Nearby Events (Eventbrite)');
  console.log('  ✅ Routes from City Center');
  console.log('  ✅ Static Map Images');
  console.log('  ✅ Currency Exchange Rates\n');

  // Get total count
  const { count: totalDestinations, error: countError } = await supabase
    .from('destinations')
    .select('*', { count: 'exact', head: true })
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (countError) {
    console.error('❌ Error fetching total count:', countError.message);
    process.exit(1);
  }

  const destinationsToProcess = limit ? Math.min(limit, totalDestinations! - offset) : (totalDestinations! - offset);
  console.log(`📊 Found ${destinationsToProcess} destinations to process\n`);

  let processedCount = 0;
  let successCount = 0;
  let failedCount = 0;
  const results: any[] = [];

  while (processedCount < destinationsToProcess) {
    const { data: destinations, error: fetchError } = await supabase
      .from('destinations')
      .select('slug,name,city,google_place_id,latitude,longitude')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('slug', { ascending: true })
      .range(offset + processedCount, offset + processedCount + Math.min(10, destinationsToProcess - processedCount) - 1);

    if (fetchError) {
      console.error('❌ Error fetching destinations:', fetchError.message);
      break;
    }

    if (!destinations || destinations.length === 0) {
      console.log('No more destinations to process.');
      break;
    }

    for (const dest of destinations) {
      process.stdout.write(`[${processedCount + 1}/${destinationsToProcess}] ${dest.slug}...\r`);
      
      const result = await enrichDestinationComplete(dest);
      results.push(result);

      if (result.ok) {
        successCount++;
        process.stdout.write(`[${processedCount + 1}/${destinationsToProcess}] ✅ ${dest.slug} (${result.updates.join(', ')})\n`);
      } else {
        failedCount++;
        console.error(`  ❌ ${dest.slug}: ${result.error}`);
      }

      processedCount++;
      
      // Rate limiting between destinations
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('\n✅ Complete!');
  console.log(`📊 Processed: ${processedCount}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failedCount}`);
}

main().catch(console.error);

