/**
 * Fetch Google Places editorial_summary (About) for all destinations
 * Usage: npm run fetch:google-about
 * 
 * This script:
 * 1. Fetches all destinations from the database
 * 2. For each destination, fetches editorial_summary from Google Places API
 * 3. Updates the database with the editorial_summary
 * 4. Can optionally update description/content fields with the editorial_summary
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

function stripHtmlTags(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .trim();
}

async function findPlaceId(query: string, name?: string, city?: string): Promise<string | null> {
  const searchQueries = [];
  
  searchQueries.push(query);
  
  if (name && city && `${name} ${city}` !== query) {
    searchQueries.push(`${name} ${city}`);
    searchQueries.push(name);
    
    const cleanedName = name
      .replace(/^(the|a|an)\s+/i, '')
      .replace(/\s+(hotel|restaurant|cafe|bar|shop|store|mall|plaza|center|centre)$/i, '')
      .trim();
    
    if (cleanedName !== name) {
      searchQueries.push(`${cleanedName} ${city}`);
    }
  }

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
      continue;
    }
  }
  
  return null;
}

async function fetchEditorialSummary(placeId: string): Promise<string | null> {
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY!,
        'X-Goog-FieldMask': 'editorialSummary',
      },
    });

    if (!response.ok) {
      return null;
    }

    const place = await response.json();
    return place.editorialSummary?.overview || null;
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log('🚀 Starting to fetch Google Places editorial_summary for all destinations...\n');

  // Fetch all destinations
  const { data: destinations, error } = await supabase
    .from('destinations')
    .select('id, slug, name, city, google_place_id, editorial_summary')
    .order('id', { ascending: true });

  if (error) {
    console.error('❌ Error fetching destinations:', error);
    process.exit(1);
  }

  if (!destinations || destinations.length === 0) {
    console.log('❌ No destinations found');
    process.exit(1);
  }

  console.log(`📊 Found ${destinations.length} destinations\n`);

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const dest of destinations) {
    processed++;
    const progress = `[${processed}/${destinations.length}]`;

    try {
      // Skip if already has editorial_summary (unless you want to refresh)
      if (dest.editorial_summary && dest.editorial_summary.trim()) {
        console.log(`${progress} ⏭️  ${dest.slug} - already has editorial_summary, skipping`);
        skipped++;
        continue;
      }

      let placeId = dest.google_place_id;

      // If no google_place_id, find it
      if (!placeId) {
        const query = dest.city ? `${dest.name}, ${dest.city}` : dest.name;
        console.log(`${progress} 🔍 ${dest.slug} - finding place ID...`);
        placeId = await findPlaceId(query, dest.name, dest.city);
        
        if (!placeId) {
          console.log(`${progress} ❌ ${dest.slug} - place not found`);
          failed++;
          continue;
        }

        // Update google_place_id for future use
        await supabase
          .from('destinations')
          .update({ google_place_id: placeId })
          .eq('id', dest.id);
      }

      // Fetch editorial_summary
      console.log(`${progress} 📝 ${dest.slug} - fetching editorial_summary...`);
      const editorialSummary = await fetchEditorialSummary(placeId);

      if (!editorialSummary) {
        console.log(`${progress} ⚠️  ${dest.slug} - no editorial_summary available`);
        failed++;
        continue;
      }

      const cleanedSummary = stripHtmlTags(editorialSummary);

      // Update database
      const updateData: any = {
        editorial_summary: cleanedSummary,
      };

      // Optionally update description/content if they're empty
      const { data: currentDest } = await supabase
        .from('destinations')
        .select('description, content')
        .eq('id', dest.id)
        .single();

      if (currentDest && (!currentDest.description || currentDest.description.trim() === '')) {
        updateData.description = cleanedSummary.substring(0, 150);
      }

      if (currentDest && (!currentDest.content || currentDest.content.trim() === '')) {
        updateData.content = cleanedSummary;
      }

      const { error: updateError } = await supabase
        .from('destinations')
        .update(updateData)
        .eq('id', dest.id);

      if (updateError) {
        console.log(`${progress} ❌ ${dest.slug} - update failed: ${updateError.message}`);
        failed++;
      } else {
        console.log(`${progress} ✅ ${dest.slug} - updated`);
        updated++;
      }

      // Rate limiting: 1 request per second
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error: any) {
      console.error(`${progress} ❌ ${dest.slug} - error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📝 Total: ${processed}`);
}

main().catch(console.error);


