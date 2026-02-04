# Google Places API Local Setup Guide

This guide will help you set up and test Google Places API locally.

## Prerequisites

1. **Google Cloud Account**: You need a Google Cloud account with billing enabled
2. **API Key**: A Google Cloud API key with Places API (New) enabled
3. **Environment Variables**: Add your API key to `.env.local`

## Step 1: Get Your Google API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **API Key**
5. Copy your API key

## Step 2: Enable Places API (New)

1. Go to **APIs & Services** → **Library**
2. Search for "Places API (New)"
3. Click on it and click **Enable**
4. Make sure billing is enabled (Places API requires billing)

## Step 3: Configure Environment Variables

Add your Google API key to `.env.local`:

```bash
# Google Places API
GOOGLE_API_KEY=your-api-key-here
# OR use NEXT_PUBLIC_GOOGLE_API_KEY if you need it in the browser
NEXT_PUBLIC_GOOGLE_API_KEY=your-api-key-here
```

**Note**: 
- Use `GOOGLE_API_KEY` for server-side only (more secure)
- Use `NEXT_PUBLIC_GOOGLE_API_KEY` if you need it in client-side code
- The code checks for both, but prefers `GOOGLE_API_KEY` for server-side routes

## Step 4: Test the API

Run the test script to verify everything is working:

```bash
npm run test:google-places
```

This will test:
1. ✅ Text Search API
2. ✅ Place Details API  
3. ✅ Autocomplete API

## Step 5: Usage in Your App

### Server-Side Routes

The API routes use the Google Places API automatically:

- **`/api/enrich-google`** - Enrich destinations with Google Places data
- **`/api/google-places-autocomplete`** - Autocomplete suggestions
- **`/api/fetch-google-place`** - Fetch place details by ID

### Example Usage

```typescript
// Enrich a destination
const response = await fetch('/api/enrich-google', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Le Meurice',
    city: 'Paris'
  })
});

const data = await response.json();
console.log(data);
```

## API Endpoints Available

### 1. Text Search
```typescript
POST https://places.googleapis.com/v1/places:searchText
Headers:
  X-Goog-Api-Key: your-api-key
  X-Goog-FieldMask: places.id,places.displayName,places.rating
Body:
  {
    textQuery: "Le Meurice, Paris",
    maxResultCount: 1
  }
```

### 2. Place Details
```typescript
GET https://places.googleapis.com/v1/places/{placeId}
Headers:
  X-Goog-Api-Key: your-api-key
  X-Goog-FieldMask: displayName,rating,priceLevel,formattedAddress
```

### 3. Autocomplete
```typescript
POST https://places.googleapis.com/v1/places:autocomplete
Headers:
  X-Goog-Api-Key: your-api-key
Body:
  {
    input: "Le Meurice",
    languageCode: "en"
  }
```

## Billing & Quotas

Google Places API (New) pricing:
- **Text Search**: $17 per 1,000 requests
- **Place Details**: $17 per 1,000 requests (basic), $70 per 1,000 (contact)
- **Autocomplete**: $2.83 per 1,000 requests

**Free Tier**: $200 credit per month (covers ~11,000 basic requests)

## Troubleshooting

### Error: "API key not valid"
- Make sure your API key is correct
- Check that Places API (New) is enabled in Google Cloud Console
- Verify billing is enabled

### Error: "This API project is not authorized to use this API"
- Go to Google Cloud Console → APIs & Services → Library
- Search for "Places API (New)" and enable it

### Error: "Billing is required"
- Enable billing in Google Cloud Console
- Go to Billing → Link a billing account

### Error: "Quota exceeded"
- Check your usage in Google Cloud Console
- You may need to increase quotas or wait for reset

## Security Best Practices

1. **Restrict API Key**: 
   - Go to Google Cloud Console → APIs & Services → Credentials
   - Click on your API key
   - Under "API restrictions", select "Restrict key"
   - Choose "Places API (New)" only
   - Under "Application restrictions", restrict to your domain/IP

2. **Use Server-Side Routes**: 
   - Keep `GOOGLE_API_KEY` server-side only
   - Never expose API keys in client-side code

3. **Monitor Usage**:
   - Set up billing alerts in Google Cloud Console
   - Monitor API usage regularly

## Related Files

- `lib/enrichment.ts` - Core enrichment functions
- `app/api/enrich-google/route.ts` - Enrichment API endpoint
- `app/api/google-places-autocomplete/route.ts` - Autocomplete endpoint
- `scripts/test-google-places.ts` - Test script
- `scripts/enrich-with-google.ts` - Batch enrichment script

## Next Steps

1. Run `npm run test:google-places` to verify setup
2. Test enrichment endpoint: `POST /api/enrich-google`
3. Use in your destination enrichment workflow
4. Monitor API usage in Google Cloud Console

