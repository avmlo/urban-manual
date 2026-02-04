import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireAdmin, AuthError } from '@/lib/adminAuth';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!GOOGLE_API_KEY) {
      return NextResponse.json({ error: 'Google API key not configured' }, { status: 500 });
    }

    const { serviceClient: supabase } = await requireAdmin(request);

    const body = await request.json();
    const { offset = 0, limit = 10, slug } = body as {
      offset?: number;
      limit?: number;
      slug?: string;
    };

    let query = supabase
      .from('destinations')
      .select(`
        slug,
        name,
        city,
        category,
        description,
        content,
        michelin_stars,
        formatted_address,
        international_phone_number,
        website,
        rating,
        user_ratings_total,
        price_level,
        opening_hours_json,
        current_opening_hours_json,
        secondary_opening_hours_json,
        business_status,
        editorial_summary,
        google_name,
        place_types_json,
        utc_offset,
        vicinity,
        reviews_json,
        timezone_id,
        latitude,
        longitude,
        plus_code,
        adr_address,
        address_components_json,
        google_place_id
      `)
      .order('name');

    if (slug) {
      query = query.eq('slug', slug);
    } else {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: destinations, error } = await query;

    if (error) {
      console.error('Error fetching destinations:', error);
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
    }

    if (!destinations || destinations.length === 0) {
      return NextResponse.json({
        count: 0,
        results: [],
        nextOffset: 0,
        message: 'No destinations found',
      });
    }

    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const results: Array<{
      slug: string;
      ok: boolean;
      reason?: string;
      error?: string;
      content_length?: number;
      preview?: string;
    }> = [];

    for (const dest of destinations) {
      try {
        const openingHours =
          dest.opening_hours_json && typeof dest.opening_hours_json === 'string'
            ? JSON.parse(dest.opening_hours_json)
            : dest.opening_hours_json;

        const currentOpeningHours =
          dest.current_opening_hours_json && typeof dest.current_opening_hours_json === 'string'
            ? JSON.parse(dest.current_opening_hours_json)
            : dest.current_opening_hours_json;

        const secondaryOpeningHours =
          dest.secondary_opening_hours_json && typeof dest.secondary_opening_hours_json === 'string'
            ? JSON.parse(dest.secondary_opening_hours_json)
            : dest.secondary_opening_hours_json;

        const placeTypes =
          dest.place_types_json && typeof dest.place_types_json === 'string'
            ? JSON.parse(dest.place_types_json)
            : dest.place_types_json;

        const reviews =
          dest.reviews_json && typeof dest.reviews_json === 'string'
            ? JSON.parse(dest.reviews_json)
            : dest.reviews_json;

        const addressComponents =
          dest.address_components_json && typeof dest.address_components_json === 'string'
            ? JSON.parse(dest.address_components_json)
            : dest.address_components_json;

        const placeData = {
          name: dest.name,
          city: dest.city,
          category: dest.category,
          michelin_stars: dest.michelin_stars,
          google_name: dest.google_name,
          formatted_address: dest.formatted_address,
          vicinity: dest.vicinity,
          address_components: addressComponents,
          phone: dest.international_phone_number,
          website: dest.website,
          rating: dest.rating,
          review_count: dest.user_ratings_total,
          price_level: dest.price_level,
          business_status: dest.business_status,
          editorial_summary: dest.editorial_summary,
          place_types: placeTypes,
          opening_hours: openingHours,
          current_opening_hours: currentOpeningHours,
          secondary_opening_hours: secondaryOpeningHours,
          timezone: dest.timezone_id,
          utc_offset: dest.utc_offset,
          coordinates:
            dest.latitude && dest.longitude ? { lat: dest.latitude, lng: dest.longitude } : null,
          plus_code: dest.plus_code,
          reviews: Array.isArray(reviews) ? reviews.slice(0, 3) : [],
        };

        const prompt = `You are writing an engaging, informative "About" section for a travel destination guide. Use all the provided information to create a compelling description.

Place Information:
${JSON.stringify(placeData, null, 2)}

Requirements:
1. Write 2-4 paragraphs (approximately 150-300 words)
2. Be engaging and descriptive, highlighting what makes this place special
3. Include relevant details from the Google Places data (rating, price level, unique features)
4. Mention the location/neighborhood context if available
5. If there are reviews, subtly incorporate insights from them
6. If Michelin-starred, emphasize that distinction
7. Write in a style suitable for a premium travel guide
8. Avoid generic phrases, be specific and authentic
9. Do NOT include HTML tags or markdown formatting - just plain text with line breaks
10. If editorial_summary exists, use it as reference but expand and enhance it

Generate the "About" content now:`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const generatedContent = response.text().trim();

        if (!generatedContent || generatedContent.length < 50) {
          results.push({
            slug: dest.slug,
            ok: false,
            reason: 'content_too_short',
          });
          continue;
        }

        const { error: updateError } = await supabase
          .from('destinations')
          .update({ content: generatedContent })
          .eq('slug', dest.slug);

        if (updateError) {
          results.push({
            slug: dest.slug,
            ok: false,
            reason: 'update_error',
            error: updateError.message,
          });
        } else {
          results.push({
            slug: dest.slug,
            ok: true,
            content_length: generatedContent.length,
            preview: `${generatedContent.substring(0, 100)}...`,
          });
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`Regeneration failed for ${dest.slug}:`, error);
        results.push({
          slug: dest.slug,
          ok: false,
          reason: 'error',
          error: error?.message || 'unknown_error',
        });
      }
    }

    const successCount = results.filter(r => r.ok).length;
    const failureCount = results.filter(r => !r.ok).length;

    return NextResponse.json({
      count: destinations.length,
      success: successCount,
      failures: failureCount,
      results,
      nextOffset: slug ? 0 : offset + limit,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Regenerate content API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error?.message,
      },
      { status: 500 },
    );
  }
}
