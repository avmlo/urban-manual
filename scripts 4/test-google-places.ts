/**
 * Test Google Places API locally
 * Usage: npm run test-google-places
 * 
 * This script tests the Google Places API (New) endpoints:
 * 1. Text Search
 * 2. Place Details
 * 3. Autocomplete (if implemented)
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables FIRST
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  console.error('❌ GOOGLE_API_KEY or NEXT_PUBLIC_GOOGLE_API_KEY not found in .env.local');
  console.error('Please add your Google API key to .env.local');
  console.error('Get your key from: https://console.cloud.google.com/apis/credentials');
  process.exit(1);
}

console.log('🔍 Testing Google Places API (New)...\n');
console.log('API Key: [REDACTED]');

// Test 1: Text Search
async function testTextSearch() {
  console.log('\n📍 Test 1: Text Search');
  console.log('Searching for: "Le Meurice, Paris"');
  
  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY!,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.priceLevel,places.formattedAddress',
      },
      body: JSON.stringify({
        textQuery: 'Le Meurice, Paris',
        maxResultCount: 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error ${response.status}:`, errorText);
      return false;
    }

    const data = await response.json();
    
    if (data.places && data.places.length > 0) {
      const place = data.places[0];
      console.log('✅ Found place:');
      console.log(`   Name: ${place.displayName?.text || 'N/A'}`);
      console.log(`   Place ID: ${place.id}`);
      console.log(`   Rating: ${place.rating || 'N/A'}`);
      console.log(`   Price Level: ${place.priceLevel || 'N/A'}`);
      console.log(`   Address: ${place.formattedAddress || 'N/A'}`);
      return { placeId: place.id };
    } else {
      console.log('⚠️  No places found');
      return null;
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Test 2: Place Details
async function testPlaceDetails(placeId: string) {
  console.log('\n📍 Test 2: Place Details');
  console.log(`Fetching details for Place ID: ${placeId}`);
  
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY!,
        'X-Goog-FieldMask': [
          'displayName',
          'formattedAddress',
          'internationalPhoneNumber',
          'websiteUri',
          'priceLevel',
          'rating',
          'userRatingCount',
          'regularOpeningHours',
          'types',
          'location',
        ].join(','),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error ${response.status}:`, errorText);
      return false;
    }

    const place = await response.json();
    console.log('✅ Place details:');
    console.log(`   Name: ${place.displayName?.text || 'N/A'}`);
    console.log(`   Address: ${place.formattedAddress || 'N/A'}`);
    console.log(`   Phone: ${place.internationalPhoneNumber || 'N/A'}`);
    console.log(`   Website: ${place.websiteUri || 'N/A'}`);
    console.log(`   Rating: ${place.rating || 'N/A'} (${place.userRatingCount || 0} reviews)`);
    console.log(`   Price Level: ${place.priceLevel || 'N/A'}`);
    console.log(`   Types: ${(place.types || []).slice(0, 5).join(', ')}`);
    if (place.location) {
      console.log(`   Location: ${place.location.latitude}, ${place.location.longitude}`);
    }
    if (place.regularOpeningHours) {
      console.log(`   Opening Hours: ${place.regularOpeningHours.weekdayDescriptions?.length || 0} days`);
    }
    return true;
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Test 3: Autocomplete
async function testAutocomplete() {
  console.log('\n📍 Test 3: Autocomplete');
  console.log('Searching for: "Le Meurice"');
  
  try {
    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY!,
      },
      body: JSON.stringify({
        input: 'Le Meurice',
        languageCode: 'en',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error ${response.status}:`, errorText);
      return false;
    }

    const data = await response.json();
    
    if (data.suggestions && data.suggestions.length > 0) {
      console.log(`✅ Found ${data.suggestions.length} suggestions:`);
      data.suggestions.slice(0, 5).forEach((suggestion: any, index: number) => {
        console.log(`   ${index + 1}. ${suggestion.placePrediction?.text?.text || 'N/A'}`);
      });
      return true;
    } else {
      console.log('⚠️  No suggestions found');
      return false;
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  const textSearchResult = await testTextSearch();
  
  if (textSearchResult && textSearchResult.placeId) {
    await testPlaceDetails(textSearchResult.placeId);
  }
  
  await testAutocomplete();
  
  console.log('\n✅ Google Places API tests complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. If all tests passed, your API key is working correctly');
  console.log('   2. Make sure Places API (New) is enabled in Google Cloud Console');
  console.log('   3. Check billing is enabled (required for Places API)');
  console.log('   4. You can now use the enrichment endpoints in your app');
}

runTests().catch(console.error);

