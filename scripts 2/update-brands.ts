import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateBrands() {
  console.log('Reading CSV file...');
  
  const csvPath = path.join(__dirname, '../public/destinations.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`Found ${records.length} destinations in CSV`);

  let updated = 0;
  let skipped = 0;

  for (const record of records) {
    const slug = record.Slug;
    const brand = record.Brand && record.Brand.trim() !== '' ? record.Brand.trim() : null;
    const designer = record.Person && record.Person.trim() !== '' && !record.Person.startsWith('http') ? record.Person.trim() : null;

    if (!brand && !designer) {
      skipped++;
      continue;
    }

    try {
      const { error } = await supabase
        .from('destinations')
        .update({
          brand: brand,
          designer: designer
        })
        .eq('slug', slug);

      if (error) {
        console.error(`Error updating ${slug}:`, error.message);
      } else {
        updated++;
        if (brand) {
          console.log(`✓ Updated ${slug} with brand: ${brand}`);
        }
        if (designer) {
          console.log(`✓ Updated ${slug} with designer: ${designer}`);
        }
      }
    } catch (error) {
      console.error(`Error updating ${slug}:`, error);
    }
  }

  console.log(`\nUpdate complete!`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no brand/designer): ${skipped}`);
}

updateBrands().catch(console.error);

