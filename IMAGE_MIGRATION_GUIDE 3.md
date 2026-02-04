# Image Migration to Supabase Storage - Complete Guide

## Overview

This guide will help you migrate all destination images from external CDNs (Framer/Webflow) to Supabase Storage. The migration script is ready and includes:
- Automatic bucket creation
- Image optimization (WebP, compression, thumbnails)
- Retry logic with exponential backoff
- Backup and rollback support
- Test and dry-run modes

---

## Prerequisites

### 1. Supabase Storage Setup

**Step 1: Create Storage Bucket**

Go to your Supabase Dashboard → Storage → Create Bucket:
- **Bucket Name:** `destination-images`
- **Public:** ✅ Yes (for CDN access)
- **File Size Limit:** 10 MB
- **Allowed MIME Types:** `image/webp`, `image/jpeg`, `image/png`

**Step 2: Verify Bucket Exists**

The script will automatically create the bucket if it doesn't exist, but you can verify it in the Supabase dashboard.

---

### 2. Database Migration

**Run the SQL migration first:**

```sql
-- Run this in Supabase SQL Editor
ALTER TABLE destinations 
ADD COLUMN IF NOT EXISTS image_thumbnail TEXT,
ADD COLUMN IF NOT EXISTS image_original TEXT;
```

Or use the migration file:
```bash
# Copy the SQL from: migrations/2025_01_06_add_image_storage_columns.sql
# Paste and execute in Supabase SQL Editor
```

---

### 3. Environment Variables

Ensure your `.env.local` file has:

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: If not using service role key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**Important:** You need `SUPABASE_SERVICE_ROLE_KEY` for admin access to create buckets and upload files.

---

### 4. Install Dependencies

The script requires `sharp` for image processing:

```bash
npm install sharp
# or
pnpm add sharp
```

---

## Running the Migration

### Step 1: Test Mode (Recommended First)

Test with 10 destinations to verify everything works:

```bash
npx tsx scripts/migrate-images-to-supabase.ts --test
```

**What it does:**
- Processes only the first 10 destinations
- Downloads, optimizes, and uploads images
- Updates database
- Creates backup file

**Expected output:**
```
🚀 Starting image migration to Supabase Storage...
🧪 TEST MODE: Processing first 10 destinations only
📦 Creating bucket: destination-images...
✓ Bucket destination-images already exists
📥 Fetching destinations from database...
Found 919 destinations with images
Processing 10 destinations...
✓ Backup created: backup-image-urls.json (10 destinations)

[1/10] Park Hyatt Bangkok (park-hyatt-bangkok)...
  ✓ Downloaded (2.34 MB)
  ✓ Optimized to WebP (0.67 MB, -71% savings)
  ✓ Generated thumbnail (45 KB)
  ✓ Uploaded full image
  ✓ Uploaded thumbnail
  ✓ Updated database
  ⏱️  Completed in 3456ms

[... continues for 10 destinations ...]

✅ Migration Summary
==================================================
Success: 10
Failed: 0
Skipped: 0
Total: 10
```

---

### Step 2: Dry Run (Optional)

Simulate the migration without uploading:

```bash
npx tsx scripts/migrate-images-to-supabase.ts --dry-run
```

This will:
- ✅ Download images
- ✅ Optimize images
- ✅ Generate thumbnails
- ❌ Skip upload to Supabase
- ❌ Skip database updates

Useful for:
- Estimating migration time
- Checking for errors before actual migration
- Verifying image optimization works

---

### Step 3: Full Migration

Once test mode succeeds, run the full migration:

```bash
npx tsx scripts/migrate-images-to-supabase.ts
```

**What to expect:**
- Processes all ~919 destinations
- Takes 2-4 hours (depending on image sizes and network speed)
- Creates `backup-image-urls.json` before starting
- Saves errors to `migration-errors.json` if any fail
- Shows progress for each destination

**Monitor the process:**
- Keep terminal open
- Check Supabase Storage dashboard periodically
- Review `migration-errors.json` if failures occur

---

## Migration Process

For each destination, the script:

1. **Downloads** image from current URL (Framer/Webflow)
2. **Optimizes** to WebP format (80% quality, max 1920px width)
3. **Generates** thumbnail (400px width, 80% quality)
4. **Uploads** both to Supabase Storage:
   - `full/{slug}.webp` - Optimized full-size image
   - `thumbnails/{slug}.webp` - Thumbnail version
5. **Updates** database with:
   - `image` → New Supabase Storage URL (full)
   - `image_thumbnail` → Thumbnail URL
   - `image_original` → Original URL (backup)

---

## After Migration

### 1. Verify Images Load

Check a few destination pages to ensure images display correctly:
- Homepage destination cards
- Destination detail pages
- City pages

### 2. Check Storage Usage

Go to Supabase Dashboard → Storage → `destination-images`:
- Verify file counts (~1,838 files for 919 destinations)
- Check storage size (should be ~400-600 MB total)
- Verify both `full/` and `thumbnails/` folders exist

### 3. Update Components (Optional)

Components already use `image` field, which will now point to Supabase Storage. Optionally update to use thumbnails for cards:

```typescript
// In destination cards, you could use:
<Image
  src={destination.image_thumbnail || destination.image}
  alt={destination.name}
  // ...
/>
```

---

## Rollback (If Needed)

If something goes wrong, use the rollback script:

```bash
npx tsx scripts/rollback-images-supabase.ts
```

This will:
- Restore original image URLs from `backup-image-urls.json`
- Clear `image_thumbnail` and `image_original` columns
- Optionally delete Supabase Storage files (prompts for confirmation)

---

## Troubleshooting

### Error: "Missing Supabase credentials"
- Ensure `.env.local` exists with correct variables
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set (not just anon key)

### Error: "Failed to create bucket"
- Check Supabase project is active
- Verify you have storage quota available
- Bucket might already exist (script will use existing bucket)

### Error: "Upload failed: Invalid key"
- This happens with special characters in slugs
- Script sanitizes filenames automatically
- Check `migration-errors.json` for specific slugs

### Error: "HTTP 403" or "HTTP 404" when downloading
- Source image URL might be broken
- Check a few URLs manually in browser
- Script will skip and log error

### Images not displaying after migration
- Clear browser cache
- Verify Supabase Storage bucket is public
- Check image URLs in database match Supabase Storage URLs

---

## Cost Estimation

**Supabase Free Tier:**
- 100 GB storage ✅ (images will use ~0.6 GB)
- 200 GB bandwidth/month ✅ (images will use ~10-20 GB/month)
- **Total cost: $0/month** ✅

**If you exceed free tier:**
- Storage: $0.021/GB/month
- Bandwidth: $0.09/GB
- Estimated: $5-10/month if you exceed limits

---

## Performance Benefits

After migration:
- ✅ **75-80% smaller file sizes** (WebP vs original)
- ✅ **Faster page loads** (smaller images)
- ✅ **Better SEO** (faster Core Web Vitals)
- ✅ **Own your images** (no dependency on external CDNs)
- ✅ **Thumbnail support** (faster card rendering)

---

## Next Steps After Migration

1. **Monitor** storage usage in Supabase dashboard
2. **Update** components to use thumbnails for cards (optional optimization)
3. **Delete** old backup file after confirming migration success (after 30 days)
4. **Archive** original URLs in `image_original` column for reference

---

## Support

If you encounter issues:
1. Check `migration-errors.json` for specific errors
2. Review Supabase Storage logs
3. Verify environment variables
4. Run in test mode first to isolate issues

---

**Migration Script:** `scripts/migrate-images-to-supabase.ts`  
**Rollback Script:** `scripts/rollback-images-supabase.ts`  
**SQL Migration:** `migrations/2025_01_06_add_image_storage_columns.sql`

