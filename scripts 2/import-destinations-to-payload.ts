/**
 * Script to bulk import Supabase destinations into Payload CMS
 * 
 * Usage:
 *   npx tsx scripts/import-destinations-to-payload.ts
 * 
 * This script:
 * 1. Fetches all destinations from Supabase
 * 2. Imports them into Payload using local API
 * 3. Skips duplicates (by slug)
 * 4. Provides progress feedback
 */

import { getPayload } from 'payload'
import config from '../payload.config'
import { createClient } from '@supabase/supabase-js'

async function importDestinations() {
  console.log('🚀 Starting bulk import of Supabase destinations to Payload...\n')

  // Initialize Payload
  const payload = await getPayload({ config })
  console.log('✅ Payload initialized\n')

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials not found!')
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  console.log('✅ Supabase client initialized\n')

  // Fetch all destinations from Supabase
  console.log('📥 Fetching destinations from Supabase...')
  const { data: destinations, error: supabaseError } = await supabase
    .from('destinations')
    .select('*')
    .order('created_at', { ascending: true })

  if (supabaseError) {
    console.error('❌ Failed to fetch from Supabase:', supabaseError.message)
    process.exit(1)
  }

  if (!destinations || destinations.length === 0) {
    console.log('ℹ️  No destinations found in Supabase')
    process.exit(0)
  }

  console.log(`✅ Found ${destinations.length} destinations in Supabase\n`)

  const results = {
    imported: 0,
    skipped: 0,
    errors: [] as Array<{ slug: string; error: string }>,
  }

  // Import each destination
  console.log('📤 Importing destinations to Payload...\n')
  for (let i = 0; i < destinations.length; i++) {
    const dest = destinations[i]
    const progress = `[${i + 1}/${destinations.length}]`

    try {
      // Check if destination already exists in Payload (by slug)
      const existing = await payload.find({
        collection: 'destinations',
        where: {
          slug: {
            equals: dest.slug,
          },
        },
        limit: 1,
      })

      if (existing.docs.length > 0) {
        // Destination already exists - skip
        console.log(`${progress} ⏭️  Skipped: ${dest.name} (already exists)`)
        results.skipped++
        continue
      }

      // Map Supabase fields to Payload fields
      const payloadData: any = {
        name: dest.name,
        slug: dest.slug,
        city: dest.city,
        category: dest.category,
        description: dest.description || null,
        // Handle content - could be string or JSON
        content: dest.content 
          ? (typeof dest.content === 'string' 
              ? dest.content 
              : JSON.stringify(dest.content))
          : null,
        image: dest.image || dest.main_image || null,
        latitude: dest.latitude || dest.lat || null,
        longitude: dest.longitude || dest.long || null,
        michelin_stars: dest.michelin_stars || 0,
        crown: dest.crown || false,
        rating: dest.rating || null,
        price_level: dest.price_level || null,
      }

      // Create destination in Payload
      // Note: Hooks will run and sync back to Supabase, but since we're importing
      // FROM Supabase, this is idempotent (same data will be synced back)
      await payload.create({
        collection: 'destinations',
        data: payloadData,
      })

      console.log(`${progress} ✅ Imported: ${dest.name}`)
      results.imported++
    } catch (error: any) {
      // Log error but continue with other destinations
      const errorMsg = error.message || 'Unknown error'
      console.error(`${progress} ❌ Error importing ${dest.name}: ${errorMsg}`)
      results.errors.push({
        slug: dest.slug || 'unknown',
        error: errorMsg,
      })
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Import Summary')
  console.log('='.repeat(50))
  console.log(`Total destinations: ${destinations.length}`)
  console.log(`✅ Imported: ${results.imported}`)
  console.log(`⏭️  Skipped: ${results.skipped}`)
  console.log(`❌ Errors: ${results.errors.length}`)

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:')
    results.errors.forEach(({ slug, error }) => {
      console.log(`  - ${slug}: ${error}`)
    })
  }

  console.log('\n✅ Import complete!')
  process.exit(0)
}

// Run the import
importDestinations().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

