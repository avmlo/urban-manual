/**
 * Architecture Data Enrichment: Architects
 * Extracts architects from existing destinations and creates architect entities
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Create slug from architect name
 */
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Extract unique architects from destinations
 */
async function extractArchitects() {
  console.log('📋 Extracting architects from destinations...\n');

  // Get all destinations with architect field
  const { data: destinations, error } = await supabase
    .from('destinations')
    .select('id, name, design_firm, architectural_style')
    .not('design_firm', 'is', null)
    .neq('design_firm', '');

  if (error) {
    console.error('Error fetching destinations:', error);
    return;
  }

  console.log(`Found ${destinations?.length || 0} destinations with architect data\n`);

  // Group by architect name
  const architectMap = new Map<string, {
    name: string;
    destinations: number[];
    styles: Set<string>;
  }>();

  for (const dest of destinations || []) {
    const architectName = dest.design_firm?.trim();
    if (!architectName) continue;

    if (!architectMap.has(architectName)) {
      architectMap.set(architectName, {
        name: architectName,
        destinations: [],
        styles: new Set(),
      });
    }

    const entry = architectMap.get(architectName)!;
    entry.destinations.push(dest.id);
    
    if (dest.architectural_style) {
      entry.styles.add(dest.architectural_style);
    }
  }

  console.log(`Found ${architectMap.size} unique architects\n`);

  // Create architects in database
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const [name, data] of architectMap.entries()) {
    const slug = createSlug(name);

    // Check if architect already exists
    const { data: existing } = await supabase
      .from('architects')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      console.log(`⏭️  Skipping ${name} (already exists)`);
      skipped++;
      continue;
    }

    // Create architect
    const { data: architect, error: insertError } = await supabase
      .from('architects')
      .insert({
        name: name,
        slug: slug,
        movements: Array.from(data.styles).filter(Boolean),
      })
      .select()
      .single();

    if (insertError) {
      console.error(`❌ Error creating architect ${name}:`, insertError.message);
      continue;
    }

    console.log(`✅ Created architect: ${name} (${data.destinations.length} destinations)`);
    created++;

    // Update destinations with architect_id
    const { error: updateError } = await supabase
      .from('destinations')
      .update({ architect_id: architect.id })
      .in('id', data.destinations);

    if (updateError) {
      console.error(`⚠️  Error updating destinations for ${name}:`, updateError.message);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total architects: ${architectMap.size}`);
}

/**
 * Main execution
 */
async function main() {
  try {
    await extractArchitects();
    console.log('\n✅ Architect extraction complete!');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();

