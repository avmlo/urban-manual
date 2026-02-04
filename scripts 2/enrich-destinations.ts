/**
 * CLI Script to enrich destinations with Google Places API + Gemini AI
 *
 * Usage:
 *   npm run enrich              - Enrich all unenriched destinations
 *   npm run enrich --all        - Re-enrich ALL destinations
 *   npm run enrich --limit 10   - Enrich only first 10 destinations
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { enrichDestination } from '../lib/enrichment';

// Load environment variables from .env.local or .env
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Destination {
  slug: string;
  name: string;
  city: string;
  category?: string;
  content?: string;
  last_enriched_at?: string;
}

async function main() {
  const args = process.argv.slice(2);
  const enrichAll = args.includes('--all');
  const limitIndex = args.findIndex(arg => arg === '--limit');
  const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1]) : null;

  console.log('🚀 Starting destination enrichment...\n');

  // Fetch destinations
  let query = supabase
    .from('destinations')
    .select('slug, name, city, category, content, last_enriched_at');

  if (!enrichAll) {
    query = query.is('last_enriched_at', null);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data: destinations, error } = await query;

  if (error) {
    console.error('❌ Error fetching destinations:', error);
    process.exit(1);
  }

  if (!destinations || destinations.length === 0) {
    console.log('✅ All destinations are already enriched!');
    process.exit(0);
  }

  console.log(`📊 Found ${destinations.length} destinations to enrich\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < destinations.length; i++) {
    const dest = destinations[i] as Destination;
    const progress = `[${i + 1}/${destinations.length}]`;

    try {
      console.log(`${progress} Enriching: ${dest.name} (${dest.city})`);

      // Enrich with Places API + Gemini
      const enriched = await enrichDestination(
        dest.name,
        dest.city,
        dest.category,
        dest.content
      );

      // Update database
      const { error: updateError } = await supabase
        .from('destinations')
        .update({
          place_id: enriched.places.place_id,
          rating: enriched.places.rating,
          price_level: enriched.places.price_level,
          opening_hours: enriched.places.opening_hours,
          phone_number: enriched.places.phone_number,
          website: enriched.places.website,
          google_maps_url: enriched.places.google_maps_url,
          tags: enriched.gemini.tags,
          category: enriched.category,
          cuisine_type: enriched.places.cuisine_type,
          last_enriched_at: new Date().toISOString(),
        })
        .eq('slug', dest.slug);

      if (updateError) {
        throw updateError;
      }

      console.log(`  ✅ Success!`);
      console.log(`     Rating: ${enriched.places.rating || 'N/A'}`);
      console.log(`     Price: ${'$'.repeat(enriched.places.price_level || 0) || 'N/A'}`);
      console.log(`     Category: ${enriched.category}`);
      console.log(`     Cuisine Type: ${enriched.places.cuisine_type || 'N/A'}`);
      console.log(`     Tags: ${enriched.gemini.tags.join(', ')}`);
      console.log('');

      successCount++;

      // Rate limiting - wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}\n`);
      errorCount++;
    }
  }

  console.log('\n📈 Enrichment Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📊 Total: ${destinations.length}`);

  // Estimate cost
  const placesApiCost = successCount * 0.017; // $0.017 per Text Search request
  const geminiCost = successCount * 0.00001; // ~$0.00001 per request
  const totalCost = placesApiCost + geminiCost;

  console.log(`\n💰 Estimated API Cost: $${totalCost.toFixed(2)}`);
  console.log(`   Places API: $${placesApiCost.toFixed(2)}`);
  console.log(`   Gemini: $${geminiCost.toFixed(4)}`);
}

main().catch(console.error);
