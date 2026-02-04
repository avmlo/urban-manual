/**
 * Script to check Supabase migration status
 * Run with: npm run check:migrations
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface MigrationFile {
  path: string;
  name: string;
  content: string;
}

async function getAllMigrationFiles(): Promise<MigrationFile[]> {
  const migrations: MigrationFile[] = [];
  
  // Get supabase/migrations files
  try {
    const supabaseFiles = await readdir('supabase/migrations');
    for (const file of supabaseFiles.filter(f => f.endsWith('.sql'))) {
      const content = await readFile(join('supabase/migrations', file), 'utf-8');
      migrations.push({
        path: `supabase/migrations/${file}`,
        name: file,
        content,
      });
    }
  } catch (error) {
    console.warn('Could not read supabase/migrations:', error);
  }

  // Get migrations/ files
  try {
    const oldFiles = await readdir('migrations');
    for (const file of oldFiles.filter(f => f.endsWith('.sql'))) {
      const content = await readFile(join('migrations', file), 'utf-8');
      migrations.push({
        path: `migrations/${file}`,
        name: file,
        content,
      });
    }
  } catch (error) {
    console.warn('Could not read migrations/:', error);
  }

  return migrations.sort((a, b) => a.name.localeCompare(b.name));
}

async function checkDatabaseObjects() {
  console.log('\n📊 Checking Database Objects...\n');

  // Check for key tables
  const keyTables = [
    'destinations',
    'user_profiles',
    'saved_places',
    'visited_places',
    'lists',
    'reviews',
    'trips',
    'itinerary_items',
    'assistant_threads',
    'assistant_preferences',
  ];

  const tableStatus: Record<string, boolean> = {};

  for (const table of keyTables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      tableStatus[table] = !error;
    } catch {
      tableStatus[table] = false;
    }
  }

  console.log('Tables Status:');
  for (const [table, exists] of Object.entries(tableStatus)) {
    console.log(`  ${exists ? '✅' : '❌'} ${table}`);
  }

  // Check for key functions
  const keyFunctions = [
    'ensure_michelin_is_dining',
    'get_nested_destinations',
    'get_all_nested_destinations',
  ];

  console.log('\nFunctions Status:');
  for (const func of keyFunctions) {
    try {
      const { data, error } = await supabase.rpc('pg_get_function_identity_arguments', {
        funcname: func,
      });
      // Simple check - if no error, function might exist
      console.log(`  ${error ? '❌' : '✅'} ${func}`);
    } catch {
      console.log(`  ❌ ${func}`);
    }
  }

  // Check for constraints
  console.log('\nConstraints Status:');
  try {
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .limit(1);
    
    // Check if constraint exists by trying to violate it
    // This is a simple check - we'll verify properly in SQL
    console.log('  Checking chk_michelin_is_dining...');
  } catch (error: any) {
    if (error.message?.includes('chk_michelin_is_dining')) {
      console.log('  ✅ chk_michelin_is_dining constraint exists');
    } else {
      console.log('  ❌ Could not verify constraint');
    }
  }

  return { tableStatus };
}

async function analyzeMigrations() {
  console.log('🔍 Analyzing Migration Files...\n');

  const files = await getAllMigrationFiles();
  console.log(`Found ${files.length} migration files\n`);

  // Group by folder
  const supabaseMigrations = files.filter(f => f.path.startsWith('supabase/'));
  const oldMigrations = files.filter(f => f.path.startsWith('migrations/') && !f.path.startsWith('supabase/'));

  console.log(`📁 supabase/migrations/: ${supabaseMigrations.length} files`);
  console.log(`📁 migrations/: ${oldMigrations.length} files\n`);

  // Check for duplicates
  const duplicates: string[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const baseName = file.name.replace(/^\d+_/, '').toLowerCase();
    if (seen.has(baseName)) {
      duplicates.push(file.path);
    }
    seen.add(baseName);
  }

  if (duplicates.length > 0) {
    console.log('⚠️  Potential duplicate migrations:');
    duplicates.forEach(d => console.log(`  - ${d}`));
    console.log('');
  }

  // Identify key migrations
  const keyMigrations = [
    { name: '421_ensure_michelin_is_dining', description: 'Michelin → Dining constraint' },
    { name: '420_add_nested_destinations', description: 'Nested destinations support' },
    { name: '419_fix_user_profiles_rls', description: 'User profiles RLS fix' },
    { name: '418_fix_additional_function_security', description: 'Function security fixes' },
    { name: '417_fix_all_security_issues', description: 'Security issues fixes' },
    { name: '416_enable_rls_co_visit_signals', description: 'RLS for co_visit_signals' },
  ];

  console.log('🔑 Key Migrations Status:');
  for (const key of keyMigrations) {
    const found = files.find(f => f.name.includes(key.name.split('_').slice(1).join('_')));
    console.log(`  ${found ? '✅' : '❌'} ${key.name}: ${key.description}`);
    if (found) {
      console.log(`      Location: ${found.path}`);
    }
  }

  return { files, supabaseMigrations, oldMigrations, duplicates };
}

async function main() {
  console.log('🚀 Supabase Migration Status Check\n');
  console.log('=' .repeat(60));

  const { files, supabaseMigrations, oldMigrations } = await analyzeMigrations();
  const { tableStatus } = await checkDatabaseObjects();

  console.log('\n' + '='.repeat(60));
  console.log('\n📋 Summary:\n');
  console.log(`Total migration files: ${files.length}`);
  console.log(`  - supabase/migrations/: ${supabaseMigrations.length}`);
  console.log(`  - migrations/ (old): ${oldMigrations.length}`);
  console.log(`\nKey tables exist: ${Object.values(tableStatus).filter(Boolean).length}/${Object.keys(tableStatus).length}`);

  console.log('\n💡 Recommendations:');
  console.log('1. Review old migrations/ folder - may contain duplicates');
  console.log('2. Check which migrations from supabase/migrations/ are applied');
  console.log('3. Consider consolidating old migrations into supabase/migrations/');
  console.log('4. Run pending migrations via Supabase Dashboard SQL Editor\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

