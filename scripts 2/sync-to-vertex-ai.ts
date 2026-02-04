/**
 * Sync Supabase destinations to Google Vertex AI Search
 *
 * This script:
 * 1. Fetches all destinations from Supabase
 * 2. Formats them for Vertex AI Search
 * 3. Indexes them in Vertex AI data store
 *
 * Run with: npx tsx scripts/sync-to-vertex-ai.ts
 */

import { createClient } from '@supabase/supabase-js';
import { DocumentServiceClient, DataStoreServiceClient, EngineServiceClient } from '@google-cloud/discoveryengine';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID!;
const location = process.env.GOOGLE_CLOUD_LOCATION || 'global';
const dataStoreId = process.env.VERTEX_AI_DATA_STORE_ID!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface Destination {
  slug: string;
  name: string;
  city: string;
  category: string;
  content: string | null;
  image: string | null;
  michelin_stars: number | null;
  crown: boolean;
}

async function ensureDataStoreExists() {
  console.log('🔍 Checking if data store exists...\n');

  const dataStoreClient = new DataStoreServiceClient();
  const dataStorePath = `projects/${projectId}/locations/${location}/collections/default_collection/dataStores/${dataStoreId}`;

  try {
    // Try to get the data store
    await dataStoreClient.getDataStore({ name: dataStorePath });
    console.log('✅ Data store already exists\n');
    return true;
  } catch (error: any) {
    if (error.code === 5) { // NOT_FOUND
      console.log('📝 Data store not found, creating it...\n');

      try {
        // Create the data store
        const parent = `projects/${projectId}/locations/${location}/collections/default_collection`;
        const operation: any = await dataStoreClient.createDataStore({
          parent,
          dataStoreId,
          dataStore: {
            displayName: 'Destinations Search',
            industryVertical: 'GENERIC' as any,
            solutionTypes: ['SOLUTION_TYPE_SEARCH'] as any,
            contentConfig: 'CONTENT_REQUIRED' as any,
          },
        });

        console.log('⏳ Creating data store (this may take a few minutes)...');

        // Handle both array and direct operation response
        const op = Array.isArray(operation) ? operation[0] : operation;
        if (op && op.promise) {
          await op.promise();
        }

        console.log('✅ Data store created successfully!\n');
        return true;
      } catch (createError) {
        console.error('❌ Error creating data store:', createError);
        console.log('\n💡 You may need to create the data store manually in Google Cloud Console:');
        console.log(`   https://console.cloud.google.com/gen-app-builder/engines\n`);
        return false;
      }
    } else {
      console.error('❌ Error checking data store:', error);
      return false;
    }
  }
}

async function ensureSearchEngineExists() {
  console.log('🔍 Checking if search engine exists...\n');

  const engineClient = new EngineServiceClient();
  const engineId = `${dataStoreId}-engine`;
  const enginePath = `projects/${projectId}/locations/${location}/collections/default_collection/engines/${engineId}`;

  try {
    // Try to get the engine
    await engineClient.getEngine({ name: enginePath });
    console.log('✅ Search engine already exists\n');
    return true;
  } catch (error: any) {
    if (error.code === 5) { // NOT_FOUND
      console.log('📝 Search engine not found, creating it with Enterprise features...\n');

      try {
        // Create the search engine with Enterprise + Generative AI
        const parent = `projects/${projectId}/locations/${location}/collections/default_collection`;
        const dataStorePath = `projects/${projectId}/locations/${location}/collections/default_collection/dataStores/${dataStoreId}`;

        const operation: any = await engineClient.createEngine({
          parent,
          engineId,
          engine: {
            displayName: 'Destinations Search Engine',
            solutionType: 'SOLUTION_TYPE_SEARCH' as any,
            // Link to the data store
            dataStoreIds: [dataStoreId],
            // Enable Enterprise features
            searchEngineConfig: {
              searchTier: 'SEARCH_TIER_ENTERPRISE' as any,
              searchAddOns: ['SEARCH_ADD_ON_LLM'] as any, // Generative AI features
            },
            // Industry vertical
            industryVertical: 'GENERIC' as any,
          },
        });

        console.log('⏳ Creating search engine with Enterprise + Generative AI (this may take a few minutes)...');

        // Handle both array and direct operation response
        const op = Array.isArray(operation) ? operation[0] : operation;
        if (op && op.promise) {
          await op.promise();
        }

        console.log('✅ Search engine created successfully!');
        console.log('   ✨ Enterprise features enabled: Extractive answers, Image search');
        console.log('   ✨ Generative AI enabled: Search summarization, Follow-ups\n');
        return true;
      } catch (createError) {
        console.error('❌ Error creating search engine:', createError);
        console.log('\n💡 You may need to create the engine manually in Google Cloud Console:');
        console.log(`   https://console.cloud.google.com/gen-app-builder/engines\n`);
        return false;
      }
    } else {
      console.error('❌ Error checking search engine:', error);
      return false;
    }
  }
}

async function syncToVertexAI() {
  console.log('🔄 Starting sync to Vertex AI Search...\n');

  // 1. Fetch all destinations from Supabase
  console.log('📥 Fetching destinations from Supabase...');
  const { data: destinations, error } = await supabase
    .from('destinations')
    .select('*')
    .order('name');

  if (error || !destinations) {
    console.error('❌ Error fetching destinations:', error);
    process.exit(1);
  }

  console.log(`✅ Found ${destinations.length} destinations\n`);

  // 2. Format destinations for Vertex AI
  console.log('🔧 Formatting documents for Vertex AI...');
  const documents = destinations.map((dest: Destination) => {
    const content = [
      dest.name,
      dest.city,
      dest.category,
      dest.content || '',
      dest.michelin_stars ? `${dest.michelin_stars} michelin stars` : '',
      dest.crown ? 'featured destination' : '',
    ].filter(Boolean).join(' ');

    return {
      id: dest.slug,
      jsonData: JSON.stringify({
        slug: dest.slug,
        name: dest.name,
        city: dest.city,
        category: dest.category,
        content: dest.content,
        image: dest.image,
        michelin_stars: dest.michelin_stars,
        crown: dest.crown,
        // Full text for search
        searchableText: content,
      }),
      content: {
        mimeType: 'application/json',
        rawBytes: Buffer.from(JSON.stringify({
          slug: dest.slug,
          name: dest.name,
          city: dest.city,
          category: dest.category,
        })),
      },
    };
  });

  console.log(`✅ Formatted ${documents.length} documents\n`);

  // 3. Initialize Vertex AI client
  console.log('🔌 Connecting to Vertex AI Search...');
  const client = new DocumentServiceClient();

  // 4. Batch import documents
  const branchPath = `projects/${projectId}/locations/${location}/collections/default_collection/dataStores/${dataStoreId}/branches/default_branch`;

  console.log(`📤 Uploading to: ${branchPath}\n`);

  try {
    // Note: You may need to batch this for large datasets
    // Vertex AI has a limit of ~1000 documents per import request
    const batchSize = 100;

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);

      console.log(`Uploading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)}...`);

      const [operation] = await client.importDocuments({
        parent: branchPath,
        inlineSource: {
          documents: batch,
        },
        reconciliationMode: 'INCREMENTAL', // Updates existing, adds new
      });

      console.log(`⏳ Waiting for batch to complete...`);
      await operation.promise();
      console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} completed\n`);
    }

    console.log('✨ Sync completed successfully!');
    console.log(`📊 Total documents indexed: ${destinations.length}`);

  } catch (error) {
    console.error('❌ Error syncing to Vertex AI:', error);
    process.exit(1);
  }
}

// Run the setup and sync
async function main() {
  console.log('🚀 Starting Vertex AI Search setup with Enterprise features...\n');

  // Step 1: Ensure data store exists
  const dataStoreReady = await ensureDataStoreExists();
  if (!dataStoreReady) {
    console.error('❌ Cannot proceed without a data store');
    process.exit(1);
  }

  // Step 2: Ensure search engine exists (with Enterprise + Generative AI)
  const engineReady = await ensureSearchEngineExists();
  if (!engineReady) {
    console.error('❌ Cannot proceed without a search engine');
    process.exit(1);
  }

  // Step 3: Sync destinations
  await syncToVertexAI();
}

main()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
