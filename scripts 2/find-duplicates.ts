import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findDuplicates() {
  console.log('Finding duplicate destinations...\n');

  // Get all destinations
  const { data: destinations, error } = await supabase
    .from('destinations')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching destinations:', error);
    return;
  }

  // Group by name and city to find duplicates
  const groups = new Map<string, any[]>();
  
  for (const dest of destinations || []) {
    const key = `${dest.name.toLowerCase().trim()}|${dest.city}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(dest);
  }

  // Find groups with more than one entry
  const duplicates = Array.from(groups.entries())
    .filter(([_, dests]) => dests.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found!');
    return;
  }

  console.log(`Found ${duplicates.length} sets of duplicates:\n`);

  for (const [key, dests] of duplicates) {
    const [name, city] = key.split('|');
    console.log(`\n📍 ${name} (${city}) - ${dests.length} entries:`);
    
    for (const dest of dests) {
      console.log(`  - ID: ${dest.id}, Slug: ${dest.slug}, Created: ${dest.created_at || 'N/A'}`);
    }

    // Keep the oldest one (or the one with most data), delete others
    const toKeep = dests.reduce((best, current) => {
      // Prefer entries with content
      if (current.content && !best.content) return current;
      if (!current.content && best.content) return best;
      
      // Prefer entries with images
      if (current.main_image && !best.main_image) return current;
      if (!current.main_image && best.main_image) return best;
      
      // Otherwise keep the oldest
      return (current.created_at || '') < (best.created_at || '') ? current : best;
    });

    const toDelete = dests.filter(d => d.id !== toKeep.id);

    console.log(`  ✅ Keeping: ${toKeep.slug} (ID: ${toKeep.id})`);
    console.log(`  ❌ Will delete: ${toDelete.map(d => `${d.slug} (ID: ${d.id})`).join(', ')}`);

    // Delete duplicates
    for (const dest of toDelete) {
      const { error: deleteError } = await supabase
        .from('destinations')
        .delete()
        .eq('id', dest.id);

      if (deleteError) {
        console.log(`  ⚠️  Error deleting ${dest.slug}:`, deleteError.message);
      } else {
        console.log(`  ✓ Deleted ${dest.slug}`);
      }
    }
  }

  console.log('\n✅ Duplicate cleanup complete!');
  console.log(`Total duplicates removed: ${duplicates.reduce((sum, [_, dests]) => sum + (dests.length - 1), 0)}`);
}

findDuplicates();

