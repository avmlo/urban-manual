/**
 * Fetch ALL available data from Google Places API (New)
 * Usage: npm run fetch-all-place-data
 * 
 * This script fetches every possible field from Google Places API (New)
 * and displays the complete data structure.
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables FIRST
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  console.error('❌ GOOGLE_API_KEY not found in .env.local');
  process.exit(1);
}

/**
 * ALL available fields in Google Places API (New)
 * Based on official documentation: https://developers.google.com/maps/documentation/places/web-service/place-data-fields
 */
const ALL_PLACE_FIELDS = [
  // Basic Data
  'displayName',
  'formattedAddress',
  'id',
  'shortFormattedAddress',
  'adrFormatAddress',
  
  // Location Data
  'location',
  'plusCode',
  'viewport',
  
  // Contact Data
  'internationalPhoneNumber',
  'nationalPhoneNumber',
  'websiteUri',
  'googleMapsUri',
  
  // Opening Hours
  'regularOpeningHours',
  'currentOpeningHours',
  
  // Rating & Reviews
  'rating',
  'userRatingCount',
  'reviews',
  
  // Business Info
  'businessStatus',
  'priceLevel',
  'types',
  'primaryType',
  'primaryTypeDisplayName',
  
  // Content
  'editorialSummary',
  
  // Photos
  'photos',
  
  // Accessibility
  'wheelchairAccessibleEntrance',
  'wheelchairAccessibleParking',
  'wheelchairAccessibleRestroom',
  'wheelchairAccessibleSeating',
  
  // Restaurant-Specific
  'reservable',
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
  'menuForChildren',
  'servesCocktails',
  'servesDessert',
  'servesCoffee',
  'goodForChildren',
  'allowsDogs',
  'restroom',
  'liveMusic',
  'outdoorSeating',
  
  // Payment & Service
  'paymentOptions',
  'curbsidePickup',
  'parkingOptions',
  
  // Sub Destinations
  'subDestinations',
  
  // Other
  'utcOffset',
  'iconMaskBaseUri',
  'iconBackgroundColor',
  
  // Address Components
  'addressComponents',
  
  // Place Attributes
  'accessibilityOptions',
];

// Known working fields (core fields that always work)
const CORE_FIELDS = [
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
  'utcOffset',
  'iconMaskBaseUri',
  'iconBackgroundColor',
  'addressComponents',
];

// Extended fields (may not be available for all places)
const EXTENDED_FIELDS = [
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
];

// Try fetching with all fields, but handle errors gracefully
async function fetchAllPlaceData(placeId: string, fieldsToTry = ALL_PLACE_FIELDS): Promise<any> {
  console.log(`\n🔍 Fetching data with ${fieldsToTry.length} fields...\n`);
  
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
        console.error(`❌ Error ${response.status}:`, errorText);
        return null;
      }
      
      // If field error, try to identify invalid fields
      if (errorJson.error?.details?.[0]?.fieldViolations) {
        const violation = errorJson.error.details[0].fieldViolations[0];
        const invalidFieldMatch = violation.description?.match(/Cannot find matching fields for path '(.+?)'/);
        
        if (invalidFieldMatch) {
          const invalidField = invalidFieldMatch[1];
          console.log(`⚠️  Removing invalid field: ${invalidField}`);
          
          // Remove invalid field and retry
          const filteredFields = fieldsToTry.filter(f => f !== invalidField);
          
          if (filteredFields.length === 0) {
            console.error('❌ No valid fields remaining');
            return null;
          }
          
          // Recursively retry with filtered fields
          return await fetchAllPlaceData(placeId, filteredFields);
        }
      }
      
      console.error(`❌ Error ${response.status}:`, errorText);
      return null;
    }

    const place = await response.json();
    console.log(`✅ Successfully fetched ${Object.keys(place).length} fields`);
    return place;
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

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
      console.error(`❌ Search error ${response.status}:`, errorText);
      return null;
    }

    const data = await response.json();
    
    if (data.places && data.places.length > 0) {
      return data.places[0].id;
    }
    
    return null;
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

function formatValue(value: any, depth = 0): string {
  const indent = '  '.repeat(depth);
  
  if (value === null || value === undefined) {
    return 'null';
  }
  
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    return `[\n${value.map((item, idx) => {
      const formatted = formatValue(item, depth + 1);
      return `${indent}  ${idx}: ${formatted}`;
    }).join(',\n')}\n${indent}]`;
  }
  
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return '{}';
    }
    return `{\n${keys.map(key => {
      const formatted = formatValue(value[key], depth + 1);
      return `${indent}  ${key}: ${formatted}`;
    }).join(',\n')}\n${indent}}`;
  }
  
  return String(value);
}

function displayPlaceData(place: any) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 COMPLETE PLACE DATA');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Group fields by category for better readability
  const categories: Record<string, string[]> = {
    'Basic Information': [
      'displayName',
      'id',
      'formattedAddress',
      'shortFormattedAddress',
      'adrFormatAddress',
    ],
    'Location': [
      'location',
      'plusCode',
      'viewport',
    ],
    'Contact': [
      'internationalPhoneNumber',
      'nationalPhoneNumber',
      'websiteUri',
      'googleMapsUri',
    ],
    'Opening Hours': [
      'regularOpeningHours',
      'currentOpeningHours',
      'secondaryOpeningHours',
    ],
    'Rating & Reviews': [
      'rating',
      'userRatingCount',
      'reviews',
    ],
    'Business Info': [
      'businessStatus',
      'priceLevel',
      'types',
      'primaryType',
      'primaryTypeDisplayName',
    ],
    'Content': [
      'editorialSummary',
    ],
    'Photos': [
      'photos',
    ],
    'Accessibility': [
      'wheelchairAccessibleEntrance',
      'wheelchairAccessibleParking',
      'wheelchairAccessibleRestroom',
      'wheelchairAccessibleSeating',
    ],
    'Restaurant Features': [
      'reservable',
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
      'menuForChildren',
      'servesCocktails',
      'servesDessert',
      'servesCoffee',
      'goodForChildren',
      'allowsDogs',
      'restroom',
      'liveMusic',
      'outdoorSeating',
    ],
    'Payment & Service': [
      'paymentOptions',
      'curbsidePickup',
      'parkingOptions',
    ],
    'Other': [
      'utcOffset',
      'iconMaskBaseUri',
      'iconBackgroundColor',
      'addressComponents',
      'subDestinations',
      'accessibilityOptions',
    ],
  };
  
  // Display by category
  for (const [category, fields] of Object.entries(categories)) {
    const hasData = fields.some(field => place[field] !== undefined);
    if (!hasData) continue;
    
    console.log(`\n📁 ${category.toUpperCase()}`);
    console.log('─'.repeat(60));
    
    for (const field of fields) {
      if (place[field] !== undefined) {
        const value = place[field];
        console.log(`\n  ${field}:`);
        console.log(formatValue(value, 2));
      }
    }
  }
  
  // Display all fields that weren't categorized
  console.log('\n\n📁 UNCATEGORIZED FIELDS');
  console.log('─'.repeat(60));
  const categorizedFields = new Set(Object.values(categories).flat());
  const uncategorized = Object.keys(place).filter(key => !categorizedFields.has(key));
  
  if (uncategorized.length > 0) {
    for (const field of uncategorized) {
      console.log(`\n  ${field}:`);
      console.log(formatValue(place[field], 2));
    }
  } else {
    console.log('\n  (none)');
  }
  
  // Summary
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total fields returned: ${Object.keys(place).length}`);
  console.log(`Fields with data: ${Object.keys(place).filter(k => place[k] !== undefined && place[k] !== null).length}`);
  console.log(`Fields without data: ${Object.keys(place).filter(k => place[k] === undefined || place[k] === null).length}`);
  console.log(`\nJSON output saved to: place-data-complete.json`);
}

async function main() {
  const args = process.argv.slice(2);
  let query = args[0] || 'Le Meurice, Paris';
  
  console.log('🔍 Google Places API (New) - Complete Data Fetcher\n');
  console.log(`Searching for: "${query}"\n`);
  
  // Find place ID
  const placeId = await findPlaceId(query);
  
  if (!placeId) {
    console.error('❌ Place not found');
    process.exit(1);
  }
  
  console.log(`✅ Found place ID: ${placeId}`);
  
  // Fetch all data
  const placeData = await fetchAllPlaceData(placeId);
  
  if (!placeData) {
    console.error('❌ Failed to fetch place data');
    process.exit(1);
  }
  
  // Display formatted data
  displayPlaceData(placeData);
  
  // Save to JSON file
  const fs = await import('fs');
  fs.writeFileSync('place-data-complete.json', JSON.stringify(placeData, null, 2));
  console.log('\n✅ Complete data saved to place-data-complete.json');
}

main().catch(console.error);

