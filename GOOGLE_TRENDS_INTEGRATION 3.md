# Google Trends Integration

## Overview
This integration enhances the trending places algorithm by incorporating Google Trends data, providing external search interest signals alongside internal engagement metrics.

## Features

### 1. Google Trends Data Collection
- Fetches search interest data for destinations (0-100 scale)
- Detects trend direction (rising, stable, falling)
- Captures related search queries
- Updates data daily to keep trends current

### 2. Enhanced Trending Algorithm
The new algorithm combines:
- **Internal Engagement (60%)**: Saves, visits, time decay
- **Google Trends Interest (30%)**: External search interest
- **Trend Direction Boost (10%)**: Bonus for rising trends

### 3. Database Schema
New columns added to `destinations` table:
- `google_trends_interest` (INTEGER): Search interest score 0-100
- `google_trends_direction` (TEXT): 'rising', 'stable', or 'falling'
- `google_trends_related_queries` (TEXT[]): Related search queries
- `google_trends_updated_at` (TIMESTAMPTZ): Last update timestamp

## Setup

### 1. Install Dependencies
```bash
npm install google-trends-api
```

### 2. Run Migration
```bash
# Apply the migration to add Google Trends columns
psql $DATABASE_URL -f supabase/migrations/409_add_google_trends.sql
```

### 3. Update Google Trends Data
Run the update script manually or set up a cron job:

```bash
# Manual update
npm run update:google-trends

# Or via API (requires GOOGLE_TRENDS_UPDATE_KEY)
curl -X POST http://localhost:3000/api/google-trends/update \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 50}'
```

### 4. Set Up Cron Job (Optional)
Add to Vercel cron or your scheduler:

```json
{
  "crons": [
    {
      "path": "/api/google-trends/update",
      "schedule": "0 2 * * *"
    }
  ]
}
```

## API Endpoints

### GET `/api/trending`
Enhanced trending endpoint that includes Google Trends data:

```typescript
// Basic usage
GET /api/trending?limit=10&city=tokyo

// Include Google Trends data
GET /api/trending?limit=10&include_google_trends=true
```

### GET `/api/google-trends/city`
Get city-level trending data:

```typescript
GET /api/google-trends/city?city=tokyo
```

### POST `/api/google-trends/update`
Update Google Trends data for destinations (requires auth):

```typescript
POST /api/google-trends/update
Authorization: Bearer YOUR_KEY
Content-Type: application/json

{
  "limit": 50,
  "city": "tokyo",  // optional
  "category": "Dining"  // optional
}
```

## Algorithm Details

### Enhanced Trending Score Formula
```
trending_score = 
  (internal_engagement * time_decay * 0.6) +
  (google_trends_interest / 100 * 0.3) +
  (trend_direction_boost * 0.1)
```

Where:
- `internal_engagement`: Log of (saves + visits) normalized to 0-1
- `time_decay`: Exponential decay based on last interaction
- `google_trends_interest`: Normalized 0-100 scale
- `trend_direction_boost`: +0.1 for rising, -0.05 for falling, 0 for stable

## Rate Limiting
Google Trends API has rate limits. The implementation:
- Processes destinations in batches of 5
- Adds 1 second delay between requests
- Adds 2 second delay between batches
- Updates destinations max once per 24 hours

## Environment Variables
Optional (for API endpoint protection):
```
GOOGLE_TRENDS_UPDATE_KEY=your-secret-key
```

## Usage Examples

### Fetch Trending Destinations
```typescript
const response = await fetch('/api/trending?limit=10&include_google_trends=true');
const { trending } = await response.json();

trending.forEach(dest => {
  console.log(`${dest.name}: ${dest.trending_score}`);
  if (dest.google_trends_direction === 'rising') {
    console.log('  📈 Rising on Google Trends!');
  }
});
```

### Update Trends for Specific City
```typescript
await fetch('/api/google-trends/update', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.GOOGLE_TRENDS_UPDATE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    limit: 50,
    city: 'tokyo',
  }),
});
```

## Benefits

1. **External Validation**: Google Trends provides independent validation of trending status
2. **Early Detection**: Can identify trending places before they show up in internal metrics
3. **Better Ranking**: Combines internal and external signals for more accurate trending
4. **Related Queries**: Captures what people are searching for related to destinations
5. **City-Level Insights**: Understand overall city trending patterns

## Limitations

- Google Trends API has rate limits (handled with batching)
- Some destinations may not have sufficient search volume
- Data updates require time (daily updates recommended)
- Free API has some limitations on historical data

## Future Enhancements

- [ ] Add category-level trending
- [ ] Implement trend prediction using historical data
- [ ] Add comparison between destinations
- [ ] Create trending alerts for significant changes
- [ ] Add visualization of trend over time

