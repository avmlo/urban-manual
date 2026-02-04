# Cloud Storage Import Configuration - Quick Guide

You're at the Cloud Storage import configuration step. Since we're using **API imports** (not Cloud Storage), here's what to select:

## Step 1: What kind of data are you importing?

**Select: "Structured Data"**

- ✅ Choose **"Structured data"** under "Structured Data Import"
- This is for general structured data in JSONL or CSV format
- We have structured destination data (name, city, category, rating, etc.)

**Why:** Even though we won't use Cloud Storage, selecting "Structured data" is the correct type for our destination catalog.

---

## Step 2: Synchronization frequency

**Select: "One time"**

- ✅ Choose **"One time"** - One time ingestion only
- This doesn't matter since we're using API imports, but "One time" is simplest

**Note:** The UI says "This action cannot be changed after the data store is created" - but that's fine because we're not using Cloud Storage imports anyway.

---

## Step 3: Select a folder or file

**You have two options:**

### Option A: Create an Empty Bucket (Recommended)

1. Click the bucket selector (the `gs://` field)
2. If you can create a new bucket:
   - Create a bucket named something like `urban-manual-discovery-engine` (or any name)
   - Leave it empty
   - Select it
3. If you can't create a bucket here, you can:
   - Use an existing bucket (if you have one)
   - Or create one later in Cloud Storage console

### Option B: Skip/Use Placeholder (If Possible)

- If there's a way to proceed without selecting a bucket, do that
- Some UIs allow you to configure this later

---

## Important Notes

### You Don't Need to Upload Data Here

- **Don't upload any files to Cloud Storage**
- **Don't worry about the bucket contents**
- We're only setting this up to complete the data store creation
- **We'll import data via API** using `npm run discovery:import`

### After This Step

Once you complete this step and create the data store:

1. **Note the Data Store ID** (usually `urban-manual-destinations`)
2. **Set your environment variables:**
   ```bash
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   DISCOVERY_ENGINE_DATA_STORE_ID=urban-manual-destinations
   GOOGLE_CLOUD_LOCATION=global
   ```
3. **Import data via API:**
   ```bash
   npm run discovery:export
   npm run discovery:import
   ```

---

## Summary

**Select:**
- ✅ **Structured data** (under Structured Data Import)
- ✅ **One time** synchronization
- ✅ **Any Cloud Storage bucket** (create empty one or use existing)

**Then proceed** - you'll import data via API after the data store is created!

The Cloud Storage configuration is just a formality to complete the setup. Your actual data import will happen via the Discovery Engine API using our import scripts.

