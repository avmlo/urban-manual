# Instagram & TikTok Integration Guide

## Overview
This guide explains how to integrate Instagram and TikTok data to enhance destination trending detection and social proof.

## What We Can Fetch

### Instagram Data
- **Hashtag counts**: Number of posts using destination-related hashtags
- **Post counts**: Recent posts mentioning the destination
- **Engagement metrics**: Likes, comments, engagement rates
- **Trending hashtags**: Most popular hashtags related to the destination
- **Recent posts**: Latest Instagram posts about the destination

### TikTok Data
- **Hashtag counts**: Number of videos using destination-related hashtags
- **Video counts**: Total videos about the destination
- **View metrics**: Total views, likes, shares, comments
- **Trending hashtags**: Most popular hashtags
- **Trending videos**: Viral videos about the destination
- **Engagement scores**: Calculated engagement rates

## API Options

### Instagram

#### Option 1: Instagram Graph API (Recommended)
**Requirements:**
- Facebook Developer Account
- Instagram Business Account
- Facebook App with Instagram Graph API access
- OAuth flow for access tokens

**Pros:**
- Official API
- Reliable data
- Good rate limits
- Location-based search

**Cons:**
- Requires business account
- Complex setup
- OAuth required

**Setup:**
1. Create Facebook App: https://developers.facebook.com/
2. Add Instagram Graph API product
3. Get access token
4. Use endpoints:
   - `/ig_hashtag_search` - Search hashtags
   - `/ig_location_search` - Search locations
   - `/{location-id}/media` - Get location media

#### Option 2: Third-Party APIs
**Options:**
- **Apify Instagram Scraper**: https://apify.com/apify/instagram-scraper
- **H4DataHub Instagram API**: https://h4datahub.com/instagram-api/
- **RapidAPI Instagram**: Various providers

**Pros:**
- Easier setup
- No OAuth required
- Good for public data

**Cons:**
- May violate ToS
- Rate limits vary
- Cost per request

### TikTok

#### Option 1: TikTok Business API
**Requirements:**
- TikTok Business Account
- TikTok Developer Account
- API access approval

**Pros:**
- Official API
- Reliable data
- Good documentation

**Cons:**
- Limited availability
- Requires business account
- Complex approval process

#### Option 2: TikTok Research API
**Requirements:**
- Academic/research institution
- Research proposal approval

**Pros:**
- Free for research
- Official API

**Cons:**
- Academic use only
- Limited endpoints
- Approval required

#### Option 3: Third-Party APIs (Recommended for now)
**Options:**
- **Apify TikTok Scraper**: https://apify.com/clockworks/tiktok-scraper
- **ZenRows TikTok API**: https://zenrows.com/products/scraper-api/social-media/tiktok
- **SocialKit TikTok APIs**: https://socialkit.dev/blog/introducing-socialkit-tiktok-apis

**Pros:**
- Easier setup
- Good for public data
- Multiple providers

**Cons:**
- May violate ToS
- Rate limits vary
- Cost per request

## Implementation

### Step 1: Choose Your Provider

For **Instagram**:
- Use Instagram Graph API if you have business account
- Use Apify/H4DataHub for easier setup

For **TikTok**:
- Use Apify/ZenRows/SocialKit for public data
- Use TikTok Business API if approved

### Step 2: Set Up Environment Variables

```bash
# Instagram
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token  # For Graph API
INSTAGRAM_API_KEY=your_third_party_api_key          # For third-party
INSTAGRAM_API_URL=https://api.example.com           # For third-party

# TikTok
TIKTOK_API_KEY=your_tiktok_api_key                  # For third-party
TIKTOK_API_URL=https://api.example.com              # For third-party
TIKTOK_PROVIDER=apify                                # apify, zenrows, socialkit
```

### Step 3: Run Migration

```bash
psql $DATABASE_URL -f supabase/migrations/411_add_instagram_tiktok_trending.sql
```

### Step 4: Update Trends

```bash
# Via script (when implemented)
npm run update:social-trends

# Or via API
curl -X POST http://localhost:3000/api/trends/social/update \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 20, "sources": ["instagram", "tiktok"]}'
```

## Enhanced Trending Algorithm

The new algorithm includes social media signals:

```
trending_score = 
  Internal Engagement (35%) +
  Google Trends (20%) +
  Instagram Engagement (10%) +
  TikTok Trending (8%) +
  Reddit Signals (8%) +
  News Mentions (8%) +
  Eventbrite Attendance (8%) +
  Trend Direction & Sentiment (3%)
```

## Use Cases

### 1. Social Proof
- Show Instagram post counts on destination cards
- Display TikTok video counts
- Highlight "Instagrammable" destinations

### 2. Trending Detection
- Identify viral destinations on TikTok
- Track Instagram hashtag growth
- Detect social media spikes

### 3. Content Curation
- Auto-curate Instagram photos for destinations
- Show recent TikTok videos
- Display user-generated content

### 4. Engagement Metrics
- Track social media engagement rates
- Compare Instagram vs TikTok popularity
- Identify platform-specific trends

## Rate Limiting

- **Instagram Graph API**: 200 calls/hour per user
- **TikTok Business API**: Varies by tier
- **Third-party APIs**: Varies by provider (typically 100-1000/day)

## Cost Estimates

- **Instagram Graph API**: Free (requires business account)
- **TikTok Business API**: Free (requires business account)
- **Apify**: $49-499/month (depending on usage)
- **ZenRows**: $29-299/month
- **SocialKit**: $19-199/month

## Legal Considerations

⚠️ **Important**: 
- Always comply with platform Terms of Service
- Respect user privacy
- Don't scrape without permission
- Use official APIs when possible
- Consider rate limits and API quotas

## Next Steps

1. Choose your API provider(s)
2. Set up API credentials
3. Run the migration
4. Implement the update script
5. Test with a few destinations
6. Set up scheduled updates (daily/weekly)

## Example Queries

### Check Instagram Data
```sql
SELECT slug, name, instagram_post_count, instagram_engagement_score, instagram_updated_at
FROM destinations
WHERE instagram_post_count > 0
ORDER BY instagram_engagement_score DESC
LIMIT 10;
```

### Check TikTok Data
```sql
SELECT slug, name, tiktok_video_count, tiktok_trending_score, tiktok_updated_at
FROM destinations
WHERE tiktok_video_count > 0
ORDER BY tiktok_trending_score DESC
LIMIT 10;
```

### Combined Social Trends
```sql
SELECT slug, name,
  instagram_engagement_score,
  tiktok_trending_score,
  trending_score
FROM destinations
WHERE instagram_engagement_score > 0 OR tiktok_trending_score > 0
ORDER BY trending_score DESC
LIMIT 20;
```

