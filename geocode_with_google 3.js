/**
 * Geocode Destinations using Google Places API
 * 
 * This script uses Google Places API to get accurate coordinates for all destinations.
 * Much more accurate than OpenStreetMap for businesses and landmarks.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DESTINATIONS_FILE = path.join(__dirname, 'public', 'destinations.json');
const CACHE_FILE = path.join(__dirname, 'geocoding_cache_google.json');
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE';

// Rate limiting
const DELAY_MS = 100; // Google allows more requests per second

// Load or create cache
function loadCache() {
  if (fs.existsSync(CACHE_FILE)) {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  }
  return {};
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Geocode using Google Places API
async function geocodeWithGoogle(name, city) {
  const query = `${name}, ${city}`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        long: location.lng,
        formatted_address: data.results[0].formatted_address,
        place_id: data.results[0].place_id,
      };
    }
    
    if (data.status === 'ZERO_RESULTS') {
      console.log(`   No results found for: ${query}`);
    } else if (data.status === 'OVER_QUERY_LIMIT') {
      console.error('   ⚠️  API quota exceeded! Please wait or upgrade your plan.');
      throw new Error('QUOTA_EXCEEDED');
    } else {
      console.log(`   API status: ${data.status}`);
    }
    
    return null;
  } catch (error) {
    console.error(`   Error geocoding ${query}:`, error.message);
    throw error;
  }
}

// Get coordinates with caching
async function getCoordinates(destination, cache) {
  const cacheKey = `${destination.name}|${destination.city}`;
  
  // Check cache first
  if (cache[cacheKey]) {
    console.log(`✓ Cached: ${destination.name}`);
    return cache[cacheKey];
  }
  
  // Geocode with Google
  console.log(`🔍 Geocoding: ${destination.name} in ${destination.city}...`);
  const result = await geocodeWithGoogle(destination.name, destination.city);
  
  if (result && result.lat !== 0 && result.long !== 0) {
    console.log(`   ✓ Found: ${result.lat}, ${result.long}`);
    console.log(`   📍 ${result.formatted_address}`);
    cache[cacheKey] = result;
    saveCache(cache);
    return result;
  }
  
  console.log(`   ❌ Could not find coordinates`);
  return { lat: 0, long: 0 };
}

async function main() {
  console.log('🚀 Starting Google Places geocoding...\n');
  
  // Check API key
  if (GOOGLE_API_KEY === 'YOUR_API_KEY_HERE') {
    console.error('❌ Error: Please set GOOGLE_MAPS_API_KEY environment variable');
    console.log('\nUsage:');
    console.log('  export GOOGLE_MAPS_API_KEY="your-api-key"');
    console.log('  node geocode_with_google.js');
    console.log('\nOr get an API key at: https://console.cloud.google.com/apis/credentials');
    process.exit(1);
  }
  
  // Load destinations
  const destinations = JSON.parse(fs.readFileSync(DESTINATIONS_FILE, 'utf8'));
  console.log(`📍 Found ${destinations.length} destinations\n`);
  
  // Load cache
  const cache = loadCache();
  console.log(`💾 Loaded ${Object.keys(cache).length} cached locations\n`);
  
  // Filter destinations that need coordinates
  const needsCoords = destinations.filter(d => d.lat === 0 && d.long === 0);
  console.log(`🎯 ${needsCoords.length} destinations need coordinates\n`);
  
  if (needsCoords.length === 0) {
    console.log('✅ All destinations already have coordinates!');
    return;
  }
  
  console.log('⏱️  Estimated time:', Math.ceil(needsCoords.length * DELAY_MS / 1000 / 60), 'minutes\n');
  console.log('Starting in 3 seconds... (Ctrl+C to cancel)\n');
  await sleep(3000);
  
  // Process each destination
  let processed = 0;
  let updated = 0;
  let failed = 0;
  
  for (const destination of destinations) {
    if (destination.lat === 0 && destination.long === 0) {
      try {
        const coords = await getCoordinates(destination, cache);
        destination.lat = coords.lat;
        destination.long = coords.long;
        
        if (coords.lat !== 0 && coords.long !== 0) {
          updated++;
        } else {
          failed++;
        }
        
        processed++;
        console.log(`Progress: ${processed}/${needsCoords.length} (✓ ${updated} | ✗ ${failed})\n`);
        
        // Save progress every 10 destinations
        if (processed % 10 === 0) {
          const backupFile = DESTINATIONS_FILE.replace('.json', '_progress.json');
          fs.writeFileSync(backupFile, JSON.stringify(destinations, null, 2));
          console.log(`💾 Progress saved\n`);
        }
        
        // Rate limiting
        if (processed < needsCoords.length) {
          await sleep(DELAY_MS);
        }
      } catch (error) {
        if (error.message === 'QUOTA_EXCEEDED') {
          console.error('\n❌ API quota exceeded. Saving progress and exiting...\n');
          break;
        }
        failed++;
        processed++;
      }
    }
  }
  
  // Save final results
  const backupFile = DESTINATIONS_FILE.replace('.json', '_backup.json');
  fs.copyFileSync(DESTINATIONS_FILE, backupFile);
  console.log(`\n💾 Backup saved to: ${backupFile}`);
  
  fs.writeFileSync(DESTINATIONS_FILE, JSON.stringify(destinations, null, 2));
  console.log(`✅ Updated destinations saved to: ${DESTINATIONS_FILE}`);
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total destinations: ${destinations.length}`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Cached: ${Object.keys(cache).length}`);
  
  if (updated > 0) {
    console.log('\n✨ Done! Local Mode should now work correctly.');
    console.log('\n📝 Next steps:');
    console.log('   1. Test Local Mode in your app');
    console.log('   2. Verify destinations are sorted by distance');
    console.log('   3. Check that distance badges show correct values');
  }
}

main().catch(console.error);

