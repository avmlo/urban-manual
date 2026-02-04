import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getDiscoveryEngineService } from '../services/search/discovery-engine';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const discoveryEngine = getDiscoveryEngineService();

/**
 * Export all destinations from Supabase and transform them for Discovery Engine
 */
async function exportDestinations() {
  console.log('📤 Exporting destinations from Supabase...\n');

  try {
    // Fetch all destinations
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      throw error;
    }

    if (!destinations || destinations.length === 0) {
      console.log('⚠️  No destinations found in Supabase');
      return [];
    }

    console.log(`✅ Found ${destinations.length} destinations\n`);

    // Transform destinations to Discovery Engine format
    const transformed = destinations.map((dest: any) => ({
      id: dest.slug || dest.id?.toString(),
      slug: dest.slug || '',
      name: dest.name || '',
      description: dest.description || '',
      city: dest.city || '',
      category: dest.category || '',
      tags: dest.tags || [],
      rating: dest.rating || 0,
      price_level: dest.price_level || 0,
      michelin_stars: dest.michelin_stars || 0,
      latitude: dest.latitude || null,
      longitude: dest.longitude || null,
      images: dest.images || [],
      cuisine_type: dest.cuisine_type || null,
      editorial_note: dest.editorial_note || null,
      trending_score: dest.trending_score || 0,
      views_count: dest.views_count || 0,
      saves_count: dest.saves_count || 0,
      visits_count: dest.visits_count || 0,
      created_at: dest.created_at || new Date().toISOString(),
      updated_at: dest.updated_at || new Date().toISOString(),
    }));

    return transformed;
  } catch (error: any) {
    console.error('❌ Error exporting destinations:', error);
    throw error;
  }
}

/**
 * Main export function
 */
async function main() {
  console.log('🚀 Starting Discovery Engine data export...\n');

  // Check if Discovery Engine is configured
  if (!discoveryEngine.isAvailable()) {
    console.warn('⚠️  Discovery Engine is not configured.');
    console.warn('   Set GOOGLE_CLOUD_PROJECT_ID and DISCOVERY_ENGINE_DATA_STORE_ID environment variables.');
    console.warn('   Exporting data anyway for manual import...\n');
  }

  try {
    const destinations = await exportDestinations();

    // Save to JSON file for manual import or batch processing
    const fs = await import('fs/promises');
    const outputPath = resolve(process.cwd(), 'discovery-engine-export.json');
    
    await fs.writeFile(outputPath, JSON.stringify(destinations, null, 2), 'utf-8');
    
    console.log(`✅ Exported ${destinations.length} destinations to ${outputPath}`);
    console.log('\n📋 Next steps:');
    console.log('   1. Review the exported data');
    console.log('   2. Run the import script: npm run discovery:import');
    console.log('   3. Or import manually via Google Cloud Console\n');

    return destinations;
  } catch (error: any) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { exportDestinations };

