# Using Existing Google Cloud Project for Discovery Engine

If you already have a Google Cloud project with API keys set up (for Google Places API, Gemini, etc.), you can use the **same project** for Discovery Engine. Here's how to add Discovery Engine to your existing setup.

---

## Quick Setup for Existing Google Cloud Project

Since you already have:
- ✅ Google Cloud project
- ✅ `GOOGLE_API_KEY` or `NEXT_PUBLIC_GOOGLE_API_KEY` configured
- ✅ Billing enabled
- ✅ Some APIs already enabled (Places API, Gemini API, etc.)

You just need to add Discovery Engine to your existing project!

---

## Step 1: Enable Discovery Engine API (2 minutes)

### 1.1 Navigate to API Library

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure you're in your **existing project** (the one with your current API keys)
3. Go to **APIs & Services** → **Library**
   - Or directly: [https://console.cloud.google.com/apis/library](https://console.cloud.google.com/apis/library)

### 1.2 Enable Discovery Engine API

1. Search for: **"Discovery Engine API"**
2. Click on **"Discovery Engine API"**
3. Click **"Enable"**
4. Wait 1-2 minutes for it to enable

**That's it!** The API is now enabled in your existing project.

---

## Step 2: Create Service Account (3 minutes)

### 2.1 Navigate to Service Accounts

1. Go to **IAM & Admin** → **Service Accounts**
   - Or: [https://console.cloud.google.com/iam-admin/serviceaccounts](https://console.cloud.google.com/iam-admin/serviceaccounts)

### 2.2 Create Service Account

1. Click **"Create Service Account"**
2. Name: `discovery-engine-service`
3. Click **"Create and Continue"**

### 2.3 Grant Permissions

1. Click **"Select a role"**
2. Search and select: **"Discovery Engine API Admin"**
3. Click **"Continue"** → **"Done"**

### 2.4 Create Key

1. Click on the service account you just created
2. Go to **"Keys"** tab
3. Click **"Add Key"** → **"Create new key"**
4. Select **"JSON"**
5. Click **"Create"** and save the file securely

**Note**: You can also reuse an existing service account if you prefer, just add the Discovery Engine role to it.

---

## Step 3: Create Data Store (3 minutes)

### 3.1 Navigate to Discovery Engine

1. Go to **Discovery Engine** (or search for it in the console)
   - Or: [https://console.cloud.google.com/gen-app-builder](https://console.cloud.google.com/gen-app-builder)

### 3.2 Create Data Store

1. Click **"Data Stores"** → **"Create Data Store"**
2. Fill in:
   - **Name**: `urban-manual-destinations`
   - **Type**: **Generic**
   - **Location**: `global` (or your preferred region)
3. Click **"Create"**
4. Wait 2-5 minutes
5. **Note the Data Store ID** (usually matches the name)

---

## Step 4: Add Environment Variables

### 4.1 Find Your Project ID

1. In Google Cloud Console, click the project dropdown at the top
2. Your **Project ID** is shown there (e.g., `urban-manual-123456`)
3. Copy it

### 4.2 Update Your Environment Variables

Add these to your existing `.env.local` (or Vercel environment variables):

```bash
# Your existing Google API key (keep this!)
GOOGLE_API_KEY=your-existing-api-key-here
# OR
NEXT_PUBLIC_GOOGLE_API_KEY=your-existing-api-key-here

# NEW: Discovery Engine Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id-here
DISCOVERY_ENGINE_DATA_STORE_ID=urban-manual-destinations
GOOGLE_CLOUD_LOCATION=global

# NEW: Service Account (choose one method)
# Option 1: Path to JSON file (local development)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Option 2: Use gcloud CLI (local development)
# Just run: gcloud auth application-default login
# No need for GOOGLE_APPLICATION_CREDENTIALS

# Option 3: For Vercel - JSON as environment variable
# GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
```

### 4.3 Important Notes

- **Keep your existing `GOOGLE_API_KEY`** - it's still used for Places API, Gemini, etc.
- **Discovery Engine uses service account authentication** (different from API keys)
- **Both can coexist** - API keys for Places/Gemini, service account for Discovery Engine

---

## Step 5: Verify Setup

### 5.1 Check Your Project

Your Google Cloud project now has:
- ✅ **Places API** (existing)
- ✅ **Gemini API** (existing)
- ✅ **Discovery Engine API** (new)
- ✅ **Service Account** for Discovery Engine (new)
- ✅ **Data Store** for Discovery Engine (new)

### 5.2 Test Discovery Engine

```bash
# Test if Discovery Engine is configured
curl -X POST http://localhost:3000/api/search/discovery \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "pageSize": 5}'
```

If you get a response (even empty), it's working!

---

## Differences: API Keys vs Service Accounts

### Your Existing Setup (API Keys)
- **Used for**: Google Places API, Gemini API, Maps API
- **Environment variable**: `GOOGLE_API_KEY` or `NEXT_PUBLIC_GOOGLE_API_KEY`
- **Authentication**: Simple API key in headers
- **Where to get**: APIs & Services → Credentials → API Keys

### Discovery Engine Setup (Service Account)
- **Used for**: Discovery Engine API only
- **Environment variable**: `GOOGLE_APPLICATION_CREDENTIALS` (path to JSON file)
- **Authentication**: Service account JSON file
- **Where to get**: IAM & Admin → Service Accounts → Create Key

### Why Different?

- **API Keys**: Simple, for public APIs (Places, Maps, Gemini)
- **Service Accounts**: More secure, for admin operations (Discovery Engine data management)

**Both work together** - no conflict!

---

## Option: Use Same Service Account for Everything

If you want to simplify, you can:

1. Use your existing service account (if you have one)
2. Add the **"Discovery Engine API Admin"** role to it
3. Use that same service account JSON file

This way you only have one service account for all services.

---

## Vercel Configuration

### For Existing Vercel Project

1. Go to **Vercel** → Your Project → **Settings** → **Environment Variables**

2. **Keep your existing variables:**
   - `GOOGLE_API_KEY` (or `NEXT_PUBLIC_GOOGLE_API_KEY`)

3. **Add new Discovery Engine variables:**
   - `GOOGLE_CLOUD_PROJECT_ID` = your project ID
   - `DISCOVERY_ENGINE_DATA_STORE_ID` = `urban-manual-destinations`
   - `GOOGLE_CLOUD_LOCATION` = `global`

4. **Add service account JSON:**
   - Option A: Upload as secret file in Vercel
   - Option B: Add as `GOOGLE_APPLICATION_CREDENTIALS_JSON` (single-line JSON string)

### Example Vercel Environment Variables

```
# Existing (keep these)
GOOGLE_API_KEY=AIzaSy...your-existing-key
NEXT_PUBLIC_GOOGLE_API_KEY=AIzaSy...your-existing-key

# New Discovery Engine variables
GOOGLE_CLOUD_PROJECT_ID=urban-manual-123456
DISCOVERY_ENGINE_DATA_STORE_ID=urban-manual-destinations
GOOGLE_CLOUD_LOCATION=global

# Service account (new)
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"urban-manual-123456",...}
```

---

## Quick Checklist

- [ ] Enable Discovery Engine API in existing project
- [ ] Create service account (or use existing)
- [ ] Grant "Discovery Engine API Admin" role
- [ ] Download service account JSON key
- [ ] Create Discovery Engine data store
- [ ] Add `GOOGLE_CLOUD_PROJECT_ID` to environment variables
- [ ] Add `DISCOVERY_ENGINE_DATA_STORE_ID` to environment variables
- [ ] Add `GOOGLE_CLOUD_LOCATION` to environment variables
- [ ] Add `GOOGLE_APPLICATION_CREDENTIALS` (or use gcloud CLI)
- [ ] Keep your existing `GOOGLE_API_KEY` (still needed for Places/Gemini)
- [ ] Test Discovery Engine endpoint

---

## Common Questions

### Q: Do I need a new Google Cloud project?

**A:** No! Use your existing project. Just enable Discovery Engine API in it.

### Q: Will this affect my existing APIs?

**A:** No! Discovery Engine is separate. Your Places API, Gemini API, etc. will continue working exactly as before.

### Q: Can I use the same API key?

**A:** No, Discovery Engine requires a service account (not an API key). But you can keep using your API key for Places/Gemini.

### Q: Do I need to change my existing code?

**A:** No! Your existing code using `GOOGLE_API_KEY` will continue working. Discovery Engine is an additional service.

### Q: Will this cost more?

**A:** Discovery Engine has its own pricing (separate from Places/Gemini). See cost estimates in `DISCOVERY_ENGINE_SETUP.md`.

---

## Troubleshooting

### "Discovery Engine is not configured"

- Check that `GOOGLE_CLOUD_PROJECT_ID` is set
- Check that `DISCOVERY_ENGINE_DATA_STORE_ID` is set
- Verify service account JSON file exists and is readable

### "Permission denied"

- Ensure service account has "Discovery Engine API Admin" role
- Check that Discovery Engine API is enabled in your project

### Existing APIs stop working

- This shouldn't happen, but if it does:
  - Check that your `GOOGLE_API_KEY` is still set
  - Verify Places API and Gemini API are still enabled
  - Check billing is still active

---

## Summary

**You can use your existing Google Cloud project!** Just:

1. ✅ Enable Discovery Engine API (2 min)
2. ✅ Create service account (3 min)
3. ✅ Create data store (3 min)
4. ✅ Add 3 new environment variables
5. ✅ Keep your existing `GOOGLE_API_KEY`

**Total time: ~10 minutes** to add Discovery Engine to your existing setup!

Your existing APIs (Places, Gemini, etc.) will continue working exactly as before. Discovery Engine is just an additional service in the same project.

---

## Next Steps

1. ✅ Export data: `npm run discovery:export`
2. ✅ Import data: `npm run discovery:import`
3. ✅ Test search: Use the test endpoint above
4. ✅ Enable features: Set `USE_DISCOVERY_ENGINE=true` in environment variables

For detailed setup, see `GOOGLE_CLOUD_SETUP_STEP_BY_STEP.md` (skip steps 1-2 since you already have a project).

