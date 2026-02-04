/**
 * Test script for Intelligence Layer Endpoints
 * 
 * Tests:
 * - /api/personalization/[user_id]
 * - /api/trending
 * - /api/similar/[id]
 * - /api/cron/compute-intelligence
 * 
 * Run: npx tsx scripts/test-intelligence-endpoints.ts
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

async function testEndpoint(name: string, url: string, options?: RequestInit) {
  console.log(`\n🧪 Testing ${name}...`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`   ✅ Success (${response.status})`);
      console.log(`   📊 Response keys:`, Object.keys(data));
      if (Array.isArray(data.results || data.trending || data.similar)) {
        const results = data.results || data.trending || data.similar || [];
        console.log(`   📈 Results count: ${results.length}`);
        if (results.length > 0) {
          console.log(`   🔍 First result:`, {
            id: results[0].id,
            name: results[0].name,
            city: results[0].city,
            category: results[0].category,
          });
        }
      }
      return { success: true, data };
    } else {
      console.log(`   ❌ Failed (${response.status})`);
      console.log(`   Error:`, data);
      return { success: false, error: data };
    }
  } catch (error: any) {
    console.log(`   ❌ Exception:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting Intelligence Layer Endpoint Tests\n');
  console.log(`📍 Base URL: ${BASE_URL}\n`);

  const results: Record<string, any> = {};

  // Test 1: Trending endpoint
  results.trending = await testEndpoint(
    'Trending Destinations',
    `${BASE_URL}/api/trending?limit=5`
  );

  // Test 2: Trending with city filter
  results.trendingCity = await testEndpoint(
    'Trending Destinations (Tokyo)',
    `${BASE_URL}/api/trending?city=tokyo&limit=5`
  );

  // Test 3: Similar destinations (need a valid destination ID)
  // This will fail if no destinations exist, but that's okay for testing
  results.similar = await testEndpoint(
    'Similar Destinations',
    `${BASE_URL}/api/similar/1` // Assuming at least one destination exists
  );

  // Test 4: Personalization (requires auth - will likely fail in test)
  // This is expected to fail without auth, but we test the endpoint structure
  const testUserId = '00000000-0000-0000-0000-000000000000'; // Placeholder UUID
  results.personalization = await testEndpoint(
    'Personalization (requires auth)',
    `${BASE_URL}/api/personalization/${testUserId}`
  );

  // Test 5: Cron job (requires auth header)
  // This will fail without proper auth, but tests the endpoint
  results.cron = await testEndpoint(
    'Cron Job (requires auth)',
    `${BASE_URL}/api/cron/compute-intelligence`,
    {
      headers: {
        'x-vercel-cron': '1', // Vercel's built-in cron header
      },
    }
  );

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  
  Object.entries(results).forEach(([name, result]) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${name}`);
  });

  const successCount = Object.values(results).filter((r: any) => r.success).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`\n📈 Success Rate: ${successCount}/${totalCount} (${Math.round(successCount / totalCount * 100)}%)`);
  
  console.log('\n💡 Note: Some endpoints may fail without proper authentication or data.');
  console.log('   This is expected - the important thing is that endpoints are accessible.');
}

main().catch(console.error);

