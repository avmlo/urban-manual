/**
 * Import destinations from JSON to Supabase
 * This script uploads all destinations to your Supabase database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration from environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DESTINATIONS_FILE = path.join(__dirname, 'public', 'destinations.json');
const BATCH_SIZE = 100; // Insert 100 at a time

async function importDestinations() {
  console.log('🚀 Starting destinations import to Supabase...\n');

  // Read destinations file
  const destinationsData = JSON.parse(fs.readFileSync(DESTINATIONS_FILE, 'utf8'));
  console.log(`📍 Found ${destinationsData.length} destinations\n`);

  // Transform data to match Supabase schema
  const destinations = destinationsData.map(dest => ({
    slug: dest.slug,
    name: dest.name,
    city: dest.city || null,
    category: dest.category || null,
    content: dest.content || null,
    subline: dest.subline || null,
    main_image: dest.mainImage || null,
    michelin_stars: dest.michelinStars || 0,
    crown: dest.crown || false,
    lat: dest.lat || 0,
    long: dest.long || 0,
  }));

  console.log('📊 Sample destination:');
  console.log(JSON.stringify(destinations[0], null, 2));
  console.log('');

  // Check if destinations already exist
  console.log('🔍 Checking existing destinations...');
  const { count } = await supabase
    .from('destinations')
    .select('*', { count: 'exact', head: true });

  if (count > 0) {
    console.log(`⚠️  Found ${count} existing destinations in database`);
    console.log('');
    
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('Do you want to:\n  1. Delete all and reimport\n  2. Update existing (upsert)\n  3. Cancel\nChoice (1/2/3): ', resolve);
    });
    rl.close();

    if (answer === '3') {
      console.log('❌ Import cancelled');
      return;
    }

    if (answer === '1') {
      console.log('🗑️  Deleting existing destinations...');
      const { error } = await supabase
        .from('destinations')
        .delete()
        .neq('slug', ''); // Delete all

      if (error) {
        console.error('Error deleting:', error);
        return;
      }
      console.log('✅ Deleted all existing destinations\n');
    }
  }

  // Import in batches
  console.log(`📦 Importing ${destinations.length} destinations in batches of ${BATCH_SIZE}...\n`);

  let imported = 0;
  let errors = 0;

  for (let i = 0; i < destinations.length; i += BATCH_SIZE) {
    const batch = destinations.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(destinations.length / BATCH_SIZE);

    process.stdout.write(`📦 Batch ${batchNum}/${totalBatches}: Importing ${batch.length} destinations... `);

    const { data, error } = await supabase
      .from('destinations')
      .upsert(batch, { onConflict: 'slug' });

    if (error) {
      console.log(`❌ Error`);
      console.error(error);
      errors += batch.length;
    } else {
      console.log(`✅ Success`);
      imported += batch.length;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Import Summary:');
  console.log('='.repeat(50));
  console.log(`✅ Successfully imported: ${imported}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📍 Total: ${destinations.length}`);
  console.log('='.repeat(50));

  // Verify import
  console.log('\n🔍 Verifying import...');
  const { count: finalCount } = await supabase
    .from('destinations')
    .select('*', { count: 'exact', head: true });

  console.log(`✅ Database now contains ${finalCount} destinations\n`);

  // Test search
  console.log('🧪 Testing full-text search...');
  const { data: searchResults, error: searchError } = await supabase
    .rpc('search_destinations', { search_query: 'coffee tokyo' });

  if (searchError) {
    console.log('⚠️  Search function not available yet. Run the SQL script first!');
  } else {
    console.log(`✅ Search works! Found ${searchResults.length} results for "coffee tokyo"`);
    if (searchResults.length > 0) {
      console.log(`   Example: ${searchResults[0].name} in ${searchResults[0].city}`);
    }
  }

  // Test nearby
  console.log('\n🧪 Testing PostGIS location...');
  const { data: nearbyResults, error: nearbyError } = await supabase
    .rpc('find_nearby_destinations', {
      user_lat: 35.6812,
      user_lng: 139.7671,
      radius_km: 2
    });

  if (nearbyError) {
    console.log('⚠️  Location function not available yet. Run the SQL script first!');
  } else {
    console.log(`✅ Location works! Found ${nearbyResults.length} destinations within 2km of Tokyo Station`);
    if (nearbyResults.length > 0) {
      console.log(`   Nearest: ${nearbyResults[0].name} (${nearbyResults[0].distance_km.toFixed(2)}km away)`);
    }
  }

  console.log('\n✨ Import complete! Your Supabase database is ready.\n');
  console.log('Next steps:');
  console.log('1. ✅ Destinations imported');
  console.log('2. Run supabase_search_and_location_FIXED.sql if you haven\'t');
  console.log('3. Update your app to fetch from Supabase instead of JSON');
  console.log('4. Test search and location features\n');
}

// Run import
importDestinations().catch(console.error);

