// Load environment variables FIRST before importing anything else
import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { generateDestinationEmbedding } from '../lib/embeddings/generate';
import { initOpenAI, OPENAI_EMBEDDING_MODEL } from '../lib/openai';

// Reinitialize OpenAI after dotenv loads
initOpenAI();

// Verify OpenAI API key is loaded
if (!process.env.OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY not found in environment variables');
  console.error('Please ensure .env.local contains: OPENAI_API_KEY=sk-...');
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.error('Required: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  console.error('Required: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('Please ensure these are set in .env.local');
  process.exit(1);
}

console.log('Environment check:');
console.log(`- OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Missing'}`);
console.log(`- Supabase URL: ${supabaseUrl ? '✓ Set' : '✗ Missing'}`);
console.log(`- Supabase Key: ${supabaseKey ? '✓ Set' : '✗ Missing'}`);
console.log('');

// Note: These are environment checks only, not logging actual secret values

const supabase = createClient(supabaseUrl, supabaseKey);

const EMBEDDING_VERSION = process.env.EMBEDDING_VERSION || '2024-06-initial';
const BATCH_SIZE = parseInt(process.env.EMBEDDING_WORKER_BATCH_SIZE || '50', 10);
const RATE_LIMIT_MS = parseInt(process.env.EMBEDDING_WORKER_RATE_LIMIT_MS || '25', 10);
const POLL_INTERVAL_MS = parseInt(process.env.EMBEDDING_WORKER_POLL_INTERVAL_MS || '15000', 10);
const RUN_ONCE = process.argv.includes('--once');

type DestinationRecord = {
  id: number;
  slug: string;
  name: string;
  city: string;
  category: string;
  content?: string | null;
  description?: string | null;
  tags?: string[] | null;
  embedding_version?: string | null;
};

async function fetchDestinationsNeedingEmbeddings(limit: number) {
  const { data, error } = await supabase
    .from('destinations')
    .select('id, slug, name, city, category, content, description, tags, embedding_version')
    .or('embedding.is.null,embedding_needs_update.eq.true')
    .order('embedding_generated_at', { ascending: true, nullsFirst: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data as DestinationRecord[];
}

async function processBatch() {
  const destinations = await fetchDestinationsNeedingEmbeddings(BATCH_SIZE);

  if (!destinations || destinations.length === 0) {
    return { processed: 0, errors: 0 };
  }

  console.log(`\nProcessing ${destinations.length} destinations needing embeddings...`);

  let processed = 0;
  let errors = 0;

  for (const dest of destinations) {
    try {
      const embedding = await generateDestinationEmbedding({
        name: dest.name || '',
        city: dest.city || '',
        category: dest.category || '',
        content: dest.content || undefined,
        description: dest.description || undefined,
        tags: dest.tags || []
      });

      if (!embedding) {
        console.error(`\n✗ Failed ${dest.slug}: No embedding returned`);
        errors++;
        continue;
      }

      const { error: updateError } = await supabase
        .from('destinations')
        .update({
          embedding: `[${embedding.join(',')}]` as any,
          embedding_model: OPENAI_EMBEDDING_MODEL,
          embedding_generated_at: new Date().toISOString(),
          embedding_version: EMBEDDING_VERSION,
          embedding_needs_update: false
        })
        .eq('id', dest.id);

      if (updateError) {
        console.error(`✗ Failed to update ${dest.slug}:`, updateError.message);
        errors++;
      } else {
        processed++;
        if (processed % 10 === 0) {
          process.stdout.write(`\r✓ Processed this batch: ${processed} | Errors: ${errors}`);
        }
      }

      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
    } catch (err: any) {
      console.error(`\n✗ Failed ${dest.slug}:`, err.message || err);
      errors++;
    }
  }

  return { processed, errors };
}

async function runEmbeddingWorker() {
  console.log('Starting embedding worker...');
  console.log(`- Embedding model: ${OPENAI_EMBEDDING_MODEL}`);
  console.log(`- Embedding version: ${EMBEDDING_VERSION}`);
  console.log(`- Batch size: ${BATCH_SIZE}`);
  console.log(`- Rate limit delay: ${RATE_LIMIT_MS}ms`);
  console.log(`- Poll interval: ${RUN_ONCE ? 'until queue drains' : `${POLL_INTERVAL_MS}ms`}`);

  let totalProcessed = 0;
  let totalErrors = 0;

  const processUntilEmpty = async () => {
    while (true) {
      const { processed, errors } = await processBatch();
      totalProcessed += processed;
      totalErrors += errors;

      if (processed === 0) {
        break;
      }
    }
  };

  await processUntilEmpty();

  if (RUN_ONCE) {
    console.log(`\n✅ Completed one-shot run. Processed: ${totalProcessed}, Errors: ${totalErrors}`);
    return;
  }

  while (true) {
    console.log(`\nSleeping for ${POLL_INTERVAL_MS / 1000}s before next poll...`);
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    await processUntilEmpty();
  }
}

runEmbeddingWorker().catch(error => {
  console.error('Embedding worker failed:', error);
  process.exit(1);
});

