import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from '@/lib/errors';
import { requireAdmin, AuthError } from '@/lib/adminAuth';

const GOOGLE_KEY = process.env.GOOGLE_PLACES_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

export const GET = withErrorHandling(async (request: NextRequest) => {
  try {
    // 1) Verify admin access
    const { serviceClient: supabase } = await requireAdmin(request);

    // 2) Pull sample from curated list: deduce "CITIES"
    const { data: cities, error: citiesError } = await supabase.rpc("get_primary_cities");

    if (citiesError) {
      console.error('[Discovery Fetch] Error getting cities:', citiesError);
      return NextResponse.json({ error: citiesError.message }, { status: 500 });
    }

    if (!cities || cities.length === 0) {
      return NextResponse.json({ inserted: 0, message: 'No cities found' });
    }

    if (!GOOGLE_KEY) {
      return NextResponse.json({ error: 'Google Places API key not configured' }, { status: 500 });
    }

    const candidates: any[] = [];

    // Process up to 6 cities
    for (const cityRow of cities.slice(0, 6)) {
      const city = cityRow.city || cityRow;
      if (!city) continue;

      const q = encodeURIComponent(`${city} restaurants hotels cafes`);
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${q}&key=${GOOGLE_KEY}`;

      try {
        const res = await fetch(url);
        const json = await res.json();

        if (json.status !== 'OK' || !json.results) {
          console.warn(`[Discovery Fetch] Google Places API error for ${city}:`, json.status);
          continue;
        }

        for (const r of json.results) {
          const photoUrl = r.photos?.[0]
            ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${r.photos[0].photo_reference}&key=${GOOGLE_KEY}`
            : null;

          candidates.push({
            place_id: r.place_id,
            name: r.name,
            address: r.formatted_address,
            city,
            category: r.types?.[0] ?? null,
            image_url: photoUrl,
            google_rating: r.rating ?? null,
            google_user_ratings_total: r.user_ratings_total ?? null,
            raw: r
          });
        }
      } catch (error) {
        console.error(`[Discovery Fetch] Error fetching places for ${city}:`, error);
        continue;
      }
    }

    // 3) Insert ignoring duplicates
    let insertedCount = 0;
    for (const c of candidates) {
      const { error } = await supabase
        .from("discovery_candidates")
        .upsert(c, { onConflict: "place_id" });

      if (!error) {
        insertedCount++;
      } else {
        console.error(`[Discovery Fetch] Error upserting candidate ${c.place_id}:`, error);
      }
    }

    return NextResponse.json({
      inserted: insertedCount,
      total: candidates.length,
      cities_processed: Math.min(cities.length, 6)
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
});
