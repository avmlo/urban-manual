/**
 * Script to update Google Trends data for destinations
 * Run this periodically (e.g., daily via cron) to keep trends updated
 */

import { createServiceRoleClient } from '../lib/supabase-server';
import { fetchBatchGoogleTrends } from '../lib/google-trends';

async function updateGoogleTrends() {
  console.log('🔄 Starting Google Trends update...');

  const supabase = createServiceRoleClient();
  if (!supabase) {
    console.error('❌ Supabase client not available');
    process.exit(1);
  }

  try {
    // Fetch destinations that need updating (limit to 50 per run to avoid rate limits)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('id, name, city, category, google_trends_updated_at')
      .or(`google_trends_updated_at.is.null,google_trends_updated_at.lt.${oneDayAgo}`)
      .limit(50);

    if (error) {
      throw error;
    }

    if (!destinations || destinations.length === 0) {
      console.log('✅ No destinations need updating');
      return;
    }

    console.log(`📊 Found ${destinations.length} destinations to update`);

    // Fetch Google Trends data
    const trendsData = await fetchBatchGoogleTrends(
      destinations.map(d => ({
        id: d.id,
        name: d.name,
        city: d.city,
      }))
    );

    console.log(`📈 Fetched trends for ${trendsData.size} destinations`);

    // Update destinations
    let updatedCount = 0;
    for (const [destinationId, trendData] of trendsData.entries()) {
      const { error: updateError } = await supabase.rpc('update_google_trends', {
        destination_id_param: destinationId,
        interest_value: trendData.searchInterest,
        direction_value: trendData.trendDirection,
        related_queries_value: trendData.relatedQueries || null,
      });

      if (updateError) {
        console.error(`❌ Failed to update destination ${destinationId}:`, updateError.message);
      } else {
        updatedCount++;
      }
    }

    console.log(`✅ Updated ${updatedCount} destinations`);

    // Recompute enhanced trending scores
    console.log('🔄 Recomputing enhanced trending scores...');
    const { error: computeError } = await supabase.rpc('compute_enhanced_trending_scores');
    
    if (computeError) {
      console.error('❌ Error computing trending scores:', computeError);
    } else {
      console.log('✅ Trending scores recomputed');
    }

    console.log('🎉 Google Trends update complete!');
  } catch (error: any) {
    console.error('❌ Error updating Google Trends:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  updateGoogleTrends()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { updateGoogleTrends };

