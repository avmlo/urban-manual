/**
 * Update destination categories in Supabase from CSV file
 */

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key for admin access
);

async function updateCategories() {
  console.log('📥 Reading CSV file...\n');
  
  // Read CSV file
  const csvContent = fs.readFileSync('/home/ubuntu/upload/Table1-Gridview.csv', 'utf8');
  const lines = csvContent.split('\n');
  
  // Skip header row
  const dataLines = lines.slice(1).filter(line => line.trim());
  
  console.log(`Found ${dataLines.length} destinations in CSV\n`);
  
  // Parse CSV and prepare updates
  const updates = [];
  const errors = [];
  
  for (const line of dataLines) {
    // Simple CSV parsing (handles basic cases)
    const match = line.match(/^"?([^",]+)"?,(.+)$/);
    if (!match) {
      errors.push(`Could not parse line: ${line}`);
      continue;
    }
    
    const name = match[1].trim();
    const category = match[2].trim();
    
    updates.push({ name, category });
  }
  
  console.log(`✅ Parsed ${updates.length} valid entries\n`);
  
  if (errors.length > 0) {
    console.log(`⚠️  ${errors.length} parsing errors:\n`);
    errors.slice(0, 5).forEach(err => console.log(`   ${err}`));
    if (errors.length > 5) {
      console.log(`   ... and ${errors.length - 5} more\n`);
    }
  }
  
  // Update in batches
  console.log('🔄 Updating categories in Supabase...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const { name, category } of updates) {
    try {
      const { data, error } = await supabase
        .from('destinations')
        .update({ category })
        .eq('name', name);
      
      if (error) {
        console.log(`❌ Failed to update "${name}": ${error.message}`);
        failCount++;
      } else {
        successCount++;
        if (successCount % 50 === 0) {
          console.log(`   Updated ${successCount}/${updates.length}...`);
        }
      }
    } catch (err) {
      console.log(`❌ Error updating "${name}": ${err.message}`);
      failCount++;
    }
  }
  
  console.log('\n✅ Update complete!\n');
  console.log(`📊 Results:`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Total: ${updates.length}\n`);
  
  // Show category distribution
  console.log('📈 Category Distribution:');
  const categoryCount = {};
  updates.forEach(({ category }) => {
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  });
  
  Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      console.log(`   ${category}: ${count}`);
    });
}

updateCategories().catch(console.error);

