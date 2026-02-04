/**
 * Execute Migration 026 directly via Supabase SQL
 * Uses Supabase REST API to execute SQL
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runMigration() {
  console.log('🚀 Running Migration 026: Add Advanced Enrichment Fields\n');

  const migrationPath = resolve(process.cwd(), 'supabase/migrations/026_add_advanced_enrichment_fields.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  console.log('📄 Executing migration SQL...\n');

  try {
    // Execute the entire migration SQL as a single query
    // Supabase allows executing SQL via RPC if a function exists, or via REST API
    // For DDL statements, we'll use the REST API directly
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY!,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ query: migrationSQL }),
    });

    if (response.ok) {
      console.log('✅ Migration executed successfully!\n');
      return true;
    } else {
      const errorText = await response.text();
      console.log('⚠️  Direct REST API execution not available');
      console.log('   This is expected - DDL statements need to be run manually.\n');
      return false;
    }
  } catch (error: any) {
    console.log('⚠️  Automated execution not available');
    console.log('   This is expected for DDL statements.\n');
    return false;
  }
}

async function checkColumns() {
  console.log('🔍 Checking if columns already exist...\n');

  try {
    const { data, error } = await supabase
      .from('destinations')
      .select('photos_json, current_weather_json, nearby_events_json')
      .limit(1);

    if (error) {
      // Columns don't exist - need to run migration
      console.log('❌ Columns not found - migration needs to be run\n');
      return false;
    } else {
      console.log('✅ Columns already exist - migration may have been run\n');
      return true;
    }
  } catch (error: any) {
    console.log('⚠️  Could not check columns:', error.message);
    return false;
  }
}

async function main() {
  const columnsExist = await checkColumns();
  
  if (!columnsExist) {
    const executed = await runMigration();
    
    if (!executed) {
      console.log('📋 MANUAL MIGRATION REQUIRED:');
      console.log('');
      console.log('1. Go to Supabase Dashboard → SQL Editor');
      console.log(`2. Copy the SQL from: supabase/migrations/026_add_advanced_enrichment_fields.sql`);
      console.log('3. Paste and click "Run"');
      console.log('');
      console.log('Or run this command if you have psql:');
      console.log(`psql "${SUPABASE_URL.replace('https://', 'postgresql://').replace('/rest/v1', '')}" -f supabase/migrations/026_add_advanced_enrichment_fields.sql`);
      console.log('');
      process.exit(1);
    }
  }

  console.log('✅ Migration check complete!');
  console.log('   Ready to run enrichment script.\n');
}

main().catch(console.error);
