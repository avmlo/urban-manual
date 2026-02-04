/**
 * Fast Geocoding with Parallel Processing
 * Uses multiple concurrent requests to speed up geocoding
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DESTINATIONS_FILE = path.join(__dirname, 'public', 'destinations.json');
const CACHE_FILE = path.join(__dirname, 'geocoding_cache.json');
const DELAY_MS = 200; // Faster delay
const CONCURRENT_REQUESTS = 5; // Process 5 at a time

// City coordinates fallback
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
  'new-york': { lat: 40.7128, long: -74.0060 },
  'los angeles': { lat: 34.0522, long: -118.2437 },
  'chicago': { lat: 41.8781, long: -87.6298 },
  'miami': { lat: 25.7617, long: -80.1918 },
  'washington dc': { lat: 38.9072, long: -77.0369 },
  'washington-dc': { lat: 38.9072, long: -77.0369 },
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
  'barcelona': { lat: 41.3851, long: 2.1734 },
  'madrid': { lat: 40.4168, long: -3.7038 },
  'amsterdam': { lat: 52.3676, long: 4.9041 },
  'berlin': { lat: 52.5200, long: 13.4050 },
  'vienna': { lat: 48.2082, long: 16.3738 },
  'prague': { lat: 50.0755, long: 14.4378 },
  'copenhagen': { lat: 55.6761, long: 12.5683 },
  'stockholm': { lat: 59.3293, long: 18.0686 },
  'dubai': { lat: 25.2048, long: 55.2708 },
  'seoul': { lat: 37.5665, long: 126.9780 },
  'shanghai': { lat: 31.2304, long: 121.4737 },
  'beijing': { lat: 39.9042, long: 116.4074 },
  'da-nang': { lat: 16.0544, long: 108.2022 },
  'hanoi': { lat: 21.0285, long: 105.8542 },
  'kuala-lumpur': { lat: 3.1390, long: 101.6869 },
  'jakarta': { lat: -6.2088, long: 106.8456 },
  'manila': { lat: 14.5995, long: 120.9842 },
};

function loadCache() {
  if (fs.existsSync(CACHE_FILE)) {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  }
  return {};
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocodeAddress(name, city) {
  const query = `${name}, ${city}`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'UrbanManual/1.0',
      },
    });
    
    if (!response.ok) {
      return null;
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
    return null;
  }
}

async function getCoordinates(destination, cache) {
  const cacheKey = `${destination.name}|${destination.city}`;
  
  // Check cache
  if (cache[cacheKey]) {
    return cache[cacheKey];
  }
  
  // Try geocoding
  const coords = await geocodeAddress(destination.name, destination.city);
  
  if (coords && coords.lat !== 0 && coords.long !== 0) {
    cache[cacheKey] = coords;
    return coords;
  }
  
  // Fallback to city center
  const cityKey = destination.city.toLowerCase();
  if (CITY_COORDINATES[cityKey]) {
    const cityCoords = CITY_COORDINATES[cityKey];
    cache[cacheKey] = cityCoords;
    return cityCoords;
  }
  
  return { lat: 0, long: 0 };
}

async function processBatch(destinations, cache, startIdx, batchSize) {
  const batch = destinations.slice(startIdx, startIdx + batchSize);
  const promises = batch.map(dest => getCoordinates(dest, cache));
  const results = await Promise.all(promises);
  
  batch.forEach((dest, idx) => {
    dest.lat = results[idx].lat;
    dest.long = results[idx].long;
  });
  
  return results.filter(r => r.lat !== 0 && r.long !== 0).length;
}

async function main() {
  console.log('🚀 Fast geocoding with parallel processing...\n');
  
  const destinations = JSON.parse(fs.readFileSync(DESTINATIONS_FILE, 'utf8'));
  console.log(`📍 Total destinations: ${destinations.length}`);
  
  const cache = loadCache();
  console.log(`💾 Cached locations: ${Object.keys(cache).length}\n`);
  
  const needsCoords = destinations.filter(d => d.lat === 0 && d.long === 0);
  console.log(`🎯 Need coordinates: ${needsCoords.length}\n`);
  
  if (needsCoords.length === 0) {
    console.log('✅ All destinations have coordinates!');
    return;
  }
  
  let processed = 0;
  let updated = 0;
  
  // Process in batches
  for (let i = 0; i < destinations.length; i += CONCURRENT_REQUESTS) {
    const batchUpdated = await processBatch(destinations, cache, i, CONCURRENT_REQUESTS);
    updated += batchUpdated;
    processed = Math.min(i + CONCURRENT_REQUESTS, destinations.length);
    
    const percent = ((processed / destinations.length) * 100).toFixed(1);
    console.log(`Progress: ${processed}/${destinations.length} (${percent}%) - ${updated} updated`);
    
    // Save progress every 50 destinations
    if (processed % 50 === 0) {
      saveCache(cache);
      fs.writeFileSync(DESTINATIONS_FILE, JSON.stringify(destinations, null, 2));
      console.log('💾 Progress saved\n');
    }
    
    await sleep(DELAY_MS);
  }
  
  // Final save
  const backupFile = DESTINATIONS_FILE.replace('.json', '_backup.json');
  if (!fs.existsSync(backupFile)) {
    fs.copyFileSync(DESTINATIONS_FILE, backupFile);
  }
  
  saveCache(cache);
  fs.writeFileSync(DESTINATIONS_FILE, JSON.stringify(destinations, null, 2));
  
  console.log(`\n✅ Complete!`);
  console.log(`   Total: ${destinations.length}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   With coordinates: ${destinations.filter(d => d.lat !== 0 && d.long !== 0).length}`);
  console.log('\n✨ Local Mode is ready!');
}

main().catch(console.error);

