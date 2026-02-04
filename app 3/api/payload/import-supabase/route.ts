import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { createServerClient } from '@/lib/supabase/server'
import { getUserFromRequest, AuthError } from '@/lib/adminAuth'

/**
 * Bulk import all Supabase destinations into Payload CMS
 * 
 * POST /api/payload/import-supabase
 * 
 * This endpoint:
 * 1. Fetches all destinations from Supabase
 * 2. Imports them into Payload using local API
 * 3. Skips duplicates (by slug)
 * 4. Returns import statistics
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const { user } = await getUserFromRequest(request)
    const role = (user.app_metadata as Record<string, any> | null)?.role
    if (role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get Payload instance
    const payload = await getPayload({ config })

    // Get Supabase client
    const supabase = await createServerClient()

    // Fetch all destinations from Supabase
    const { data: destinations, error: supabaseError } = await supabase
      .from('destinations')
      .select('*')
      .order('created_at', { ascending: true })

    if (supabaseError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to fetch from Supabase', 
          details: supabaseError.message 
        },
        { status: 500 }
      )
    }

    if (!destinations || destinations.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        skipped: 0,
        errors: [],
        message: 'No destinations found in Supabase',
      })
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as Array<{ slug: string; error: string }>,
    }

    // Import each destination
    for (const dest of destinations) {
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

        results.imported++
      } catch (error: any) {
        // Log error but continue with other destinations
        results.errors.push({
          slug: dest.slug || 'unknown',
          error: error.message || 'Unknown error',
        })
        console.error(`[Payload Import] Error importing ${dest.slug}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      total: destinations.length,
      imported: results.imported,
      skipped: results.skipped,
      errors: results.errors,
      message: `Import complete: ${results.imported} imported, ${results.skipped} skipped, ${results.errors.length} errors`,
    })
  } catch (error: any) {
    console.error('[Payload Import] Error:', error)
    
    // Handle auth errors
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized - Admin access required',
        },
        { status: error.status }
      )
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Import failed', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}

