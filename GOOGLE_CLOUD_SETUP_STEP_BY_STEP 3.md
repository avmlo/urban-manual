# Google Cloud Project Setup - Step by Step Guide

This is a complete, detailed step-by-step guide to set up Google Cloud for Discovery Engine integration.

---

## Prerequisites Checklist

Before starting, ensure you have:
- [ ] A Google account (Gmail account works)
- [ ] Access to Google Cloud Console
- [ ] A credit card for billing (required for Google Cloud, but free tier available)
- [ ] Basic understanding of APIs and cloud services

---

## Step 1: Create Google Cloud Account & Project

### 1.1 Access Google Cloud Console

1. Go to [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Sign in with your Google account
3. If this is your first time, you'll see a welcome screen

### 1.2 Create a New Project

1. Click on the **project dropdown** at the top of the page (next to "Google Cloud")
2. Click **"New Project"**
3. Fill in the project details:
   - **Project name**: `urban-manual` (or your preferred name)
   - **Project ID**: Will auto-generate (e.g., `urban-manual-123456`)
   - **Location**: Select your organization (or "No organization")
4. Click **"Create"**
5. Wait 10-30 seconds for the project to be created
6. **IMPORTANT**: Note down your **Project ID** - you'll need it later!

### 1.3 Enable Billing (Required)

1. In the left sidebar, click **"Billing"**
2. If you don't have a billing account:
   - Click **"Link a billing account"**
   - Click **"Create billing account"**
   - Fill in your information
   - Add a payment method (credit card)
   - Complete the setup
3. **Note**: Google Cloud offers a $300 free credit for new accounts, and Discovery Engine has a free tier

---

## Step 2: Enable Discovery Engine API

### 2.1 Navigate to APIs & Services

1. In the left sidebar, click **"APIs & Services"** → **"Library"**
   - Or go directly: [https://console.cloud.google.com/apis/library](https://console.cloud.google.com/apis/library)

### 2.2 Search for Discovery Engine API

1. In the search bar at the top, type: **"Discovery Engine API"**
2. Click on **"Discovery Engine API"** from the results

### 2.3 Enable the API

1. Click the **"Enable"** button
2. Wait 1-2 minutes for the API to be enabled
3. You'll see a confirmation message: "API enabled"

### 2.4 Verify API is Enabled

1. Go to **"APIs & Services"** → **"Enabled APIs"**
2. You should see **"Discovery Engine API"** in the list

---

## Step 3: Create Service Account

### 3.1 Navigate to Service Accounts

1. In the left sidebar, click **"IAM & Admin"** → **"Service Accounts"**
   - Or go directly: [https://console.cloud.google.com/iam-admin/serviceaccounts](https://console.cloud.google.com/iam-admin/serviceaccounts)

### 3.2 Create New Service Account

1. Click the **"Create Service Account"** button at the top
2. Fill in the details:
   - **Service account name**: `discovery-engine-service`
   - **Service account ID**: Will auto-fill (e.g., `discovery-engine-service`)
   - **Description**: `Service account for Discovery Engine integration`
3. Click **"Create and Continue"**

### 3.3 Grant Permissions

1. In the **"Grant this service account access to project"** section:
2. Click **"Select a role"** dropdown
3. Search for and select: **"Discovery Engine API Admin"**
   - If not available, select: **"Discovery Engine API User"**
4. Click **"Add Another Role"** (optional, for Cloud Storage if needed)
5. Click **"Continue"**

### 3.4 Grant User Access (Optional)

1. You can skip this step for now
2. Click **"Done"**

### 3.5 Create and Download Key

1. Find your service account in the list (should be `discovery-engine-service@your-project-id.iam.gserviceaccount.com`)
2. Click on the service account name
3. Go to the **"Keys"** tab
4. Click **"Add Key"** → **"Create new key"**
5. Select **"JSON"** as the key type
6. Click **"Create"**
7. **IMPORTANT**: The JSON file will download automatically - **SAVE THIS FILE SECURELY!**
   - This file contains credentials - never commit it to git
   - Store it in a secure location
   - You'll need this file for authentication

---

## Step 4: Create Discovery Engine Data Store

### 4.1 Navigate to Discovery Engine

1. In the left sidebar, look for **"Discovery Engine"** or **"Vertex AI Search"**
   - If you don't see it, go to: [https://console.cloud.google.com/gen-app-builder](https://console.cloud.google.com/gen-app-builder)
2. Click on **"Data Stores"** in the left sidebar

### 4.2 Create Data Store

1. Click **"Create Data Store"** button
2. Fill in the configuration:

   **Basic Information:**
   - **Data Store Name**: `urban-manual-destinations`
   - **Data Store ID**: Will auto-generate (usually matches the name)
   - **Description**: `Data store for Urban Manual destinations`

   **Data Store Type:**
   - Select **"Generic"** (for general search and recommendations)
   - Or **"Retail"** if you want retail-specific features

   **Location:**
   - Select **"Global"** (recommended for best performance)
   - Or choose a specific region (e.g., `us-central1`, `europe-west1`)

3. Click **"Create"**
4. Wait 2-5 minutes for the data store to be created
5. **IMPORTANT**: Note down the **Data Store ID** - you'll need it later!

### 4.3 Verify Data Store

1. You should see your data store in the list
2. Click on it to see details
3. Note the **Data Store Path** (format: `projects/{project-id}/locations/{location}/dataStores/{data-store-id}`)

---

## Step 5: Configure Environment Variables

### 5.1 Collect Required Information

You should now have:
- ✅ **Project ID**: `your-project-id-here`
- ✅ **Data Store ID**: `urban-manual-destinations`
- ✅ **Location**: `global` (or your chosen location)
- ✅ **Service Account JSON**: Downloaded file path

### 5.2 Local Development Setup

1. Open your project's `.env.local` file (create if it doesn't exist)
2. Add the following variables:

```bash
# Google Cloud Project Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id-here
DISCOVERY_ENGINE_DATA_STORE_ID=urban-manual-destinations
GOOGLE_CLOUD_LOCATION=global

# Service Account Credentials
# Option 1: Path to JSON file (recommended for local)
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/your-service-account-key.json
```

3. Replace `your-project-id-here` with your actual Project ID
4. Replace `/absolute/path/to/your-service-account-key.json` with the actual path to your downloaded JSON file
   - **Example**: `/Users/alxrhg/Downloads/urban-manual-123456-abc123.json`

### 5.3 Vercel Production Setup

#### Option A: Using Vercel Environment Variables (Recommended)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:

   **Variable 1:**
   - **Name**: `GOOGLE_CLOUD_PROJECT_ID`
   - **Value**: `your-project-id-here`
   - **Environment**: Production, Preview, Development (select all)

   **Variable 2:**
   - **Name**: `DISCOVERY_ENGINE_DATA_STORE_ID`
   - **Value**: `urban-manual-destinations`
   - **Environment**: Production, Preview, Development

   **Variable 3:**
   - **Name**: `GOOGLE_CLOUD_LOCATION`
   - **Value**: `global`
   - **Environment**: Production, Preview, Development

   **Variable 4 (Service Account):**
   - **Name**: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - **Value**: Open your service account JSON file, copy the entire contents, and paste it as a single-line JSON string
   - **Environment**: Production, Preview, Development
   - **Note**: You may need to escape quotes or use a JSON minifier

#### Option B: Using Vercel Secret Files (Alternative)

1. In Vercel, go to **Settings** → **Secret Files**
2. Upload your service account JSON file
3. Reference it in your code using the secret file path

### 5.4 Alternative: Use gcloud CLI (Local Development)

If you prefer not to use a service account file:

1. Install gcloud CLI:
   ```bash
   # macOS
   brew install google-cloud-sdk
   
   # Or download from: https://cloud.google.com/sdk/docs/install
   ```

2. Authenticate:
   ```bash
   gcloud auth application-default login
   ```

3. Set your project:
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

4. This will automatically configure credentials - no need for `GOOGLE_APPLICATION_CREDENTIALS`

---

## Step 6: Verify Setup

### 6.1 Test Service Account Access

1. In your terminal, navigate to your project:
   ```bash
   cd /Users/alxrhg/urban-manual
   ```

2. Test if credentials work:
   ```bash
   # If using service account file
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your-key.json"
   export GOOGLE_CLOUD_PROJECT_ID="your-project-id"
   
   # Test with a simple command (if you have gcloud CLI)
   gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID
   ```

### 6.2 Test Discovery Engine Connection

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Test the search endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/search/discovery \
     -H "Content-Type: application/json" \
     -d '{
       "query": "test",
       "pageSize": 5
     }'
   ```

3. If configured correctly, you should get a response (even if empty results)
4. If you get an error, check the troubleshooting section below

---

## Step 7: Export and Import Data

### 7.1 Export Data from Supabase

1. Make sure your environment variables are set
2. Run the export script:
   ```bash
   npm run discovery:export
   ```

3. This creates `discovery-engine-export.json` with all your destinations
4. Verify the file was created and contains data

### 7.2 Import Data to Discovery Engine

1. Review the export file to ensure data looks correct
2. Run the import script:
   ```bash
   npm run discovery:import
   ```

3. The script will:
   - Transform destinations to Discovery Engine format
   - Import in batches (100 at a time)
   - Show progress and any errors

4. Wait for import to complete (may take several minutes for large datasets)

### 7.3 Verify Data Import

1. Go to Google Cloud Console → **Discovery Engine** → **Data Stores**
2. Click on your data store
3. Check the **"Documents"** tab to see imported documents
4. You should see your destinations listed

---

## Step 8: Test All Features

### 8.1 Test Basic Search

```bash
curl -X POST http://localhost:3000/api/search/discovery \
  -H "Content-Type: application/json" \
  -d '{
    "query": "romantic restaurant",
    "city": "paris",
    "pageSize": 10
  }'
```

### 8.2 Test Recommendations

```bash
curl "http://localhost:3000/api/recommendations/discovery?userId=test-user&pageSize=5"
```

### 8.3 Test Event Tracking

```bash
curl -X POST http://localhost:3000/api/discovery/track-event \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "eventType": "view",
    "documentId": "destination-slug"
  }'
```

### 8.4 Test Advanced Features

```bash
# Conversational search
curl -X POST http://localhost:3000/api/discovery/search/conversational \
  -H "Content-Type: application/json" \
  -d '{
    "query": "what about something cheaper?",
    "conversationHistory": ["romantic restaurants in paris"]
  }'

# Natural language search
curl -X POST http://localhost:3000/api/discovery/search/natural-language \
  -H "Content-Type: application/json" \
  -d '{
    "query": "romantic restaurants with outdoor seating under $50"
  }'
```

---

## Troubleshooting

### Issue: "Discovery Engine is not configured"

**Solution:**
1. Check that all environment variables are set:
   ```bash
   echo $GOOGLE_CLOUD_PROJECT_ID
   echo $DISCOVERY_ENGINE_DATA_STORE_ID
   echo $GOOGLE_CLOUD_LOCATION
   ```

2. Verify the service account JSON file exists and is readable
3. Check that the Project ID matches exactly (case-sensitive)

### Issue: "Permission denied" or "Authentication failed"

**Solution:**
1. Verify the service account has the correct role:
   - Go to **IAM & Admin** → **Service Accounts**
   - Click on your service account
   - Check the **"Permissions"** tab
   - Ensure it has **"Discovery Engine API Admin"** or **"Discovery Engine API User"**

2. For local development, try:
   ```bash
   gcloud auth application-default login
   ```

3. For Vercel, verify the JSON is correctly formatted in environment variables

### Issue: "Data store not found"

**Solution:**
1. Verify the Data Store ID matches exactly (case-sensitive)
2. Check that the data store exists in the correct location
3. Ensure you're using the correct Project ID
4. Go to Discovery Engine console and verify the data store name

### Issue: Import fails or shows errors

**Solution:**
1. Check that your exported JSON is valid:
   ```bash
   cat discovery-engine-export.json | jq .
   ```

2. Verify destination slugs/IDs are unique
3. Check Google Cloud Console → **Discovery Engine** → **Data Stores** → **Your Store** → **Operations** for detailed errors
4. Review the import script output for specific error messages

### Issue: High API costs

**Solution:**
1. Enable caching (already implemented in the code)
2. Monitor usage in Google Cloud Console → **Billing**
3. Set up billing alerts
4. Review the cost optimization section in `DISCOVERY_ENGINE_SETUP.md`

---

## Quick Reference Checklist

Use this checklist to ensure everything is set up:

- [ ] Google Cloud project created
- [ ] Project ID noted down
- [ ] Billing account linked
- [ ] Discovery Engine API enabled
- [ ] Service account created
- [ ] Service account key (JSON) downloaded and saved securely
- [ ] Service account has "Discovery Engine API Admin" role
- [ ] Data store created
- [ ] Data store ID noted down
- [ ] Environment variables configured (local)
- [ ] Environment variables configured (Vercel)
- [ ] Data exported from Supabase
- [ ] Data imported to Discovery Engine
- [ ] Search endpoint tested
- [ ] Recommendations endpoint tested
- [ ] Event tracking tested

---

## Next Steps

Once setup is complete:

1. ✅ Enable feature flags in environment variables:
   ```bash
   USE_DISCOVERY_ENGINE=true
   USE_CONVERSATIONAL_SEARCH=true
   ENABLE_DISCOVERY_PERSONALIZATION=true
   ```

2. ✅ Integrate into your UI using the integration utilities:
   ```typescript
   import { unifiedSearch } from '@/lib/discovery-engine/integration';
   ```

3. ✅ Set up monitoring:
   - Check `/api/discovery/monitoring/performance`
   - Set up billing alerts in Google Cloud Console

4. ✅ Review the usage guide: `DISCOVERY_ENGINE_USAGE_GUIDE.md`

---

## Support & Resources

- **Google Cloud Console**: [https://console.cloud.google.com/](https://console.cloud.google.com/)
- **Discovery Engine Docs**: [https://cloud.google.com/generative-ai-app-builder/docs](https://cloud.google.com/generative-ai-app-builder/docs)
- **API Reference**: [https://cloud.google.com/generative-ai-app-builder/docs/reference/rest](https://cloud.google.com/generative-ai-app-builder/docs/reference/rest)
- **Pricing**: [https://cloud.google.com/generative-ai-app-builder/pricing](https://cloud.google.com/generative-ai-app-builder/pricing)

---

## Security Best Practices

1. **Never commit service account keys to git**
   - Add `*.json` to `.gitignore` if storing keys locally
   - Use environment variables or secret management

2. **Rotate keys regularly**
   - Create new keys every 90 days
   - Delete old keys after rotation

3. **Use least privilege**
   - Only grant necessary permissions
   - Use "Discovery Engine API User" instead of "Admin" if possible

4. **Monitor access**
   - Review service account usage in Cloud Console
   - Set up audit logs

---

**You're all set!** 🎉

If you encounter any issues, refer to the troubleshooting section or check the detailed setup guide in `DISCOVERY_ENGINE_SETUP.md`.

