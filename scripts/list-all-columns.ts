/**
 * List ALL columns in the destinations table with full details
 * Usage: npm run list:all-columns
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase URL or Key not found in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listAllColumns() {
  try {
    console.log('📊 Fetching ALL destinations table columns...\n');

    // Get a sample row to see all columns
    const { data: sample, error: sampleError } = await supabase
      .from('destinations')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (sampleError) {
      console.error('❌ Error:', sampleError.message);
      return;
    }

    if (!sample) {
      console.log('⚠️  No destinations found in table.');
      return;
    }

    const columns = Object.keys(sample);
    const output: string[] = [];
    
    output.push('='.repeat(100));
    output.push('DESTINATIONS TABLE - ALL COLUMNS');
    output.push(`Total: ${columns.length} columns`);
    output.push('='.repeat(100));
    output.push('');

    // Show all columns with their types and sample values
    columns.forEach((col, idx) => {
      const value = sample[col as keyof typeof sample];
      let type = 'null';
      let sampleValue = 'null';
      
      if (value === null) {
        type = 'null';
        sampleValue = 'null';
      } else if (Array.isArray(value)) {
        type = `array[${value.length}]`;
        sampleValue = value.length > 0 ? JSON.stringify(value).substring(0, 50) + '...' : '[]';
      } else if (typeof value === 'object') {
        type = 'object';
        sampleValue = JSON.stringify(value).substring(0, 50) + '...';
      } else {
        type = typeof value;
        const strValue = String(value);
        sampleValue = strValue.length > 50 ? strValue.substring(0, 50) + '...' : strValue;
      }

      output.push(`${(idx + 1).toString().padStart(3, ' ')}. ${col.padEnd(50, ' ')} | ${type.padEnd(15, ' ')} | ${sampleValue}`);
    });

    output.push('');
    output.push('='.repeat(100));

    // Print to console
    console.log(output.join('\n'));

    // Also save to file
    const filePath = 'DESTINATIONS_COLUMNS.txt';
    writeFileSync(filePath, output.join('\n'));
    console.log(`\n💾 Also saved to: ${filePath}`);

    // Grouped summary
    console.log('\n\n📊 GROUPED SUMMARY:\n');
    
    const groups: Record<string, string[]> = {
      'Core Identity': ['id', 'slug', 'name', 'city', 'country', 'neighborhood', 'category'],
      'Content': ['description', 'content', 'micro_description', 'subline', 'short_summary', 'ai_summary', 'ai_short_summary'],
      'Images': ['image', 'image_thumbnail', 'image_original', 'main_image', 'primary_photo_url', 'photos_json', 'photo_count', 'additional_images', 'gallery'],
      'Location': ['latitude', 'longitude', 'lat', 'long', 'address', 'formatted_address', 'vicinity', 'plus_code', 'timezone_id', 'utc_offset'],
      'Architect/Design': ['design_firm', 'architectural_style', 'designer_name', 'interior_style', 'design_period', 'architect_info_json'],
      'Ratings & Reviews': ['rating', 'user_ratings_total', 'reviews_json', 'reviews_count', 'popularity_score', 'data_quality_score'],
      'Price': ['price_level', 'price_range', 'price_range_local', 'exchange_rate_to_usd', 'currency_code'],
      'Hours & Status': ['opening_hours', 'opening_hours_json', 'current_opening_hours_json', 'secondary_opening_hours_json', 'is_open_now', 'business_status'],
      'Contact': ['phone_number', 'international_phone_number', 'email', 'website', 'booking_url', 'opentable_url', 'resy_url', 'reservation_phone'],
      'Google Places': ['place_id', 'google_place_id', 'google_name', 'google_maps_url', 'editorial_summary', 'place_types_json', 'adr_address', 'address_components_json', 'icon_url', 'icon_background_color', 'icon_mask_base_uri'],
      'Tags & Keywords': ['tags', 'style_tags', 'ambience_tags', 'experience_tags', 'vibe_tags', 'ai_vibe_tags', 'keywords', 'ai_keywords', 'ai_search_keywords', 'search_keywords', 'search_text'],
      'Embeddings & AI': ['embedding', 'vector_embedding', 'embedding_model', 'embedding_version', 'embedding_generated_at', 'embedding_updated_at', 'embedding_needs_update', 'ai_generated_at', 'ai_fields_generated_at'],
      'Social Media': ['instagram', 'instagram_handle', 'instagram_url', 'instagram_hashtag_count', 'instagram_post_count', 'instagram_total_likes', 'instagram_total_comments', 'instagram_engagement_score', 'instagram_trending_hashtags', 'instagram_updated_at'],
      'TikTok': ['tiktok_hashtag_count', 'tiktok_trending_hashtags', 'tiktok_video_count', 'tiktok_total_views', 'tiktok_total_likes', 'tiktok_total_shares', 'tiktok_engagement_score', 'tiktok_trending_score', 'tiktok_updated_at'],
      'Reddit': ['reddit_mention_count', 'reddit_upvote_score', 'reddit_trending_subreddits', 'reddit_updated_at'],
      'News': ['news_article_count', 'news_sentiment_score', 'news_top_sources', 'news_updated_at'],
      'Events': ['nearby_events_json', 'events_updated_at', 'upcoming_event_count', 'eventbrite_event_count', 'eventbrite_total_attendance', 'eventbrite_event_categories', 'eventbrite_updated_at'],
      'Weather': ['current_weather_json', 'weather_forecast_json', 'weather_updated_at'],
      'Routes': ['route_from_city_center_json', 'walking_time_from_center_minutes', 'driving_time_from_center_minutes', 'transit_time_from_center_minutes', 'distance_from_center_meters'],
      'Maps': ['static_map_url', 'static_map_generated_at'],
      'Currency': ['currency_updated_at'],
      'Nearby': ['nearby_destinations_json', 'nearby_updated_at'],
      'Photo Analysis': ['photo_analysis_json', 'image_captions'],
      'Restaurant Specific': ['cuisine_type', 'dietary_options', 'chef_name', 'michelin_stars', 'michelin_keys', 'avg_wait_time_minutes', 'accepts_reservations'],
      'Hotel Specific': ['year_opened', 'year_established', 'amenities'],
      'Design Details': ['atmosphere', 'color_palette', 'dominant_colors', 'materials'],
      'Accessibility': ['wheelchair_accessible', 'parking_available'],
      'Engagement': ['save_count', 'saves_count', 'views_count', 'visits_count', 'trending_score', 'rank_score'],
      'Relationships': ['parent_destination_id', 'related_destinations'],
      'Branding': ['brand', 'crown'],
      'Seasonality': ['best_visit_months', 'best_months', 'peak_season'],
      'Web Content (Exa)': ['web_content_json', 'web_content_updated_at', 'architect_info_updated_at'],
      'Enrichment Tracking': ['last_enriched', 'last_enriched_at', 'advanced_enrichment_at', 'enrichment_version'],
      'Indexing': ['last_indexed_at'],
      'Other': [],
    };

    // Categorize all columns
    const categorized: Record<string, string[]> = {};
    const uncategorized: string[] = [];

    columns.forEach(col => {
      let found = false;
      for (const [group, cols] of Object.entries(groups)) {
        if (cols.includes(col)) {
          if (!categorized[group]) categorized[group] = [];
          categorized[group].push(col);
          found = true;
          break;
        }
      }
      if (!found) {
        uncategorized.push(col);
      }
    });

    // Print grouped
    Object.entries(categorized).forEach(([group, cols]) => {
      if (cols.length > 0) {
        console.log(`\n📁 ${group} (${cols.length}):`);
        cols.forEach(col => console.log(`   - ${col}`));
      }
    });

    if (uncategorized.length > 0) {
      console.log(`\n📁 Uncategorized (${uncategorized.length}):`);
      uncategorized.forEach(col => console.log(`   - ${col}`));
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

listAllColumns().catch(console.error);

