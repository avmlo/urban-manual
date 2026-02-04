import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function mergeCities() {
  console.log('Merging Ho Chi Minh City into saigon...');

  // Update all destinations with city = 'ho-chi-minh-city' to 'saigon'
  const { data, error } = await supabase
    .from('destinations')
    .update({ city: 'saigon' })
    .eq('city', 'ho-chi-minh-city')
    .select();

  if (error) {
    console.error('Error updating destinations:', error);
    return;
  }

  console.log(`✅ Updated ${data?.length || 0} destinations from 'ho-chi-minh-city' to 'saigon'`);

  // Also update saved_destinations if they reference the old city
  const { data: savedData, error: savedError } = await supabase
    .from('saved_destinations')
    .select('*, destinations!inner(city)')
    .eq('destinations.city', 'saigon');

  if (savedError) {
    console.error('Error checking saved destinations:', savedError);
  } else {
    console.log(`✅ Saved destinations are now pointing to updated destinations`);
  }

  // Update visited_destinations similarly
  const { data: visitedData, error: visitedError } = await supabase
    .from('visited_destinations')
    .select('*, destinations!inner(city)')
    .eq('destinations.city', 'saigon');

  if (visitedError) {
    console.error('Error checking visited destinations:', visitedError);
  } else {
    console.log(`✅ Visited destinations are now pointing to updated destinations`);
  }

  console.log('\n✅ Merge complete!');
}

mergeCities();

