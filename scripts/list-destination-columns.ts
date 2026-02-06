/**
 * List all columns in the destinations table
 * Usage: npm run list:columns
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase URL or Key not found in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listColumns() {
  try {
    console.log('📊 Fetching destinations table schema...\n');

    // Get a sample row to see all columns
    const { data: sample, error: sampleError } = await supabase
      .from('destinations')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (sampleError) {
      console.error('❌ Error accessing destinations table:', sampleError.message);
      console.log('\n📝 Please run this SQL query directly in your Supabase SQL Editor:\n');
      console.log(`
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'destinations'
AND table_schema = 'public'
ORDER BY ordinal_position;
      `);
      return;
    }

    if (sample) {
      console.log('✅ Destinations table columns (from sample row):\n');
      const columns = Object.keys(sample);
      
      // Group columns by category for better readability
      const categories: Record<string, string[]> = {
        'Core Fields': [],
        'Enrichment Fields': [],
        'Google Places': [],
        'Advanced Enrichment': [],
        'Web Content (Exa)': [],
        'Other': [],
      };

      columns.forEach(col => {
        const value = sample[col as keyof typeof sample];
        const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
        
        // Categorize columns
        if (['id', 'slug', 'name', 'city', 'country', 'neighborhood', 'category', 'description', 'content', 'image', 'micro_description'].includes(col)) {
          categories['Core Fields'].push(`${col.padEnd(45, ' ')} (${type})`);
        } else if (['design_firm', 'architectural_style', 'design_period', 'architect_info_json', 'architect_info_updated_at'].includes(col)) {
          categories['Web Content (Exa)'].push(`${col.padEnd(45, ' ')} (${type})`);
        } else if (['web_content_json', 'web_content_updated_at'].includes(col)) {
          categories['Web Content (Exa)'].push(`${col.padEnd(45, ' ')} (${type})`);
        } else if (col.includes('google') || col.includes('place_id') || col.includes('rating') || col.includes('price_level') || col.includes('opening_hours')) {
          categories['Google Places'].push(`${col.padEnd(45, ' ')} (${type})`);
        } else if (col.includes('weather') || col.includes('event') || col.includes('route') || col.includes('currency') || col.includes('photo') || col.includes('static_map')) {
          categories['Advanced Enrichment'].push(`${col.padEnd(45, ' ')} (${type})`);
        } else if (col.includes('enrich') || col.includes('tag') || col.includes('embedding') || col.includes('vector')) {
          categories['Enrichment Fields'].push(`${col.padEnd(45, ' ')} (${type})`);
        } else {
          categories['Other'].push(`${col.padEnd(45, ' ')} (${type})`);
        }
      });

      // Print categorized columns
      Object.entries(categories).forEach(([category, cols]) => {
        if (cols.length > 0) {
          console.log(`\n📁 ${category}:`);
          cols.forEach((col, idx) => {
            console.log(`   ${(idx + 1).toString().padStart(2, ' ')}. ${col}`);
          });
        }
      });

      console.log(`\n📊 Total: ${columns.length} columns`);
      
      // Also show SQL query for detailed info
      console.log('\n💡 For detailed column information (data types, nullability, defaults), run this SQL in Supabase:\n');
      console.log(`
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'destinations'
AND table_schema = 'public'
ORDER BY ordinal_position;
      `);
    } else {
      console.log('⚠️  No destinations found in table.');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\n📝 Please run this SQL query directly in your Supabase SQL Editor:\n');
    console.log(`
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'destinations'
AND table_schema = 'public'
ORDER BY ordinal_position;
    `);
  }
}

listColumns().catch(console.error);

