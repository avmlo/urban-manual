import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, withErrorHandling, createSuccessResponse, createValidationError, AdminContext } from '@/lib/errors'

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY

async function findPlaceId(query: string, name?: string, city?: string): Promise<string | null> {
  // Use Places API (New) - Text Search
  const searchQueries = [];
  
  // Strategy 1: Try exact query first (name + city)
  searchQueries.push(query);
  
  // Strategy 2: If we have name and city separately, try just name
  if (name && city && `${name} ${city}` !== query) {
    searchQueries.push(`${name} ${city}`);
    searchQueries.push(name);
    
    // Strategy 3: Try with cleaned name (remove common prefixes/suffixes)
    const cleanedName = name
      .replace(/^(the|a|an)\s+/i, '') // Remove "The", "A", "An" prefix
      .replace(/\s+(hotel|restaurant|cafe|bar|shop|store|mall|plaza|center|centre)$/i, '') // Remove common suffixes
      .trim();
    
    if (cleanedName !== name) {
      searchQueries.push(`${cleanedName} ${city}`);
    }
  }

  // Try each search query
  for (const searchQuery of searchQueries) {
    try {
      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY!,
          'X-Goog-FieldMask': 'places.id',
        },
        body: JSON.stringify({
          textQuery: searchQuery,
          maxResultCount: 1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.places && data.places.length > 0 && data.places[0].id) {
          return data.places[0].id;
        }
      }
    } catch (error) {
      console.error(`Error searching for "${searchQuery}":`, error);
      continue;
    }
  }
  
  return null;
}

async function getPlaceDetails(placeId: string) {
  // Use Places API (New) - Place Details
  const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY!,
      'X-Goog-FieldMask': [
        // Core fields
        'formattedAddress',
        'internationalPhoneNumber',
        'websiteUri',
        'priceLevel',
        'priceRange',
        'rating',
        'userRatingCount',
        'regularOpeningHours',
        'currentOpeningHours',
        'regularSecondaryOpeningHours',
        'plusCode',
        'location',
        'reviews',
        'businessStatus',
        'editorialSummary',
        'displayName',
        'types',
        'utcOffset',
        'shortFormattedAddress',
        'adrFormatAddress',
        'addressComponents',
        'iconMaskBaseUri',
        'iconBackgroundColor',
        // AI-powered summaries
        'generativeSummary',
        'reviewSummary',
        'neighborhoodSummary',
        // Atmosphere: Service options
        'dineIn',
        'delivery',
        'takeout',
        'curbsidePickup',
        'reservable',
        // Atmosphere: Dining features
        'servesBreakfast',
        'servesBrunch',
        'servesLunch',
        'servesDinner',
        'servesDessert',
        'servesCoffee',
        'servesBeer',
        'servesWine',
        'servesCocktails',
        'servesVegetarianFood',
        // Atmosphere: Place features
        'outdoorSeating',
        'liveMusic',
        'goodForChildren',
        'goodForGroups',
        'goodForWatchingSports',
        'menuForChildren',
        'allowsDogs',
        'restroom',
        // Atmosphere: Practical info
        'parkingOptions',
        'paymentOptions',
        'accessibilityOptions',
      ].join(','),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Places API (New) error: ${response.status}`, errorText);
    return null;
  }

  const place = await response.json();
  
  // Transform new API format to old format for compatibility
  return {
    formatted_address: place.formattedAddress || '',
    international_phone_number: place.internationalPhoneNumber || '',
    website: place.websiteUri || '',
    price_level: place.priceLevel ? priceLevelToNumber(place.priceLevel) : null,
    price_range: place.priceRange ?? null,
    rating: place.rating ?? null,
    user_ratings_total: place.userRatingCount ?? null,
    opening_hours: place.regularOpeningHours ? transformOpeningHours(place.regularOpeningHours) : null,
    current_opening_hours: place.currentOpeningHours ? transformOpeningHours(place.currentOpeningHours) : null,
    secondary_opening_hours: place.regularSecondaryOpeningHours ? transformOpeningHours(place.regularSecondaryOpeningHours) : null,
    plus_code: place.plusCode?.globalCode || null,
    geometry: place.location ? {
      location: {
        lat: place.location.latitude,
        lng: place.location.longitude,
      },
    } : null,
    reviews: place.reviews ? place.reviews.slice(0, 5).map((r: any) => ({
      author_name: r.authorDisplayName || '',
      rating: r.rating || null,
      text: r.text?.text || '',
      time: r.publishTime ? new Date(r.publishTime).getTime() / 1000 : null,
    })) : null,
    business_status: place.businessStatus || null,
    editorial_summary: place.editorialSummary ? {
      overview: place.editorialSummary.overview || '',
    } : null,
    name: place.displayName?.text || '',
    types: place.types || [],
    utc_offset: place.utcOffset ? place.utcOffset.totalSeconds / 60 : null,
    vicinity: place.shortFormattedAddress || '',
    adr_address: place.adrFormatAddress || '',
    address_components: place.addressComponents || null,
    icon: place.iconMaskBaseUri || null,
    icon_background_color: place.iconBackgroundColor || null,
    icon_mask_base_uri: place.iconMaskBaseUri || null,
    // AI-powered summaries
    generative_summary: place.generativeSummary?.overview?.text || null,
    review_summary: place.reviewSummary?.text?.text || null,
    neighborhood_summary: place.neighborhoodSummary?.text?.text || null,
    // Accessibility
    accessibility_options: place.accessibilityOptions ?? null,
    // Atmosphere data (structured)
    atmosphere: {
      dine_in: place.dineIn ?? null,
      delivery: place.delivery ?? null,
      takeout: place.takeout ?? null,
      curbside_pickup: place.curbsidePickup ?? null,
      reservable: place.reservable ?? null,
      serves_breakfast: place.servesBreakfast ?? null,
      serves_brunch: place.servesBrunch ?? null,
      serves_lunch: place.servesLunch ?? null,
      serves_dinner: place.servesDinner ?? null,
      serves_dessert: place.servesDessert ?? null,
      serves_coffee: place.servesCoffee ?? null,
      serves_beer: place.servesBeer ?? null,
      serves_wine: place.servesWine ?? null,
      serves_cocktails: place.servesCocktails ?? null,
      serves_vegetarian_food: place.servesVegetarianFood ?? null,
      outdoor_seating: place.outdoorSeating ?? null,
      live_music: place.liveMusic ?? null,
      good_for_children: place.goodForChildren ?? null,
      good_for_groups: place.goodForGroups ?? null,
      good_for_watching_sports: place.goodForWatchingSports ?? null,
      menu_for_children: place.menuForChildren ?? null,
      allows_dogs: place.allowsDogs ?? null,
      restroom: place.restroom ?? null,
      parking_options: place.parkingOptions ?? null,
      payment_options: place.paymentOptions ?? null,
    },
  };
}

// Helper to convert price level from enum to number
function priceLevelToNumber(priceLevel: string): number | null {
  const mapping: Record<string, number> = {
    'PRICE_LEVEL_FREE': 0,
    'PRICE_LEVEL_INEXPENSIVE': 1,
    'PRICE_LEVEL_MODERATE': 2,
    'PRICE_LEVEL_EXPENSIVE': 3,
    'PRICE_LEVEL_VERY_EXPENSIVE': 4,
  };
  return mapping[priceLevel] ?? null;
}

// Helper to transform opening hours format
function transformOpeningHours(hours: any): any {
  return {
    open_now: hours.openNow || false,
    weekday_text: hours.weekdayDescriptions || [],
    periods: hours.periods || [],
  };
}

async function getTimeZone(lat: number, lng: number) {
  const url = new URL('https://maps.googleapis.com/maps/api/timezone/json')
  url.searchParams.set('location', `${lat},${lng}`)
  url.searchParams.set('timestamp', Math.floor(Date.now() / 1000).toString())
  url.searchParams.set('key', GOOGLE_API_KEY!)
  const r = await fetch(url.toString())
  const j = await r.json()
  return j?.timeZoneId || null
}

export const POST = withAdminAuth(async (req: NextRequest, { serviceClient: supabase }: AdminContext) => {
  if (!GOOGLE_API_KEY) {
    throw createValidationError('Missing NEXT_PUBLIC_GOOGLE_API_KEY');
  }

  const body = await req.json().catch(() => ({})) as { slug?: string, limit?: number, offset?: number }
  const { slug, limit = 10, offset = 0 } = body

  // Select targets
  let rows: any[] = []
  if (slug) {
    const { data, error } = await supabase.from('destinations').select('slug,name,city,google_place_id').eq('slug', slug).limit(1)
    if (error) {
      throw error;
    }
    rows = data || []
    if (rows.length === 0) {
      throw createValidationError(`Destination not found with slug: ${slug}. Check the slug in your database.`);
    }
  } else {
    const { data, error } = await supabase
      .from('destinations')
      .select('slug,name,city,google_place_id')
      .or('google_place_id.is.null,formatted_address.is.null,international_phone_number.is.null,website.is.null')
      .order('slug', { ascending: true })
      .range(offset, Math.max(offset + limit - 1, offset))
    if (error) {
      throw error;
    }
    rows = data || []
  }

  const results: any[] = []
  for (const row of rows) {
    const query = `${row.name} ${row.city}`
    let placeId = row.google_place_id as string | null
    if (!placeId) placeId = await findPlaceId(query, row.name, row.city)
    if (!placeId) { results.push({ slug: row.slug, ok: false, reason: 'no_place_id', name: row.name, city: row.city }); continue }

    const details = await getPlaceDetails(placeId)
    if (!details) { results.push({ slug: row.slug, ok: false, reason: 'no_details' }); continue }

    const lat = details.geometry?.location?.lat
    const lng = details.geometry?.location?.lng
    const timezone_id = (lat != null && lng != null) ? await getTimeZone(lat, lng) : null

    const reviews = Array.isArray(details.reviews) ? details.reviews.slice(0, 5).map((r: any) => ({
      author_name: r.author_name,
      rating: r.rating,
      text: r.text,
      time: r.time,
      relative_time_description: r.relative_time_description,
      language: r.language,
    })) : []

    // Build update object with only basic fields first (these should always exist)
    const update: any = {
      google_place_id: placeId,
      formatted_address: details.formatted_address || null,
      international_phone_number: details.international_phone_number || null,
      website: details.website || null,
      price_level: details.price_level ?? null,
      rating: details.rating ?? null,
      user_ratings_total: details.user_ratings_total ?? null,
      opening_hours_json: details.opening_hours ? JSON.stringify(details.opening_hours) : null,
      plus_code: details.plus_code?.global_code || null,
      latitude: lat ?? null,
      longitude: lng ?? null,
      timezone_id,
      reviews_json: reviews.length ? JSON.stringify(reviews) : null,
    }

    // Try to add extended fields, but don't fail if columns don't exist
    // These fields require the extended migration to be run
    const extendedFields: any = {
      current_opening_hours_json: details.current_opening_hours ? JSON.stringify(details.current_opening_hours) : null,
      secondary_opening_hours_json: details.secondary_opening_hours ? JSON.stringify(details.secondary_opening_hours) : null,
      business_status: details.business_status || null,
      editorial_summary: details.editorial_summary?.overview || null,
      google_name: details.name || null,
      place_types_json: details.types ? JSON.stringify(details.types) : null,
      utc_offset: details.utc_offset ?? null,
      vicinity: details.vicinity || null,
      adr_address: details.adr_address || null,
      address_components_json: details.address_components ? JSON.stringify(details.address_components) : null,
      icon_url: details.icon || null,
      icon_background_color: details.icon_background_color || null,
      icon_mask_base_uri: details.icon_mask_base_uri || null,
      // AI-powered summaries
      generative_summary: details.generative_summary || null,
      review_summary: details.review_summary || null,
      neighborhood_summary: details.neighborhood_summary || null,
      // Atmosphere data (all service/dining/feature booleans + parking/payment/accessibility)
      google_atmosphere_json: JSON.stringify(details.atmosphere),
      accessibility_options_json: details.accessibility_options ? JSON.stringify(details.accessibility_options) : null,
      price_range_json: details.price_range ? JSON.stringify(details.price_range) : null,
    }

    // Try updating with extended fields first, if it fails, fall back to basic fields
    const { error: upErr } = await supabase.from('destinations').update({ ...update, ...extendedFields } as any).eq('slug', row.slug)

    if (upErr && upErr.message?.includes('column') && upErr.message?.includes('schema cache')) {
      // If extended columns don't exist, try with just basic fields
      const { error: basicErr } = await supabase.from('destinations').update(update as any).eq('slug', row.slug)
      if (basicErr) {
        results.push({ slug: row.slug, ok: false, error: basicErr.message, reason: 'update_failed' })
      } else {
        results.push({ slug: row.slug, ok: true, note: 'enriched_with_basic_fields_only' })
      }
    } else if (upErr) {
      results.push({ slug: row.slug, ok: false, error: upErr.message, reason: 'update_failed' })
    } else {
      results.push({ slug: row.slug, ok: true })
    }
  }

  return createSuccessResponse({ count: results.length, results, nextOffset: offset + results.length });
});

export const GET = withErrorHandling(async () => {
  return createSuccessResponse({
    ok: true,
    message: 'Use POST with JSON to run enrichment.',
    example: {
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer <your-session-access-token>' },
      body: { limit: 100, offset: 0 },
    },
  });
});
