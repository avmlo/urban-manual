import { NextRequest, NextResponse } from 'next/server';
import { enrichDestination } from '@/lib/enrichment';
import { requireAdmin, AuthError } from '@/lib/adminAuth';

/**
 * POST /api/enrich
 *
 * Enriches a single destination with Google Places API + Gemini AI
 *
 * Body: {
 *   slug: string,
 *   name: string,
 *   city: string,
 *   category?: string,
 *   content?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { serviceClient: supabase } = await requireAdmin(request);

    const { slug, name, city, category, content } = await request.json();

    if (!slug || !name || !city) {
      return NextResponse.json(
        { error: 'Missing required fields: slug, name, city' },
        { status: 400 }
      );
    }

    console.log(`Enriching: ${name} in ${city}`);

    // Enrich with Places API + Gemini
    const enriched = await enrichDestination(name, city, category, content);

    // Update database
    const { error: updateError } = await supabase
      .from('destinations')
      .update({
        place_id: enriched.places.place_id,
        rating: enriched.places.rating,
        price_level: enriched.places.price_level,
        opening_hours: enriched.places.opening_hours,
        phone_number: enriched.places.phone_number,
        website: enriched.places.website,
        google_maps_url: enriched.places.google_maps_url,
        tags: enriched.gemini.tags,
        category: enriched.category,
        last_enriched_at: new Date().toISOString(),
      })
      .eq('slug', slug);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      data: enriched,
    });

  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('❌ Enrichment API error:', error);
    console.error('   Stack:', error.stack);

    return NextResponse.json(
      {
        success: false,
        error: 'Enrichment failed',
        message: error.message,
        details: error.stack?.split('\n').slice(0, 3).join('\n'),
      },
      { status: 500 }
    );
  }
}
