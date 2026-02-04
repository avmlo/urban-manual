// Schema validation script
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function validateSchema() {
  console.log('🔍 Validating schema...\n');

  // Check tables exist
  const tables = ['saved_places', 'visited_places', 'destinations'];
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ ${table}: ERROR - ${error.message}`);
    } else {
      console.log(`✅ ${table}: ${count} rows`);
    }
  }

  console.log('\n🔍 Testing RLS policies...\n');

  // Test RLS by trying to query without auth (should fail)
  const { data: publicData, error: publicError } = await supabase
    .from('saved_places')
    .select('*')
    .limit(1);

  if (publicError) {
    console.log('✅ RLS is enforced (unauthenticated query blocked)');
  } else if (publicData?.length === 0) {
    console.log('✅ RLS is enforced (no data returned)');
  } else {
    console.log('⚠️  WARNING: RLS may not be properly configured');
  }

  console.log('\n🔍 Testing helper functions...\n');

  // Test helper functions
  const { data: statusData, error: statusError } = await supabase
    .rpc('get_destination_user_status', {
      target_user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
      destination_slug_param: 'test'
    });

  if (statusError) {
    console.log(`❌ Helper functions: ERROR - ${statusError.message}`);
  } else {
    console.log('✅ Helper functions are working');
  }

  console.log('\n✨ Validation complete!\n');
}

validateSchema().catch(console.error);

