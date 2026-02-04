/**
 * Script to update multi-source trends (Reddit, News, Eventbrite)
 * Run this periodically to keep trends updated
 */

import { createServiceRoleClient } from '../../lib/supabase-server';
import { fetchRedditTrends } from '../../lib/reddit-trends';
import { fetchNewsTrends, fetchGNewsTrends } from '../../lib/news-trends';
import { fetchEventbriteTrends } from '../../lib/eventbrite-trends';

async function updateMultiSourceTrends() {
  console.log('🔄 Starting multi-source trends update...');

  const supabase = createServiceRoleClient();
  if (!supabase) {
    console.error('❌ Supabase client not available');
    process.exit(1);
  }

  try {
    // Get destinations that need updating (limit to avoid rate limits)
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('id, name, city')
      .limit(20); // Process 20 at a time

    if (error) throw error;

    if (!destinations || destinations.length === 0) {
      console.log('✅ No destinations to update');
      return;
    }

    console.log(`📊 Found ${destinations.length} destinations to update`);

    const results = {
      reddit: 0,
      news: 0,
      eventbrite: 0,
      errors: [] as string[],
    };

    // Update each destination
    for (const dest of destinations) {
      try {
        // Reddit trends
        console.log(`📱 Updating Reddit trends for ${dest.name}...`);
        const redditData = await fetchRedditTrends(dest.name, dest.city);
        
        await supabase
          .from('destinations')
          .update({
            reddit_mention_count: redditData.mentionCount,
            reddit_upvote_score: redditData.upvoteScore,
            reddit_trending_subreddits: redditData.trendingSubreddits,
            reddit_updated_at: new Date().toISOString(),
          })
          .eq('id', dest.id);

        results.reddit++;
        await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting

        // News trends
        const newsApiKey = process.env.NEWS_API_KEY || process.env.GNEWS_API_KEY;
        if (newsApiKey) {
          console.log(`📰 Updating News trends for ${dest.name}...`);
          let newsData;
          if (process.env.GNEWS_API_KEY) {
            newsData = await fetchGNewsTrends(dest.name, dest.city, process.env.GNEWS_API_KEY);
          } else {
            newsData = await fetchNewsTrends(dest.name, dest.city, process.env.NEWS_API_KEY!);
          }

          if (newsData) {
            await supabase
              .from('destinations')
              .update({
                news_article_count: newsData.articleCount,
                news_sentiment_score: newsData.sentimentScore,
                news_top_sources: newsData.topSources,
                news_updated_at: new Date().toISOString(),
              })
              .eq('id', dest.id);

            results.news++;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Eventbrite trends (city-level, update once per city)
        const eventbriteApiKey = process.env.EVENTBRITE_API_KEY;
        if (eventbriteApiKey) {
          // Check if we've already updated this city
          const { data: cityUpdated } = await supabase
            .from('destinations')
            .select('eventbrite_updated_at')
            .eq('city', dest.city)
            .not('eventbrite_updated_at', 'is', null)
            .limit(1)
            .single();

          if (!cityUpdated) {
            console.log(`🎫 Updating Eventbrite trends for ${dest.city}...`);
            const eventData = await fetchEventbriteTrends(dest.city, eventbriteApiKey);
            
            await supabase
              .from('destinations')
              .update({
                eventbrite_event_count: eventData.upcomingEventCount,
                eventbrite_total_attendance: eventData.totalEventAttendance,
                eventbrite_event_categories: eventData.eventCategories,
                eventbrite_updated_at: new Date().toISOString(),
              })
              .eq('city', dest.city);

            results.eventbrite++;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } catch (error: any) {
        results.errors.push(`${dest.name}: ${error.message}`);
        console.error(`❌ Error updating ${dest.name}:`, error);
      }
    }

    console.log(`✅ Updated trends:`);
    console.log(`   Reddit: ${results.reddit}`);
    console.log(`   News: ${results.news}`);
    console.log(`   Eventbrite: ${results.eventbrite}`);

    if (results.errors.length > 0) {
      console.log(`⚠️  Errors: ${results.errors.length}`);
    }

    // Recompute multi-source trending scores
    console.log('🔄 Recomputing multi-source trending scores...');
    const { error: computeError } = await supabase.rpc('compute_multi_source_trending_scores');
    
    if (computeError) {
      console.error('❌ Error computing trending scores:', computeError);
    } else {
      console.log('✅ Trending scores recomputed');
    }

    console.log('🎉 Multi-source trends update complete!');
  } catch (error: any) {
    console.error('❌ Error updating multi-source trends:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  updateMultiSourceTrends()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { updateMultiSourceTrends };

