/**
 * Fix malformed categories in Supabase
 * Clean up entries like 'London",Hotel' -> 'Hotel'
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Valid categories
const VALID_CATEGORIES = [
  'Hotel',
  'Dining',
  'Others',
  'Bar',
  'Culture',
  'Cafe',
  'Bakeries'
];

async function fixCategories() {
  console.log('🔍 Finding malformed categories...\n');
  
  // Get all destinations
  const { data: destinations, error } = await supabase
    .from('destinations')
    .select('id, name, slug, category');
  
  if (error) {
    console.error('❌ Error fetching destinations:', error);
    return;
  }
  
  console.log(`📊 Found ${destinations.length} total destinations\n`);
  
  // Find malformed categories
  const malformed = destinations.filter(d => {
    return d.category && !VALID_CATEGORIES.includes(d.category);
  });
  
  console.log(`⚠️  Found ${malformed.length} destinations with malformed categories\n`);
  
  if (malformed.length === 0) {
    console.log('✅ No malformed categories found!');
    return;
  }
  
  // Show examples
  console.log('Examples:');
  malformed.slice(0, 10).forEach(d => {
    console.log(`   "${d.name}" → Category: "${d.category}"`);
  });
  console.log('');
  
  // Fix each one
  console.log('🔧 Fixing categories...\n');
  
  let fixedCount = 0;
  let failedCount = 0;
  
  for (const dest of malformed) {
    // Extract the actual category from malformed string
    // Pattern: 'Something",Category' -> 'Category'
    let fixedCategory = dest.category;
    
    // Try to extract category after the last quote and comma
    const match = dest.category.match(/",([^"]+)$/);
    if (match) {
      fixedCategory = match[1].trim();
    }
    
    // Validate it's a known category
    if (!VALID_CATEGORIES.includes(fixedCategory)) {
      console.log(`⚠️  Could not fix "${dest.name}": "${dest.category}" -> "${fixedCategory}"`);
      failedCount++;
      continue;
    }
    
    // Update in Supabase
    const { error: updateError } = await supabase
      .from('destinations')
      .update({ category: fixedCategory })
      .eq('id', dest.id);
    
    if (updateError) {
      console.log(`❌ Failed to update "${dest.name}": ${updateError.message}`);
      failedCount++;
    } else {
      fixedCount++;
      if (fixedCount % 10 === 0) {
        console.log(`   Fixed ${fixedCount}/${malformed.length}...`);
      }
    }
  }
  
  console.log('\n✅ Cleanup complete!\n');
  console.log(`📊 Results:`);
  console.log(`   Fixed: ${fixedCount}`);
  console.log(`   Failed: ${failedCount}`);
  console.log(`   Total: ${malformed.length}\n`);
  
  // Verify final distribution
  console.log('🔍 Verifying final category distribution...\n');
  
  const { data: allDests } = await supabase
    .from('destinations')
    .select('category');
  
  const categoryCount = {};
  allDests.forEach(d => {
    if (d.category) {
      categoryCount[d.category] = (categoryCount[d.category] || 0) + 1;
    }
  });
  
  console.log('📈 Final Category Distribution:');
  Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      const valid = VALID_CATEGORIES.includes(category) ? '✅' : '⚠️ ';
      console.log(`   ${valid} ${category}: ${count}`);
    });
}

fixCategories().catch(console.error);

