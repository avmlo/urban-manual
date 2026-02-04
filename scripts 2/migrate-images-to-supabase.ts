import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables from .env.local if it exists
async function loadEnvFile() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const envExists = await fs.access(envPath).then(() => true).catch(() => false);
    
    if (envExists) {
      const envFile = await fs.readFile(envPath, 'utf-8');
      envFile.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const match = trimmed.match(/^([^=]+)=(.*)$/);
          if (match && !process.env[match[1]]) {
            process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
          }
        }
      });
    }
  } catch (error) {
    // Ignore if .env.local doesn't exist
  }
}

// Initialize Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuration
const BUCKET_NAME = 'destination-images';
const isTestMode = process.argv.includes('--test');
const isDryRun = process.argv.includes('--dry-run');

interface Destination {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  main_image?: string | null;
}

interface MigrationResult {
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{ slug: string; error: string }>;
}

// Retry function with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  label: string = 'Operation'
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === maxRetries - 1) {
        throw new Error(`${label} failed after ${maxRetries} attempts: ${error.message}`);
      }
      const delay = 1000 * Math.pow(2, i);
      console.log(`  ⚠️  ${label} failed, retrying in ${delay}ms... (attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// Ensure bucket exists
async function ensureBucketExists(): Promise<void> {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    const exists = buckets?.some(b => b.name === BUCKET_NAME);

    if (!exists) {
      console.log(`📦 Creating bucket: ${BUCKET_NAME}...`);
      const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png']
      });

      if (error) {
        throw new Error(`Failed to create bucket: ${error.message}`);
      }
      console.log(`✓ Created bucket: ${BUCKET_NAME}\n`);
    } else {
      console.log(`✓ Bucket ${BUCKET_NAME} already exists\n`);
    }
  } catch (error: any) {
    throw new Error(`Bucket setup failed: ${error.message}`);
  }
}

// Check if URL is from Framer or Webflow
function isExternalImageUrl(url: string): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.includes('framerusercontent.com') ||
    lowerUrl.includes('webflow.com') ||
    lowerUrl.includes('cdn.prod.website-files.com')
  );
}

// Check if URL is already on Supabase Storage
function isSupabaseUrl(url: string): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes('supabase') && lowerUrl.includes('storage');
}

// Create backup file
async function createBackup(destinations: Destination[]): Promise<void> {
  const backup = destinations
    .filter(d => {
      const url = d.image || d.main_image;
      return url && isExternalImageUrl(url);
    })
    .map(d => ({
      slug: d.slug,
      name: d.name,
      original_url: d.image || d.main_image,
      field_used: d.image ? 'image' : 'main_image',
      timestamp: new Date().toISOString()
    }));

  const backupPath = path.join(process.cwd(), 'backup-image-urls.json');
  await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));
  console.log(`✓ Backup created: ${backupPath} (${backup.length} destinations with Framer/Webflow URLs)\n`);
}

// Download image from URL
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Urban-Manual-Image-Migrator/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type');
  if (!contentType?.startsWith('image/')) {
    throw new Error(`Not an image: ${contentType}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Optimize image to WebP format
async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .resize(1920, null, {
      withoutEnlargement: true,
      fit: 'inside'
    })
    .webp({ quality: 80 })
    .toBuffer();
}

// Generate thumbnail
async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .resize(400, null, {
      withoutEnlargement: true,
      fit: 'inside'
    })
    .webp({ quality: 80 })
    .toBuffer();
}

// Upload to Supabase Storage
async function uploadToSupabase(
  buffer: Buffer,
  filePath: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType: 'image/webp',
      cacheControl: '31536000', // 1 year cache
      upsert: true // Overwrite if exists
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return publicUrl;
}

// Update database with new image URLs
async function updateDatabase(
  slug: string,
  imageUrl: string,
  thumbnailUrl: string,
  originalUrl: string,
  sourceField: 'image' | 'main_image' = 'image'
): Promise<void> {
  // Update the field that had the original URL, and also set image if main_image was the source
  const updateData: any = {
    image_thumbnail: thumbnailUrl,
    image_original: originalUrl
  };
  
  if (sourceField === 'image') {
    updateData.image = imageUrl;
  } else {
    // If main_image was the source, update both to consolidate
    updateData.image = imageUrl;
    updateData.main_image = imageUrl;
  }

  const { error } = await supabase
    .from('destinations')
    .update(updateData)
    .eq('slug', slug);

  if (error) {
    throw new Error(`Database update failed: ${error.message}`);
  }
}

// Sanitize filename for Supabase Storage (only allow alphanumeric, hyphens, underscores)
function sanitizeFilename(slug: string): string {
  return slug.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// Process a single destination
async function processDestination(dest: Destination): Promise<void> {
  // Use image or main_image field
  const imageUrl = dest.image || dest.main_image;
  
  if (!imageUrl) {
    throw new Error('No image URL found');
  }

  // Skip if already migrated to Supabase Storage
  if (isSupabaseUrl(imageUrl)) {
    throw new Error('Already migrated (Supabase URL detected)');
  }

  // Only migrate Framer/Webflow URLs
  if (!isExternalImageUrl(imageUrl)) {
    throw new Error(`Skipping non-Framer/Webflow URL: ${imageUrl.substring(0, 50)}...`);
  }

  const startTime = Date.now();
  const sanitizedSlug = sanitizeFilename(dest.slug);

  // Download image
  const imageUrl = dest.image || dest.main_image!;
  const imageBuffer = await retryWithBackoff(
    () => downloadImage(imageUrl),
    3,
    `Download ${dest.name}`
  );
  const originalSize = imageBuffer.length;

  // Optimize
  const optimizedBuffer = await optimizeImage(imageBuffer);
  const optimizedSize = optimizedBuffer.length;
  const savings = Math.round((1 - optimizedSize / originalSize) * 100);

  // Generate thumbnail
  const thumbnailBuffer = await generateThumbnail(imageBuffer);
  const thumbSize = thumbnailBuffer.length;

  console.log(`  ✓ Downloaded (${(originalSize / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`  ✓ Optimized to WebP (${(optimizedSize / 1024 / 1024).toFixed(2)} MB, -${savings}% savings)`);
  console.log(`  ✓ Generated thumbnail (${(thumbSize / 1024).toFixed(0)} KB)`);

  if (!isDryRun) {
    // Upload full image (use sanitized slug for filename)
    const fullPath = `full/${sanitizedSlug}.webp`;
    const fullUrl = await retryWithBackoff(
      () => uploadToSupabase(optimizedBuffer, fullPath),
      3,
      `Upload full ${dest.name}`
    );
    console.log(`  ✓ Uploaded full image`);

    // Upload thumbnail (use sanitized slug for filename)
    const thumbPath = `thumbnails/${sanitizedSlug}.webp`;
    const thumbUrl = await retryWithBackoff(
      () => uploadToSupabase(thumbnailBuffer, thumbPath),
      3,
      `Upload thumbnail ${dest.name}`
    );
    console.log(`  ✓ Uploaded thumbnail`);

    // Update database
    const originalUrl = dest.image || dest.main_image!;
    const sourceField = dest.image ? 'image' : 'main_image';
    await retryWithBackoff(
      () => updateDatabase(dest.slug, fullUrl, thumbUrl, originalUrl, sourceField),
      3,
      `Update database ${dest.name}`
    );
    console.log(`  ✓ Updated database`);
  } else {
    console.log(`  🔍 DRY RUN: Skipped upload and database update`);
  }

  const duration = Date.now() - startTime;
  console.log(`  ⏱️  Completed in ${duration}ms\n`);
}

// Main migration function
async function migrateImages(): Promise<void> {
  // Load environment variables first
  await loadEnvFile();
  
  console.log('🚀 Starting image migration to Supabase Storage...\n');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE: Simulating migration without uploading\n');
  }

  if (isTestMode) {
    console.log('🧪 TEST MODE: Processing first 10 destinations only\n');
  }

  try {
    // 1. Ensure bucket exists
    await ensureBucketExists();

    // 2. Fetch all destinations with images
    console.log('📥 Fetching destinations from database...');
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('id, slug, name, image, main_image')
      .or('image.not.is.null,main_image.not.is.null')
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch destinations: ${error.message}`);
    }

    if (!destinations || destinations.length === 0) {
      console.log('⚠️  No destinations with images found');
      return;
    }

    // Filter to only destinations with Framer/Webflow URLs
    const externalImageDests = destinations.filter(d => {
      const url = d.image || d.main_image;
      return url && isExternalImageUrl(url) && !isSupabaseUrl(url);
    });

    if (externalImageDests.length === 0) {
      console.log('✅ No destinations with Framer/Webflow URLs found. All images may already be migrated!');
      return;
    }

    const toProcess = isTestMode ? externalImageDests.slice(0, 10) : externalImageDests;
    console.log(`Found ${destinations.length} total destinations with images`);
    console.log(`Found ${externalImageDests.length} destinations with Framer/Webflow URLs`);
    console.log(`Processing ${toProcess.length} destinations...\n`);

    // 3. Create backup
    await createBackup(externalImageDests as Destination[]);

    // 4. Process each destination
    const results: MigrationResult = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    for (let i = 0; i < toProcess.length; i++) {
      const dest = toProcess[i] as Destination;
      console.log(`[${i + 1}/${toProcess.length}] ${dest.name} (${dest.slug})...`);

      try {
        await processDestination(dest);
        results.success++;
      } catch (error: any) {
        // Skip errors for already migrated or non-external URLs
        if (error.message.includes('Already migrated') || error.message.includes('Skipping non-Framer')) {
          results.skipped++;
          console.log(`  ⏭️  ${error.message}`);
        } else {
          console.error(`  ❌ Error: ${error.message}`);
          results.failed++;
          results.errors.push({
            slug: dest.slug,
            error: error.message
          });
        }
      }
    }

    // 5. Save error log
    if (results.errors.length > 0) {
      const errorPath = path.join(process.cwd(), 'migration-errors.json');
      await fs.writeFile(
        errorPath,
        JSON.stringify(results.errors, null, 2)
      );
      console.log(`\n⚠️  Errors saved to: ${errorPath}`);
    }

    // 6. Print summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ Migration Summary');
    console.log('='.repeat(50));
    console.log(`Success: ${results.success}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Skipped: ${results.skipped}`);
    console.log(`Total: ${toProcess.length}`);
    
    if (results.success > 0) {
      console.log(`\n✨ Successfully migrated ${results.success} images!`);
    }
    
    if (results.failed > 0) {
      console.log(`\n⚠️  ${results.failed} images failed. Check migration-errors.json for details.`);
    }

    if (isDryRun) {
      console.log('\n🔍 This was a DRY RUN. No files were uploaded or database updated.');
    }
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run migration
migrateImages().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
