import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

// Initialize Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BUCKET_NAME = 'destination-images';
const DELETE_FILES = process.argv.includes('--delete-files');

interface BackupEntry {
  slug: string;
  name: string;
  original_url: string;
  timestamp?: string;
}

// Main rollback function
async function rollbackImages(): Promise<void> {
  console.log('🔄 Starting rollback of image migration...\n');

  try {
    // 1. Read backup file
    const backupPath = path.join(process.cwd(), 'backup-image-urls.json');
    
    let backup: BackupEntry[];
    try {
      const backupContent = await fs.readFile(backupPath, 'utf-8');
      backup = JSON.parse(backupContent);
      console.log(`✓ Loaded backup file: ${backup.length} destinations\n`);
    } catch (error: any) {
      console.error(`❌ Failed to read backup file: ${error.message}`);
      console.error(`Expected file: ${backupPath}`);
      process.exit(1);
    }

    // 2. Restore original URLs
    console.log('📝 Restoring original image URLs...\n');
    let success = 0;
    let failed = 0;
    const errors: Array<{ slug: string; error: string }> = [];

    for (let i = 0; i < backup.length; i++) {
      const entry = backup[i];
      console.log(`[${i + 1}/${backup.length}] Restoring ${entry.name} (${entry.slug})...`);

      try {
        const { error } = await supabase
          .from('destinations')
          .update({
            image: entry.original_url,
            image_thumbnail: null,
            image_original: null
          })
          .eq('slug', entry.slug);

        if (error) {
          throw new Error(error.message);
        }

        console.log(`  ✓ Restored original URL`);
        success++;
      } catch (error: any) {
        console.error(`  ❌ Error: ${error.message}`);
        failed++;
        errors.push({
          slug: entry.slug,
          error: error.message
        });
      }
    }

    // 3. Optionally delete Supabase Storage files
    if (DELETE_FILES) {
      console.log('\n🗑️  Deleting files from Supabase Storage...\n');
      
      try {
        // List all files in bucket
        const { data: files, error: listError } = await supabase.storage
          .from(BUCKET_NAME)
          .list('full', {
            limit: 1000,
            sortBy: { column: 'name', order: 'asc' }
          });

        if (listError) {
          throw new Error(`Failed to list files: ${listError.message}`);
        }

        if (files && files.length > 0) {
          const filePaths = files.map(f => `full/${f.name}`);
          
          // Also get thumbnails
          const { data: thumbs } = await supabase.storage
            .from(BUCKET_NAME)
            .list('thumbnails', {
              limit: 1000,
              sortBy: { column: 'name', order: 'asc' }
            });

          if (thumbs && thumbs.length > 0) {
            const thumbPaths = thumbs.map(t => `thumbnails/${t.name}`);
            filePaths.push(...thumbPaths);
          }

          // Delete files
          const { error: deleteError } = await supabase.storage
            .from(BUCKET_NAME)
            .remove(filePaths);

          if (deleteError) {
            console.error(`⚠️  Error deleting files: ${deleteError.message}`);
          } else {
            console.log(`✓ Deleted ${filePaths.length} files from Supabase Storage`);
          }
        } else {
          console.log('ℹ️  No files found in bucket to delete');
        }
      } catch (error: any) {
        console.error(`⚠️  Error deleting files: ${error.message}`);
        console.error('Continuing with database rollback...');
      }
    } else {
      console.log('\nℹ️  Files in Supabase Storage were NOT deleted (use --delete-files flag to delete)');
    }

    // 4. Save error log if any
    if (errors.length > 0) {
      const errorPath = path.join(process.cwd(), 'rollback-errors.json');
      await fs.writeFile(
        errorPath,
        JSON.stringify(errors, null, 2)
      );
      console.log(`\n⚠️  Errors saved to: ${errorPath}`);
    }

    // 5. Print summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ Rollback Summary');
    console.log('='.repeat(50));
    console.log(`Success: ${success}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${backup.length}`);

    if (success > 0) {
      console.log(`\n✨ Successfully restored ${success} original image URLs!`);
    }

    if (failed > 0) {
      console.log(`\n⚠️  ${failed} restorations failed. Check rollback-errors.json for details.`);
    }
  } catch (error: any) {
    console.error('\n❌ Rollback failed:', error.message);
    process.exit(1);
  }
}

// Run rollback
rollbackImages().catch((error) => {
  console.error('❌ Rollback failed:', error);
  process.exit(1);
});
