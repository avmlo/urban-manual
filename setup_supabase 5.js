import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupSupabase() {
  console.log('🚀 Starting Supabase setup...');
  
  // Read destinations from JSON
  const destinations = JSON.parse(fs.readFileSync('/home/ubuntu/travel-guide/public/destinations.json', 'utf8'));
  console.log(`📦 Found ${destinations.length} destinations to migrate`);
  
  // Check if table exists by trying to query it
  const { data: existingData, error: queryError } = await supabase
    .from('destinations')
    .select('id')
    .limit(1);
  
  if (queryError && queryError.code === '42P01') {
    console.log('❌ Table does not exist. Please create it first using the SQL below:');
    console.log(`
CREATE TABLE destinations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  city TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  content TEXT,
  image TEXT,
  michelin_stars INTEGER,
  crown BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_destinations_city ON destinations(city);
CREATE INDEX idx_destinations_category ON destinations(category);
CREATE INDEX idx_destinations_slug ON destinations(slug);
    `);
    return;
  }
  
  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  const { error: deleteError } = await supabase
    .from('destinations')
    .delete()
    .neq('id', 0);
  
  if (deleteError) {
    console.error('Error clearing data:', deleteError);
  }
  
  // Insert destinations in batches
  const batchSize = 100;
  let inserted = 0;
  
  for (let i = 0; i < destinations.length; i += batchSize) {
    const batch = destinations.slice(i, i + batchSize).map(d => ({
      name: d.name,
      slug: d.slug,
      city: d.city,
      category: d.category,
      description: d.subline || d.content?.substring(0, 500) || '',
      content: d.content || '',
      image: d.mainImage || d.image || '',
      michelin_stars: d.michelinStars || null,
      crown: d.crown || false
    }));
    
    const { data, error } = await supabase
      .from('destinations')
      .insert(batch);
    
    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      inserted += batch.length;
      console.log(`✅ Inserted ${inserted}/${destinations.length} destinations`);
    }
  }
  
  console.log('🎉 Supabase setup complete!');
}

setupSupabase().catch(console.error);
