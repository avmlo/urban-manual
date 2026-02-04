/**
 * Fetch ALL Google Places API data for all destinations
 * Usage: npm run enrich:all-places-data
 * 
 * This script:
 * 1. Fetches all destinations from the database
 * 2. For each destination, fetches complete Google Places API data
 * 3. Updates the database with all available fields
 * 4. Handles rate limiting and errors gracefully
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

if (!GOOGLE_API_KEY) {
  console.error('❌ Missing GOOGLE_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// All available fields (will be filtered automatically)
const ALL_PLACE_FIELDS = [
  'displayName',
  'formattedAddress',
  'id',
  'shortFormattedAddress',
  'adrFormatAddress',
  'location',
  'plusCode',
  'viewport',
  'internationalPhoneNumber',
  'nationalPhoneNumber',
  'websiteUri',
  'googleMapsUri',
  'regularOpeningHours',
  'currentOpeningHours',
  'rating',
  'userRatingCount',
  'reviews',
  'businessStatus',
  'priceLevel',
  'types',
  'primaryType',
  'primaryTypeDisplayName',
  'editorialSummary',
  'photos',
  'servesBreakfast',
  'servesLunch',
  'servesDinner',
  'servesBrunch',
  'servesBeer',
  'servesWine',
  'servesVegetarianFood',
  'takeout',
  'delivery',
  'dineIn',
  'reservable',
  'curbsidePickup',
  'paymentOptions',
  'parkingOptions',
  'menuForChildren',
  'servesCocktails',
  'servesDessert',
  'servesCoffee',
  'goodForChildren',
  'allowsDogs',
  'restroom',
  'liveMusic',
  'outdoorSeating',
  'subDestinations',
  'iconMaskBaseUri',
  'iconBackgroundColor',
  'addressComponents',
  'accessibilityOptions',
];

async function findPlaceId(query: string, name?: string, city?: string): Promise<string | null> {
  const searchQueries = [];
  
  // Strategy 1: Try exact query first
  searchQueries.push(query);
  
  // Strategy 2: Try name + city
  if (name && city && `${name} ${city}` !== query) {
    searchQueries.push(`${name} ${city}`);
    searchQueries.push(name);
    
    // Strategy 3: Try with cleaned name
    const cleanedName = name
      .replace(/^(the|a|an)\s+/i, '')
      .replace(/\s+(hotel|restaurant|cafe|bar|shop|store|mall|plaza|center|centre)$/i, '')
      .trim();
    
    if (cleanedName !== name) {
      searchQueries.push(`${cleanedName} ${city}`);
    }
  }

  // Try each search query
  for (const searchQuery of searchQueries) {
    try {
      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY!,
          'X-Goog-FieldMask': 'places.id',
        },
        body: JSON.stringify({
          textQuery: searchQuery,
          maxResultCount: 1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.places && data.places.length > 0 && data.places[0].id) {
          return data.places[0].id;
        }
      }
    } catch (error) {
      console.error(`Error searching for "${searchQuery}":`, error);
      continue;
    }
  }
  
  return null;
}

async function fetchAllPlaceData(placeId: string, fieldsToTry = ALL_PLACE_FIELDS): Promise<any> {
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY!,
        'X-Goog-FieldMask': fieldsToTry.join(','),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson: any;
      
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        return null;
      }
      
      // If field error, remove invalid field and retry
      if (errorJson.error?.details?.[0]?.fieldViolations) {
        const violation = errorJson.error.details[0].fieldViolations[0];
        const invalidFieldMatch = violation.description?.match(/Cannot find matching fields for path '(.+?)'/);
        
        if (invalidFieldMatch) {
          const invalidField = invalidFieldMatch[1];
          const filteredFields = fieldsToTry.filter(f => f !== invalidField);
          
          if (filteredFields.length === 0) {
            return null;
          }
          
          return await fetchAllPlaceData(placeId, filteredFields);
        }
      }
      
      return null;
    }

    const place = await response.json();
    return place;
  } catch (error: any) {
    return null;
  }
}

function priceLevelToNumber(priceLevel: string): number | null {
  const mapping: Record<string, number | null> = {
    'PRICE_LEVEL_FREE': null, // Free places should be NULL (constraint allows 1-4 or NULL)
    'PRICE_LEVEL_INEXPENSIVE': 1,
    'PRICE_LEVEL_MODERATE': 2,
    'PRICE_LEVEL_EXPENSIVE': 3,
    'PRICE_LEVEL_VERY_EXPENSIVE': 4,
  };
  return mapping[priceLevel] ?? null;
}

function transformOpeningHours(hours: any): any {
  if (!hours) return null;
  return {
    open_now: hours.openNow || false,
    weekday_text: hours.weekdayDescriptions || [],
    periods: hours.periods || [],
  };
}

async function getTimeZone(lat: number, lng: number): Promise<string | null> {
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/timezone/json');
    url.searchParams.set('location', `${lat},${lng}`);
    url.searchParams.set('timestamp', Math.floor(Date.now() / 1000).toString());
    url.searchParams.set('key', GOOGLE_API_KEY!);
    const r = await fetch(url.toString());
    const j = await r.json();
    return j?.timeZoneId || null;
  } catch {
    return null;
  }
}

async function enrichDestination(dest: any) {
  const query = `${dest.name} ${dest.city}`;
  let placeId = dest.google_place_id as string | null;
  
  // Find place ID if not already stored
  if (!placeId) {
    placeId = await findPlaceId(query, dest.name, dest.city);
    if (!placeId) {
      return { slug: dest.slug, ok: false, reason: 'no_place_id' };
    }
  }
  
  // Fetch all place data
  const placeData = await fetchAllPlaceData(placeId);
  if (!placeData) {
    return { slug: dest.slug, ok: false, reason: 'no_data' };
  }
  
  // Extract data
  const lat = placeData.location?.latitude;
  const lng = placeData.location?.longitude;
  const timezoneId = (lat != null && lng != null) ? await getTimeZone(lat, lng) : null;
  
  // Transform reviews
  const reviews = Array.isArray(placeData.reviews) ? placeData.reviews.slice(0, 5).map((r: any) => ({
    author_name: r.authorAttribution?.displayName || '',
    rating: r.rating || null,
    text: r.text?.text || '',
    time: r.publishTime ? new Date(r.publishTime).getTime() / 1000 : null,
    relative_time_description: r.relativePublishTimeDescription || '',
  })) : [];
  
  // Build update object
  const update: any = {
    google_place_id: placeId,
    formatted_address: placeData.formattedAddress || null,
    international_phone_number: placeData.internationalPhoneNumber || null,
    website: placeData.websiteUri || null,
    price_level: placeData.priceLevel ? priceLevelToNumber(placeData.priceLevel) : null,
    rating: placeData.rating ?? null,
    user_ratings_total: placeData.userRatingCount ?? null,
    opening_hours_json: placeData.regularOpeningHours ? JSON.stringify(transformOpeningHours(placeData.regularOpeningHours)) : null,
    plus_code: placeData.plusCode?.globalCode || null,
    latitude: lat ?? null,
    longitude: lng ?? null,
    timezone_id: timezoneId,
    reviews_json: reviews.length ? JSON.stringify(reviews) : null,
    business_status: placeData.businessStatus || null,
    editorial_summary: placeData.editorialSummary?.overview || null,
    google_name: placeData.displayName?.text || null,
    place_types_json: placeData.types ? JSON.stringify(placeData.types) : null,
    vicinity: placeData.shortFormattedAddress || null,
    adr_address: placeData.adrFormatAddress || null,
    address_components_json: placeData.addressComponents ? JSON.stringify(placeData.addressComponents) : null,
    icon_url: placeData.iconMaskBaseUri || null,
    icon_background_color: placeData.iconBackgroundColor || null,
    icon_mask_base_uri: placeData.iconMaskBaseUri || null,
    google_maps_uri: placeData.googleMapsUri || null,
  };
  
  // Build update object with fields that definitely exist (from 2025_10_31 migration)
  const baseUpdate: any = {
    google_place_id: placeId,
    formatted_address: placeData.formattedAddress || null,
    international_phone_number: placeData.internationalPhoneNumber || null,
    website: placeData.websiteUri || null,
    price_level: placeData.priceLevel ? priceLevelToNumber(placeData.priceLevel) : null,
    rating: placeData.rating ?? null,
    user_ratings_total: placeData.userRatingCount ?? null,
    opening_hours_json: placeData.regularOpeningHours ? JSON.stringify(transformOpeningHours(placeData.regularOpeningHours)) : null,
    plus_code: placeData.plusCode?.globalCode || null,
    latitude: lat ?? null,
    longitude: lng ?? null,
    timezone_id: timezoneId,
    reviews_json: reviews.length ? JSON.stringify(reviews) : null,
  };
  
  // Extended fields (from 2025_01_02 migration - may not exist)
  const extendedFields: any = {
    business_status: placeData.businessStatus || null,
    editorial_summary: placeData.editorialSummary?.overview || null,
    google_name: placeData.displayName?.text || null,
    place_types_json: placeData.types ? JSON.stringify(placeData.types) : null,
    vicinity: placeData.shortFormattedAddress || null,
    current_opening_hours_json: placeData.currentOpeningHours ? JSON.stringify(transformOpeningHours(placeData.currentOpeningHours)) : null,
    icon_url: placeData.iconMaskBaseUri || null,
    icon_background_color: placeData.iconBackgroundColor || null,
    icon_mask_base_uri: placeData.iconMaskBaseUri || null,
  };
  
  // Try updating with extended fields first
  const { error: upErr } = await supabase
    .from('destinations')
    .update({ ...baseUpdate, ...extendedFields } as any)
    .eq('slug', dest.slug);
  
  if (upErr && upErr.message?.includes('column')) {
    // If extended columns don't exist, try with just base fields
    const { error: basicErr } = await supabase
      .from('destinations')
      .update(baseUpdate as any)
      .eq('slug', dest.slug);
    
    if (basicErr) {
      return { slug: dest.slug, ok: false, error: basicErr.message, reason: 'update_failed' };
    } else {
      return { slug: dest.slug, ok: true, note: 'enriched_with_basic_fields_only' };
    }
  } else if (upErr) {
    return { slug: dest.slug, ok: false, error: upErr.message, reason: 'update_failed' };
  } else {
    return { slug: dest.slug, ok: true };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const limit = args[0] ? parseInt(args[0]) : undefined;
  const offset = args[1] ? parseInt(args[1]) : 0;
  
  console.log('🔍 Fetching ALL Google Places API data for destinations\n');
  
  // Fetch destinations
  let query = supabase
    .from('destinations')
    .select('slug,name,city,google_place_id')
    .order('slug', { ascending: true });
  
  if (limit) {
    query = query.range(offset, offset + limit - 1);
  }
  
  const { data: destinations, error } = await query;
  
  if (error) {
    console.error('❌ Error fetching destinations:', error);
    process.exit(1);
  }
  
  if (!destinations || destinations.length === 0) {
    console.log('✅ No destinations to process');
    process.exit(0);
  }
  
  console.log(`📊 Found ${destinations.length} destinations to process\n`);
  console.log(`⏱️  Estimated time: ${Math.ceil(destinations.length * 2 / 60)} minutes (2 seconds per destination)`);
  console.log(`💰 Estimated API cost: ~$${(destinations.length * 0.017).toFixed(2)} (17¢ per place)\n`);
  
  const results: any[] = [];
  let processed = 0;
  let success = 0;
  let failed = 0;
  
  for (const dest of destinations) {
    processed++;
    process.stdout.write(`\r[${processed}/${destinations.length}] Processing ${dest.slug}...`);
    
    try {
      const result = await enrichDestination(dest);
      results.push(result);
      
      if (result.ok) {
        success++;
      } else {
        failed++;
        console.log(`\n  ❌ ${dest.slug}: ${result.reason}${result.error ? ` - ${result.error}` : ''}`);
      }
      
      // Rate limiting: 2 seconds between requests (30 requests/minute)
      if (processed < destinations.length) {
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (error: any) {
      failed++;
      results.push({ slug: dest.slug, ok: false, reason: 'error', error: error.message });
      console.log(`\n  ❌ ${dest.slug}: ${error.message}`);
    }
    
    // Progress update every 10 destinations
    if (processed % 10 === 0) {
      process.stdout.write(`\r[${processed}/${destinations.length}] ✅ ${success} success | ❌ ${failed} failed`);
    }
  }
  
  console.log(`\n\n✅ Complete!`);
  console.log(`📊 Processed: ${processed}`);
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`\n💾 Results saved to: enrichment-results.json`);
  
  // Save results
  const fs = await import('fs');
  fs.writeFileSync('enrichment-results.json', JSON.stringify({ 
    total: processed,
    success,
    failed,
    results 
  }, null, 2));
}

main().catch(console.error);

