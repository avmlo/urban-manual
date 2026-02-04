import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDestinations() {
  // Total destinations
  const { count: totalCount } = await supabase
    .from('destinations')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total destinations: ${totalCount}`);
  
  // Destinations with embeddings
  const { count: withEmbeddings } = await supabase
    .from('destinations')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);
  
  console.log(`Destinations with embeddings: ${withEmbeddings}`);
  
  // Destinations without embeddings
  const { count: withoutEmbeddings } = await supabase
    .from('destinations')
    .select('*', { count: 'exact', head: true })
    .is('embedding', null);
  
  console.log(`Destinations without embeddings: ${withoutEmbeddings}`);
}

checkDestinations().catch(console.error);
