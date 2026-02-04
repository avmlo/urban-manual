/**
 * Script to fetch categories from Google Places API and update Supabase
 * Run with: npm run fetch:categories
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local FIRST, before any other imports
config({ path: resolve(process.cwd(), '.env.local') });

// Now set Google API key before importing enrichment module
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
if (GOOGLE_API_KEY) {
  process.env.GOOGLE_API_KEY = GOOGLE_API_KEY;
  process.env.NEXT_PUBLIC_GOOGLE_API_KEY = GOOGLE_API_KEY;
}

import { createClient } from '@supabase/supabase-js';
import { findPlaceByText, categorizePlaceFromTypes } from '../lib/enrichment';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!GOOGLE_API_KEY) {
  console.error('Missing Google API key. Please set GOOGLE_API_KEY or NEXT_PUBLIC_GOOGLE_API_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchAndUpdateCategories() {
  console.log('🚀 Starting category fetch from Google Places API...\n');

  try {
    // Fetch all destinations
    const { data: destinations, error: fetchError } = await supabase
      .from('destinations')
      .select('id, slug, name, city, category, google_place_id')
      .order('slug', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch destinations: ${fetchError.message}`);
    }

    if (!destinations || destinations.length === 0) {
      console.log('No destinations found.');
      return;
    }

    console.log(`Found ${destinations.length} destinations to process.\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const dest of destinations) {
      try {
        console.log(`Processing: ${dest.name} (${dest.city})...`);

        // Fetch place data from Google
        const placesData = await findPlaceByText(dest.name, dest.city);

        if (!placesData.place_id) {
          console.log(`  ⚠️  No place found in Google Places, skipping...\n`);
          skipped++;
          continue;
        }

        // Determine category from Google types
        let newCategory = dest.category; // Keep existing as fallback
        if (placesData.google_types && placesData.google_types.length > 0) {
          const googleCategory = categorizePlaceFromTypes(placesData.google_types);
          if (googleCategory) {
            newCategory = googleCategory;
            console.log(`  📍 Found category from Google: ${newCategory}`);
          } else {
            console.log(`  ℹ️  No matching category found in Google types, keeping: ${dest.category}`);
          }
        } else {
          console.log(`  ℹ️  No Google types available, keeping: ${dest.category}`);
        }

        // Only update if category changed
        if (newCategory !== dest.category) {
          const { error: updateError } = await supabase
            .from('destinations')
            .update({ category: newCategory })
            .eq('id', dest.id);

          if (updateError) {
            throw new Error(`Update failed: ${updateError.message}`);
          }

          console.log(`  ✅ Updated category: ${dest.category} → ${newCategory}\n`);
          updated++;
        } else {
          console.log(`  ✓ Category already correct: ${newCategory}\n`);
          skipped++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error: any) {
        console.error(`  ❌ Error processing ${dest.name}: ${error.message}\n`);
        errors++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  ✅ Updated: ${updated}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`  📦 Total: ${destinations.length}\n`);

  } catch (error: any) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
fetchAndUpdateCategories()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
