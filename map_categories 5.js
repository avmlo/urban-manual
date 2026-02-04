/**
 * Map CSV categories to standardized database categories
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Category mapping from CSV to Database
const CATEGORY_MAPPING = {
  'Stay': 'Hotel',
  'Eat & Drink': 'Dining',
  'Other': 'Others',
  'Space': 'Culture',
  'Coffee': 'Cafe',
  'Sweets': 'Bakeries'
};

async function mapCategories() {
  console.log('🔄 Mapping categories to standardized names...\n');
  
  console.log('Mapping:');
  Object.entries(CATEGORY_MAPPING).forEach(([from, to]) => {
    console.log(`   "${from}" → "${to}"`);
  });
  console.log('');
  
  let totalUpdated = 0;
  
  for (const [oldCategory, newCategory] of Object.entries(CATEGORY_MAPPING)) {
    console.log(`Processing "${oldCategory}" → "${newCategory}"...`);
    
    const { data, error } = await supabase
      .from('destinations')
      .update({ category: newCategory })
      .eq('category', oldCategory)
      .select();
    
    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
    } else {
      const count = data?.length || 0;
      console.log(`   ✅ Updated ${count} destinations`);
      totalUpdated += count;
    }
  }
  
  console.log(`\n✅ Mapping complete! Updated ${totalUpdated} destinations\n`);
  
  // Verify final distribution
  console.log('🔍 Final category distribution...\n');
  
  const { data: allDests } = await supabase
    .from('destinations')
    .select('category');
  
  const categoryCount = {};
  allDests.forEach(d => {
    if (d.category) {
      categoryCount[d.category] = (categoryCount[d.category] || 0) + 1;
    }
  });
  
  console.log('📈 Categories:');
  Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      console.log(`   ${category}: ${count}`);
    });
  
  console.log('\n✅ All categories standardized!');
}

mapCategories().catch(console.error);

