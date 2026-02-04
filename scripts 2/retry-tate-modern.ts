/**
 * Retry enrichment for tate-modern specifically
 * Usage: npm run retry:tate-modern
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

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

const ALL_PLACE_FIELDS = [
  'displayName', 'formattedAddress', 'id', 'shortFormattedAddress', 'adrFormatAddress',
  'location', 'plusCode', 'viewport',
  'internationalPhoneNumber', 'nationalPhoneNumber', 'websiteUri', 'googleMapsUri',
  'regularOpeningHours', 'currentOpeningHours',
  'rating', 'userRatingCount', 'reviews',
  'businessStatus', 'priceLevel', 'types', 'primaryType', 'primaryTypeDisplayName',
  'editorialSummary', 'photos',
  'wheelchairAccessibleEntrance', 'wheelchairAccessibleParking', 'wheelchairAccessibleRestroom', 'wheelchairAccessibleSeating',
  'reservable', 'servesBreakfast', 'servesLunch', 'servesDinner', 'servesBrunch', 'servesBeer', 'servesWine', 'servesVegetarianFood',
  'takeout', 'delivery', 'dineIn', 'menuForChildren', 'servesCocktails', 'servesDessert', 'servesCoffee',
  'goodForChildren', 'allowsDogs', 'restroom', 'liveMusic', 'outdoorSeating',
  'paymentOptions', 'curbsidePickup', 'parkingOptions',
  'subDestinations',
  'utcOffset', 'iconMaskBaseUri', 'iconBackgroundColor',
  'addressComponents', 'accessibilityOptions',
];

async function findPlaceId(query: string): Promise<string | null> {
  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY!,
        'X-Goog-FieldMask': 'places.id,places.displayName',
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Search error ${response.status} for "${query}":`, errorText);
      return null;
    }

    const data = await response.json();
    return data.places?.[0]?.id || null;
  } catch (error: any) {
    console.error(`❌ Error finding place ID for "${query}":`, error.message);
    return null;
  }
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
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      
      if (errorJson.error?.details?.[0]?.fieldViolations) {
        const violation = errorJson.error.details[0].fieldViolations[0];
        const invalidFieldMatch = violation.description?.match(/Cannot find matching fields for path '(.+?)'/);
        
        if (invalidFieldMatch) {
          const invalidField = invalidFieldMatch[1];
          const filteredFields = fieldsToTry.filter(f => f !== invalidField);
          
          if (filteredFields.length === 0) {
            throw new Error('No valid fields remaining after filtering');
          }
          
          return await fetchAllPlaceData(placeId, filteredFields);
        }
      }
      throw new Error(`API Error ${response.status}: ${errorJson.error?.message || errorText}`);
    }

    return await response.json();
  } catch (error: any) {
    throw new Error(`Error fetching place data for ${placeId}: ${error.message}`);
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
  return {
    open_now: hours.openNow || false,
    weekday_text: hours.weekdayDescriptions || [],
    periods: hours.periods || [],
  };
}

async function getTimeZone(lat: number, lng: number) {
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/timezone/json');
    url.searchParams.set('location', `${lat},${lng}`);
    url.searchParams.set('timestamp', Math.floor(Date.now() / 1000).toString());
    url.searchParams.set('key', GOOGLE_API_KEY!);
    const r = await fetch(url.toString());
    const j = await r.json();
    return j?.timeZoneId || null;
  } catch (error: any) {
    console.error('❌ Error fetching timezone:', error.message);
    return null;
  }
}

async function main() {
  console.log('🔍 Retrying enrichment for tate-modern...\n');

  // Fetch tate-modern destination
  const { data: dest, error: fetchError } = await supabase
    .from('destinations')
    .select('slug,name,city,google_place_id')
    .eq('slug', 'tate-modern')
    .single();

  if (fetchError || !dest) {
    console.error('❌ Error fetching tate-modern:', fetchError?.message || 'Not found');
    process.exit(1);
  }

  console.log(`📍 Found: ${dest.name} (${dest.city})\n`);

  const query = `${dest.name} ${dest.city}`;
  let placeId = dest.google_place_id as string | null;

  if (!placeId) {
    console.log('🔍 Finding Google Place ID...');
    placeId = await findPlaceId(query);
    await new Promise(r => setTimeout(r, 200));
  }

  if (!placeId) {
    console.error('❌ Could not find Google Place ID');
    process.exit(1);
  }

  console.log(`✅ Place ID: ${placeId}\n`);

  let placeData: any;
  try {
    console.log('📥 Fetching place details...');
    placeData = await fetchAllPlaceData(placeId);
    await new Promise(r => setTimeout(r, 200));
  } catch (error: any) {
    console.error('❌ Error fetching place data:', error.message);
    process.exit(1);
  }

  if (!placeData) {
    console.error('❌ No place details returned');
    process.exit(1);
  }

  console.log(`✅ Fetched ${Object.keys(placeData).length} fields\n`);

  const lat = placeData.location?.latitude;
  const lng = placeData.location?.longitude;
  const timezoneId = (lat != null && lng != null) ? await getTimeZone(lat, lng) : null;
  await new Promise(r => setTimeout(r, 100));

  const reviews = Array.isArray(placeData.reviews) ? placeData.reviews.slice(0, 5).map((r: any) => ({
    author_name: r.authorDisplayName || '',
    rating: r.rating || null,
    text: r.text?.text || '',
    time: r.publishTime ? new Date(r.publishTime).getTime() / 1000 : null,
  })) : [];

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

  console.log(`💰 Price Level: ${placeData.priceLevel} → ${baseUpdate.price_level} (${baseUpdate.price_level === null ? 'NULL (free)' : 'valid'})`);
  console.log(`📊 Rating: ${baseUpdate.rating}`);
  console.log(`📍 Location: ${lat}, ${lng}\n`);

  console.log('💾 Updating database...');
  
  const { error: upErr } = await supabase
    .from('destinations')
    .update({ ...baseUpdate, ...extendedFields } as any)
    .eq('slug', dest.slug);

  if (upErr && upErr.message?.includes('column')) {
    const { error: basicErr } = await supabase
      .from('destinations')
      .update(baseUpdate as any)
      .eq('slug', dest.slug);
    
    if (basicErr) {
      console.error('❌ Update failed:', basicErr.message);
      process.exit(1);
    } else {
      console.log('✅ Updated with basic fields only');
    }
  } else if (upErr) {
    console.error('❌ Update failed:', upErr.message);
    process.exit(1);
  } else {
    console.log('✅ Successfully updated tate-modern!');
  }
}

main().catch(console.error);

