import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
const SUPABASE_URL = 'https://avdnefdfwvpjkuanhdwk.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GOOGLE_PLACES_API_KEY) {
  console.error('❌ Google Places API key not found in environment variables');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Supabase service role key not found in environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface Destination {
  id: number;
  name: string;
  city: string;
  description: string | null;
  content: string | null;
}

async function fetchPlaceDetails(name: string, city: string) {
  try {
    const query = `${name}, ${city}`;
    
    // Find Place from Text
    const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json`;
    const searchParams = {
      input: query,
      inputtype: 'textquery',
      fields: 'place_id,name',
      key: GOOGLE_PLACES_API_KEY,
    };

    const searchResponse = await axios.get(searchUrl, { params: searchParams });
    
    if (!searchResponse.data.candidates || searchResponse.data.candidates.length === 0) {
      console.log(`   ⚠️  Place not found on Google: ${name}`);
      return null;
    }

    const placeId = searchResponse.data.candidates[0].place_id;

    // Get Place Details with editorial summary
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json`;
    const detailsParams = {
      place_id: placeId,
      fields: 'editorial_summary,reviews',
      key: GOOGLE_PLACES_API_KEY,
    };

    const detailsResponse = await axios.get(detailsUrl, { params: detailsParams });
    
    if (detailsResponse.data.status !== 'OK') {
      console.log(`   ⚠️  Failed to fetch details: ${detailsResponse.data.status}`);
      return null;
    }

    const result = detailsResponse.data.result;
    const editorialSummary = result.editorial_summary?.overview;
    const reviews = result.reviews;

    return {
      editorial_summary: editorialSummary,
      reviews: reviews,
    };

  } catch (error: any) {
    console.error(`   ❌ Error fetching place details: ${error.message}`);
    return null;
  }
}

async function updateDestinations() {
  console.log('🚀 Starting bulk update of destination descriptions...\n');

  // Fetch all destinations from Supabase
  const { data: destinations, error } = await supabase
    .from('destinations')
    .select('id, name, city, description, content')
    .order('name');

  if (error) {
    console.error('❌ Error fetching destinations:', error);
    process.exit(1);
  }

  if (!destinations || destinations.length === 0) {
    console.log('No destinations found in database');
    return;
  }

  console.log(`📍 Found ${destinations.length} destinations\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < destinations.length; i++) {
    const dest = destinations[i] as Destination;
    console.log(`[${i + 1}/${destinations.length}] Processing: ${dest.name}, ${dest.city}`);

    // We'll update all destinations, even if they have content

    // Fetch from Google Places
    const placeData = await fetchPlaceDetails(dest.name, dest.city);

    if (!placeData || !placeData.editorial_summary) {
      console.log(`   ⏭️  No editorial summary available`);
      skipped++;
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      continue;
    }

    // Update the destination
    const { error: updateError } = await supabase
      .from('destinations')
      .update({
        content: placeData.editorial_summary,
        description: placeData.editorial_summary,
      })
      .eq('id', dest.id);

    if (updateError) {
      console.error(`   ❌ Failed to update: ${updateError.message}`);
      failed++;
    } else {
      console.log(`   ✅ Updated with editorial summary`);
      updated++;
    }

    // Add a delay to avoid rate limiting (Google Places API has limits)
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📍 Total: ${destinations.length}`);
}

// Run the script
updateDestinations()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

