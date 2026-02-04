import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('destinations')
    .select('city')
    .not('city', 'is', null);

  if (error) {
    console.error('❌ Supabase error:', error.message);
    process.exit(1);
  }

  const cities = Array.from(
    new Set(
      (data || [])
        .map((r: any) => (r.city || '').toString().trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  console.log(`# Cities (${cities.length})`);
  for (const c of cities) console.log(c);
  console.log('\nJSON:\n' + JSON.stringify(cities, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

