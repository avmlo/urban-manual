/**
 * Export Destinations to Cloudflare R2 for AutoRAG
 * 
 * This script exports destination data from Supabase to Markdown format
 * and uploads it to Cloudflare R2 for AutoRAG indexing.
 * 
 * Usage:
 *   npx tsx scripts/export-destinations-to-r2.ts
 *   npx tsx scripts/export-destinations-to-r2.ts --dry-run
 *   npx tsx scripts/export-destinations-to-r2.ts --limit 100
 */

import { resolve } from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// R2 Configuration (S3-compatible)
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'urban-manual-destinations';
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('❌ Missing R2 configuration. Please set:');
  console.error('   - CLOUDFLARE_ACCOUNT_ID');
  console.error('   - R2_ACCESS_KEY_ID');
  console.error('   - R2_SECRET_ACCESS_KEY');
  console.error('   - R2_BUCKET_NAME (optional, defaults to urban-manual-destinations)');
  process.exit(1);
}

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Convert destination to Markdown format for AutoRAG
 */
function destinationToMarkdown(dest: any): string {
  const sections: string[] = [];

  // Title
  sections.push(`# ${dest.name || 'Destination'}\n`);

  // Basic Info
  if (dest.city || dest.country) {
    const location = [dest.city, dest.country].filter(Boolean).join(', ');
    sections.push(`**Location:** ${location}\n`);
  }

  if (dest.category) {
    sections.push(`**Category:** ${dest.category}\n`);
  }

  if (dest.neighborhood) {
    sections.push(`**Neighborhood:** ${dest.neighborhood}\n`);
  }

  // Ratings and Awards
  if (dest.michelin_stars && dest.michelin_stars > 0) {
    sections.push(`**Michelin Stars:** ${dest.michelin_stars}\n`);
  }

  if (dest.crown) {
    sections.push(`**Crown:** Yes\n`);
  }

  if (dest.rating) {
    sections.push(`**Rating:** ${dest.rating.toFixed(1)}/5\n`);
  }

  if (dest.price_level) {
    const priceLevels = ['$', '$$', '$$$', '$$$$'];
    sections.push(`**Price Level:** ${priceLevels[dest.price_level - 1] || dest.price_level}\n`);
  }

  // Description
  if (dest.micro_description) {
    sections.push(`\n## Overview\n\n${dest.micro_description}\n`);
  }

  if (dest.description) {
    sections.push(`\n## Description\n\n${dest.description}\n`);
  }

  if (dest.content) {
    // Strip HTML tags if present
    const cleanContent = dest.content.replace(/<[^>]*>/g, '').trim();
    if (cleanContent) {
      sections.push(`\n## Details\n\n${cleanContent}\n`);
    }
  }

  // Architecture & Design
  if (dest.design_firm) {
    sections.push(`\n## Architecture\n\n**Design Firm:** ${dest.design_firm}\n`);
  }

  if (dest.architectural_style) {
    sections.push(`**Architectural Style:** ${dest.architectural_style}\n`);
  }

  if (dest.architectural_significance) {
    sections.push(`\n${dest.architectural_significance}\n`);
  }

  if (dest.design_story) {
    sections.push(`\n## Design Story\n\n${dest.design_story}\n`);
  }

  if (dest.construction_year) {
    sections.push(`**Built:** ${dest.construction_year}\n`);
  }

  // Contact & Links
  if (dest.formatted_address || dest.vicinity) {
    sections.push(`\n## Location\n\n${dest.formatted_address || dest.vicinity}\n`);
  }

  if (dest.website) {
    sections.push(`**Website:** ${dest.website}\n`);
  }

  if (dest.phone_number || dest.international_phone_number) {
    sections.push(`**Phone:** ${dest.international_phone_number || dest.phone_number}\n`);
  }

  if (dest.instagram_handle || dest.instagram_url) {
    sections.push(`**Instagram:** ${dest.instagram_handle || dest.instagram_url}\n`);
  }

  // Tags and Keywords
  if (dest.tags && Array.isArray(dest.tags) && dest.tags.length > 0) {
    sections.push(`\n## Tags\n\n${dest.tags.join(', ')}\n`);
  }

  // Reviews Summary
  if (dest.editorial_summary) {
    sections.push(`\n## What People Say\n\n${dest.editorial_summary}\n`);
  }

  // Opening Hours
  if (dest.opening_hours_json && dest.opening_hours_json.weekday_text) {
    sections.push(`\n## Opening Hours\n\n${dest.opening_hours_json.weekday_text.join('\n')}\n`);
  }

  // Metadata
  sections.push(`\n---\n\n*Last updated: ${dest.last_enriched_at || 'Unknown'}*\n`);

  return sections.join('\n');
}

/**
 * Upload markdown file to R2
 */
async function uploadToR2(key: string, content: string): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: content,
    ContentType: 'text/markdown',
  });

  await r2Client.send(command);
}

/**
 * Main export function
 */
async function exportDestinations() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;

  console.log('🚀 Starting destination export to R2...\n');
  console.log(`📦 Bucket: ${R2_BUCKET_NAME}`);
  console.log(`🔗 Endpoint: ${R2_ENDPOINT}`);
  console.log(`🧪 Dry Run: ${isDryRun ? 'Yes' : 'No'}`);
  if (limit) console.log(`📊 Limit: ${limit} destinations\n`);

  try {
    // Fetch destinations from Supabase
    console.log('📥 Fetching destinations from Supabase...');
    
    let query = supabase
      .from('destinations')
      .select(`
        id,
        slug,
        name,
        city,
        country,
        neighborhood,
        category,
        micro_description,
        description,
        content,
        michelin_stars,
        crown,
        rating,
        price_level,
        design_firm,
        architectural_style,
        architectural_significance,
        design_story,
        construction_year,
        formatted_address,
        vicinity,
        website,
        phone_number,
        international_phone_number,
        instagram_handle,
        instagram_url,
        tags,
        editorial_summary,
        opening_hours_json,
        last_enriched_at
      `)
      .order('id', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data: destinations, error } = await query;

    if (error) {
      console.error('❌ Error fetching destinations:', error);
      process.exit(1);
    }

    if (!destinations || destinations.length === 0) {
      console.log('⚠️  No destinations found');
      process.exit(0);
    }

    console.log(`✅ Found ${destinations.length} destinations\n`);

    // Process each destination
    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ slug: string; error: string }> = [];

    for (const dest of destinations) {
      try {
        const markdown = destinationToMarkdown(dest);
        const key = `destinations/${dest.slug || `dest-${dest.id}`}.md`;

        if (isDryRun) {
          console.log(`📄 [DRY RUN] Would upload: ${key} (${markdown.length} bytes)`);
          successCount++;
        } else {
          await uploadToR2(key, markdown);
          console.log(`✅ Uploaded: ${key}`);
          successCount++;
        }
      } catch (error: any) {
        console.error(`❌ Error processing ${dest.slug || dest.id}:`, error.message);
        errorCount++;
        errors.push({
          slug: dest.slug || `dest-${dest.id}`,
          error: error.message,
        });
      }
    }

    // Summary
    console.log('\n📊 Export Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📦 Total: ${destinations.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(({ slug, error }) => {
        console.log(`   - ${slug}: ${error}`);
      });
    }

    if (!isDryRun) {
      console.log('\n✨ Export complete!');
      console.log(`📝 Next steps:`);
      console.log(`   1. Go to Cloudflare Dashboard → AI → AutoRAG`);
      console.log(`   2. Create new AutoRAG instance`);
      console.log(`   3. Connect to R2 bucket: ${R2_BUCKET_NAME}`);
      console.log(`   4. AutoRAG will automatically index all files`);
    } else {
      console.log('\n🧪 Dry run complete. Run without --dry-run to actually upload.');
    }
  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the export
exportDestinations().catch(console.error);

