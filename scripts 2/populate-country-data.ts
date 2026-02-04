import { createClient } from '@supabase/supabase-js';
import { cityCountryMap } from '../data/cityCountryMap';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function populateCountryData() {
  console.log('Starting country data population...\n');

  // Fetch all destinations
  const { data: destinations, error: fetchError } = await supabase
    .from('destinations')
    .select('slug, city, country');

  if (fetchError) {
    console.error('Error fetching destinations:', fetchError);
    process.exit(1);
  }

  if (!destinations || destinations.length === 0) {
    console.log('No destinations found');
    return;
  }

  console.log(`Found ${destinations.length} destinations\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const destination of destinations) {
    // Normalize city name for lookup (lowercase, handle variations)
    const cityKey = destination.city?.toLowerCase().trim();

    if (!cityKey) {
      console.log(`⚠️  Skipping ${destination.slug}: no city`);
      skipped++;
      continue;
    }

    // Look up country in cityCountryMap
    const country = cityCountryMap[cityKey];

    if (!country) {
      console.log(`⚠️  No country mapping found for city: ${cityKey} (${destination.slug})`);
      skipped++;
      continue;
    }

    // Skip if country already matches
    if (destination.country === country) {
      skipped++;
      continue;
    }

    // Update destination with country
    const { error: updateError } = await supabase
      .from('destinations')
      .update({ country })
      .eq('slug', destination.slug);

    if (updateError) {
      console.error(`❌ Error updating ${destination.slug}:`, updateError.message);
      errors++;
    } else {
      console.log(`✅ Updated ${destination.slug}: ${destination.city} → ${country}`);
      updated++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📦 Total: ${destinations.length}`);
}

populateCountryData()
  .then(() => {
    console.log('\n✨ Country data population complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
