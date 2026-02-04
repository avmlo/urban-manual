# Creating Discovery Engine Data Store - Official Guide

Based on the [official Google Cloud documentation](https://cloud.google.com/generative-ai-app-builder/docs/create-datastore-ingest), here's how to create your data store correctly.

## Data Store Types

For Urban Manual, you need a **structured data store** because we're importing destination data (products/catalog).

## Import Methods for Structured Data

According to the documentation, for structured data you have three options:

1. **Import from BigQuery** - If your data is in BigQuery
2. **Import from Cloud Storage** - If your data is in a Cloud Storage bucket
3. **Upload structured JSON data with the API** - Manual upload via API calls

## What to Choose During Creation

### Option 1: Cloud Storage (Recommended for Setup)

1. Select **"Cloud Storage"** as the import source
2. You can:
   - Create an empty bucket (we won't use it)
   - Or skip the bucket configuration if possible
3. Complete the data store creation

**Why this works:** Even if you select Cloud Storage, you can still use API imports later. The import source selection is just for the initial setup method.

### Option 2: BigQuery (Alternative)

1. Select **"BigQuery"** as the import source
2. You can skip the table selection or create an empty dataset
3. Complete the data store creation

**Note:** We'll still use API imports for actual data, not BigQuery.

### Option 3: Skip if Possible

If the UI allows you to skip the import source selection:
1. Click **"Skip"** or **"Continue without data"**
2. Create an empty data store
3. Import data via API after creation

## After Data Store Creation

Once your data store is created, you'll import data using the **API method**:

```bash
# 1. Export from Supabase
npm run discovery:export

# 2. Import via API (this is the "Upload structured JSON data with the API" method)
npm run discovery:import
```

This uses the Discovery Engine API's `importDocuments` method, which is the official way to "Upload structured JSON data with the API" as mentioned in the documentation.

## Understanding the Documentation

From the [official docs](https://cloud.google.com/generative-ai-app-builder/docs/create-datastore-ingest):

> **Structured data**: You can import data from BigQuery or Cloud Storage. You can also manually upload structured JSON data through the API.

This confirms:
- ✅ The import source selection during creation is for **automatic ingestion**
- ✅ **API uploads** are a separate method you can use after creation
- ✅ You can create the data store with one method and use API imports later

## Recommended Steps

1. **Create Data Store:**
   - Name: `urban-manual-destinations`
   - Type: **Structured data** (or **Generic**)
   - Location: **Global**
   - Import Source: **Cloud Storage** (or any option to proceed)

2. **After Creation:**
   - Note the **Data Store ID**
   - Set environment variables:
     ```bash
     GOOGLE_CLOUD_PROJECT_ID=your-project-id
     DISCOVERY_ENGINE_DATA_STORE_ID=urban-manual-destinations
     GOOGLE_CLOUD_LOCATION=global
     ```

3. **Import Data via API:**
   ```bash
   npm run discovery:export
   npm run discovery:import
   ```

## Why This Works

The data store creation process sets up the **container**. The import source selection is just for **initial data ingestion**. Once created, you can:

- Use API calls to import/update data (what we're doing)
- Use Cloud Storage imports (if you set it up)
- Use BigQuery imports (if you set it up)

All three methods work independently - choosing one during creation doesn't lock you into that method.

## Summary

**Just select "Cloud Storage" (or any option) to proceed with data store creation.** Then use our API import scripts (`npm run discovery:import`) which is the official "Upload structured JSON data with the API" method mentioned in the documentation.

The import source selection is just for setup - you'll use API imports for actual data management.
