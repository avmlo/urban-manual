import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * API endpoint to sync Supabase destinations to Payload
 * This allows you to import existing Supabase data into Payload
 * 
 * GET /api/payload/sync-supabase - Sync all destinations from Supabase to Payload
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Fetch all destinations from Supabase
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('*')
      .limit(1000) // Adjust limit as needed

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch from Supabase', details: error.message },
        { status: 500 }
      )
    }

    // Note: This endpoint just returns the data
    // Actual sync would be done through Payload's API or admin UI
    return NextResponse.json({
      success: true,
      count: destinations?.length || 0,
      message: 'Use Payload admin UI to import these destinations',
      destinations: destinations?.map((dest: any) => ({
        name: dest.name,
        slug: dest.slug,
        city: dest.city,
        category: dest.category,
        description: dest.description,
        content: dest.content,
        image: dest.image || dest.main_image,
        latitude: dest.latitude || dest.lat,
        longitude: dest.longitude || dest.long,
        michelin_stars: dest.michelin_stars || 0,
        crown: dest.crown || false,
        rating: dest.rating || null,
        price_level: dest.price_level || null,
      })),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Sync failed', details: error.message },
      { status: 500 }
    )
  }
}

