import { config } from 'dotenv';
import { resolve } from 'path';
import { readFile } from 'fs/promises';
import { getDiscoveryEngineService } from '../services/search/discovery-engine';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const discoveryEngine = getDiscoveryEngineService();

/**
 * Import destinations into Discovery Engine
 */
async function importDestinations(destinations: any[], batchSize: number = 100) {
  console.log(`📥 Importing ${destinations.length} destinations into Discovery Engine...\n`);

  if (!discoveryEngine.isAvailable()) {
    throw new Error('Discovery Engine is not configured. Please set GOOGLE_CLOUD_PROJECT_ID and DISCOVERY_ENGINE_DATA_STORE_ID');
  }

  let imported = 0;
  let failed = 0;
  const errors: Array<{ id: string; error: string }> = [];

  // Process in batches
  for (let i = 0; i < destinations.length; i += batchSize) {
    const batch = destinations.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(destinations.length / batchSize);

    console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} destinations)...`);

    try {
      await discoveryEngine.importDocuments(batch);
      imported += batch.length;
      console.log(`   ✅ Imported batch ${batchNum} (${batch.length} documents)`);
    } catch (error: any) {
      // If batch fails, try individual imports as fallback
      console.warn(`   ⚠️  Batch import failed, trying individual imports...`);
      for (const dest of batch) {
        try {
          // Fallback: import individually (if single import method exists)
          // For now, mark as failed and continue
          failed++;
          errors.push({
            id: dest.id || dest.slug || 'unknown',
            error: error.message,
          });
        } catch (individualError: any) {
          failed++;
          errors.push({
            id: dest.id || dest.slug || 'unknown',
            error: individualError.message,
          });
        }
      }
    }

    console.log(`   ✅ Batch ${batchNum} complete (${imported} imported, ${failed} failed)\n`);

    // Longer delay between batches
    if (i + batchSize < destinations.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log('\n📊 Import Summary:');
  console.log(`   ✅ Successfully imported: ${imported}`);
  console.log(`   ❌ Failed: ${failed}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(({ id, error }) => {
      console.log(`   - ${id}: ${error}`);
    });
  }

  return { imported, failed, errors };
}

/**
 * Main import function
 */
async function main() {
  console.log('🚀 Starting Discovery Engine data import...\n');

  try {
    // Check if Discovery Engine is configured
    if (!discoveryEngine.isAvailable()) {
      console.error('❌ Discovery Engine is not configured.');
      console.error('   Please set the following environment variables:');
      console.error('   - GOOGLE_CLOUD_PROJECT_ID');
      console.error('   - DISCOVERY_ENGINE_DATA_STORE_ID');
      console.error('   - GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON)');
      console.error('\n   Or configure default credentials via gcloud CLI:\n');
      console.error('   gcloud auth application-default login\n');
      process.exit(1);
    }

    // Read exported data
    const exportPath = resolve(process.cwd(), 'discovery-engine-export.json');
    let destinations: any[];

    try {
      const fileContent = await readFile(exportPath, 'utf-8');
      destinations = JSON.parse(fileContent);
    } catch (error: any) {
      console.error(`❌ Failed to read export file: ${exportPath}`);
      console.error('   Run the export script first: npm run discovery:export\n');
      process.exit(1);
    }

    if (!Array.isArray(destinations) || destinations.length === 0) {
      console.error('❌ No destinations found in export file');
      process.exit(1);
    }

    console.log(`📋 Found ${destinations.length} destinations to import\n`);

    // Confirm before proceeding
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(`⚠️  This will import ${destinations.length} destinations. Continue? (yes/no): `, resolve);
    });

    rl.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Import cancelled');
      process.exit(0);
    }

    // Import destinations
    const result = await importDestinations(destinations);

    if (result.failed === 0) {
      console.log('\n✅ All destinations imported successfully!');
    } else {
      console.log(`\n⚠️  Import completed with ${result.failed} errors`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { importDestinations };

