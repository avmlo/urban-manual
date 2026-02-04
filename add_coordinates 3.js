/**
 * Add Geocoding Coordinates to Destinations
 * 
 * This script adds lat/long coordinates to all destinations using:
 * 1. Free geocoding API (Nominatim - OpenStreetMap)
 * 2. Batch processing with rate limiting
 * 3. Caching to avoid re-geocoding
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DESTINATIONS_FILE = path.join(__dirname, 'public', 'destinations.json');
const CACHE_FILE = path.join(__dirname, 'geocoding_cache.json');
const DELAY_MS = 1000; // 1 second delay between requests (Nominatim rate limit)

// City coordinates fallback (for when geocoding fails)
const CITY_COORDINATES = {
  'taipei': { lat: 25.0330, long: 121.5654 },
  'taichung': { lat: 24.1477, long: 120.6736 },
  'tainan': { lat: 22.9997, long: 120.2270 },
  'kaohsiung': { lat: 22.6273, long: 120.3014 },
  'tokyo': { lat: 35.6762, long: 139.6503 },
  'osaka': { lat: 34.6937, long: 135.5023 },
  'kyoto': { lat: 35.0116, long: 135.7681 },
  'kobe': { lat: 34.6901, long: 135.1955 },
  'nara': { lat: 34.6851, long: 135.8048 },
  'hiroshima': { lat: 34.3853, long: 132.4553 },
  'new york': { lat: 40.7128, long: -74.0060 },
  'los angeles': { lat: 34.0522, long: -118.2437 },
  'chicago': { lat: 41.8781, long: -87.6298 },
  'miami': { lat: 25.7617, long: -80.1918 },
  'washington dc': { lat: 38.9072, long: -77.0369 },
  'london': { lat: 51.5074, long: -0.1278 },
  'paris': { lat: 48.8566, long: 2.3522 },
  'milan': { lat: 45.4642, long: 9.1900 },
  'rome': { lat: 41.9028, long: 12.4964 },
  'venice': { lat: 45.4408, long: 12.3155 },
  'singapore': { lat: 1.3521, long: 103.8198 },
  'hong kong': { lat: 22.3193, long: 114.1694 },
  'bangkok': { lat: 13.7563, long: 100.5018 },
  'saigon': { lat: 10.8231, long: 106.6297 },
  'sydney': { lat: -33.8688, long: 151.2093 },
  'melbourne': { lat: -37.8136, long: 144.9631 },
  'hawaii': { lat: 21.3099, long: -157.8581 },
  'colorado': { lat: 39.5501, long: -105.7821 },
  'lisbon': { lat: 38.7223, long: -9.1393 },
  'provence alpes côte d azur': { lat: 43.9352, long: 6.0679 },
};

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

// Sleep function for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Geocode using Nominatim (OpenStreetMap) - FREE
async function geocodeAddress(name, city) {
  const query = `${name}, ${city}`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'UrbanManual/1.0 (travel guide app)',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        long: parseFloat(data[0].lon),
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error geocoding ${query}:`, error.message);
    return null;
  }
}

// Get coordinates with fallback to city center
async function getCoordinates(destination, cache) {
  const cacheKey = `${destination.name}|${destination.city}`;
  
  // Check cache first
  if (cache[cacheKey]) {
    console.log(`✓ Using cached coordinates for: ${destination.name}`);
    return cache[cacheKey];
  }
  
  // Try geocoding the specific location
  console.log(`🔍 Geocoding: ${destination.name} in ${destination.city}...`);
  const coords = await geocodeAddress(destination.name, destination.city);
  
  if (coords && coords.lat !== 0 && coords.long !== 0) {
    console.log(`✓ Found coordinates: ${coords.lat}, ${coords.long}`);
    cache[cacheKey] = coords;
    saveCache(cache);
    return coords;
  }
  
  // Fallback to city center
  const cityKey = destination.city.toLowerCase();
  if (CITY_COORDINATES[cityKey]) {
    console.log(`⚠ Using city center for: ${destination.name}`);
    const cityCoords = CITY_COORDINATES[cityKey];
    cache[cacheKey] = cityCoords;
    saveCache(cache);
    return cityCoords;
  }
  
  // Last resort: try geocoding just the city
  console.log(`🔍 Geocoding city: ${destination.city}...`);
  const cityCoords = await geocodeAddress('', destination.city);
  if (cityCoords && cityCoords.lat !== 0 && cityCoords.long !== 0) {
    console.log(`✓ Found city coordinates: ${cityCoords.lat}, ${cityCoords.long}`);
    cache[cacheKey] = cityCoords;
    saveCache(cache);
    return cityCoords;
  }
  
  console.log(`❌ Could not find coordinates for: ${destination.name}`);
  return { lat: 0, long: 0 };
}

async function main() {
  console.log('🚀 Starting geocoding process...\n');
  
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
  
  // Process each destination
  let processed = 0;
  let updated = 0;
  
  for (const destination of destinations) {
    if (destination.lat === 0 && destination.long === 0) {
      const coords = await getCoordinates(destination, cache);
      destination.lat = coords.lat;
      destination.long = coords.long;
      
      if (coords.lat !== 0 && coords.long !== 0) {
        updated++;
      }
      
      processed++;
      console.log(`Progress: ${processed}/${needsCoords.length} (${updated} updated)\n`);
      
      // Rate limiting - wait 1 second between requests
      if (processed < needsCoords.length) {
        await sleep(DELAY_MS);
      }
    }
  }
  
  // Save updated destinations
  const backupFile = DESTINATIONS_FILE.replace('.json', '_backup.json');
  fs.copyFileSync(DESTINATIONS_FILE, backupFile);
  console.log(`\n💾 Backup saved to: ${backupFile}`);
  
  fs.writeFileSync(DESTINATIONS_FILE, JSON.stringify(destinations, null, 2));
  console.log(`✅ Updated destinations saved to: ${DESTINATIONS_FILE}`);
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total destinations: ${destinations.length}`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed: ${processed - updated}`);
  console.log(`   Cached: ${Object.keys(cache).length}`);
  
  console.log('\n✨ Done! Local Mode should now work correctly.');
}

main().catch(console.error);

