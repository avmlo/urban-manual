/**
 * Destination Enrichment Service
 * Uses Google Places API (New) + Gemini AI to enrich destination data
 */

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

export interface PlacesEnrichmentData {
  place_id: string | null;
  rating: number | null;
  price_level: number | null;
  opening_hours: any | null;
  phone_number: string | null;
  website: string | null;
  google_maps_url: string | null;
  google_types: string[];
  cuisine_type: string | null;
  // Additional fields from Place Details API
  formatted_address: string | null;
  international_phone_number: string | null;
  latitude: number | null;
  longitude: number | null;
  user_ratings_total: number | null;
  reviews: any[] | null;
  business_status: string | null;
  editorial_summary: string | null;
  plus_code: string | null;
  timezone_id: string | null;
  vicinity: string | null;
  address_components: any | null;
}

export interface GeminiTagsData {
  tags: string[];
  suggested_category: string | null;
}

export interface EnrichedData {
  places: PlacesEnrichmentData;
  gemini: GeminiTagsData;
  category: string; // Final category decision
}

/**
 * Step 1: Search for place using Places API (New) - Text Search
 */
export async function findPlaceByText(
  name: string,
  city: string
): Promise<PlacesEnrichmentData> {
  // Check for API key at runtime, not just module load time
  const apiKey = GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('NEXT_PUBLIC_GOOGLE_API_KEY is not configured in environment variables');
    throw new Error('Google API key not configured');
  }

  try {
    // Use Places API (New) - Text Search
    const searchQuery = `${name}, ${city}`;
    console.log(`📍 Searching Google Places for: "${searchQuery}"`);

    const response = await fetch(
      `https://places.googleapis.com/v1/places:searchText`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.priceLevel,places.regularOpeningHours,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.types',
        },
        body: JSON.stringify({
          textQuery: searchQuery,
          maxResultCount: 1,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Places API error ${response.status}:`, errorText);
      throw new Error(`Places API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.places || data.places.length === 0) {
      console.warn(`No place found for: "${searchQuery}"`);
      return {
        place_id: null,
        rating: null,
        price_level: null,
        opening_hours: null,
        phone_number: null,
        website: null,
        google_maps_url: null,
        google_types: [],
        cuisine_type: null,
        formatted_address: null,
        international_phone_number: null,
        latitude: null,
        longitude: null,
        user_ratings_total: null,
        reviews: null,
        business_status: null,
        editorial_summary: null,
        plus_code: null,
        timezone_id: null,
        vicinity: null,
        address_components: null,
      };
    }

    const place = data.places[0];
    console.log(`Found place: ${place.displayName?.text || name} (${place.id})`);
    console.log(`   Rating: ${place.rating || 'N/A'}, Types: ${(place.types || []).join(', ')}`);

    // Extract cuisine type from types array
    // Look for patterns like: italian_restaurant, mexican_restaurant, japanese_restaurant, etc.
    const cuisineType = extractCuisineType(place.types || []);

    // Convert price level from Google's format to 1-4
    const priceLevelMap: Record<string, number> = {
      'PRICE_LEVEL_FREE': 1,
      'PRICE_LEVEL_INEXPENSIVE': 1,
      'PRICE_LEVEL_MODERATE': 2,
      'PRICE_LEVEL_EXPENSIVE': 3,
      'PRICE_LEVEL_VERY_EXPENSIVE': 4,
    };

    // Now fetch full place details using Place Details API
    let placeDetails: any = null;
    if (place.id) {
      try {
        placeDetails = await getPlaceDetails(place.id);
      } catch (error) {
        console.warn(`Failed to fetch place details for ${place.id}:`, error);
      }
    }

    return {
      place_id: place.id || null,
      rating: place.rating || placeDetails?.rating || null,
      price_level: place.priceLevel ? priceLevelMap[place.priceLevel] : (placeDetails?.price_level ?? null),
      opening_hours: place.regularOpeningHours || placeDetails?.opening_hours || null,
      phone_number: place.internationalPhoneNumber || placeDetails?.international_phone_number || null,
      website: place.websiteUri || placeDetails?.website || null,
      google_maps_url: place.googleMapsUri || null,
      google_types: place.types || [],
      cuisine_type: cuisineType,
      // Additional fields from Place Details
      formatted_address: placeDetails?.formatted_address || null,
      international_phone_number: placeDetails?.international_phone_number || place.internationalPhoneNumber || null,
      latitude: placeDetails?.geometry?.location?.lat || null,
      longitude: placeDetails?.geometry?.location?.lng || null,
      user_ratings_total: placeDetails?.user_ratings_total || null,
      reviews: placeDetails?.reviews || null,
      business_status: placeDetails?.business_status || null,
      editorial_summary: placeDetails?.editorial_summary?.overview || null,
      plus_code: placeDetails?.plus_code?.global_code || null,
      timezone_id: placeDetails?.timezone_id || null,
      vicinity: placeDetails?.vicinity || null,
      address_components: placeDetails?.address_components || null,
    };
  } catch (error) {
    console.error('Places API error:', error);
    return {
      place_id: null,
      rating: null,
      price_level: null,
      opening_hours: null,
      phone_number: null,
      website: null,
      google_maps_url: null,
      google_types: [],
      cuisine_type: null,
      formatted_address: null,
      international_phone_number: null,
      latitude: null,
      longitude: null,
      user_ratings_total: null,
      reviews: null,
      business_status: null,
      editorial_summary: null,
      plus_code: null,
      timezone_id: null,
      vicinity: null,
      address_components: null,
    };
  }
}

/**
 * Fetch detailed place information using Place Details API
 */
async function getPlaceDetails(placeId: string): Promise<any | null> {
  const apiKey = GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('Google API key not configured');
  }

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,internationalPhoneNumber,websiteUri,rating,userRatingCount,priceLevel,regularOpeningHours,currentOpeningHours,location,plusCode,reviews,businessStatus,editorialSummary,types,shortFormattedAddress,adrFormatAddress,addressComponents,iconMaskBaseUri,iconBackgroundColor',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Place Details API error ${response.status}:`, errorText);
      return null;
    }

    const place = await response.json();
    
    // Helper to convert price level
    const priceLevelMap: Record<string, number> = {
      'PRICE_LEVEL_FREE': 0,
      'PRICE_LEVEL_INEXPENSIVE': 1,
      'PRICE_LEVEL_MODERATE': 2,
      'PRICE_LEVEL_EXPENSIVE': 3,
      'PRICE_LEVEL_VERY_EXPENSIVE': 4,
    };

    // Get timezone if location is available
    let timezoneId: string | null = null;
    if (place.location?.latitude && place.location?.longitude) {
      try {
        const timezoneUrl = new URL('https://maps.googleapis.com/maps/api/timezone/json');
        timezoneUrl.searchParams.set('location', `${place.location.latitude},${place.location.longitude}`);
        timezoneUrl.searchParams.set('timestamp', Math.floor(Date.now() / 1000).toString());
        timezoneUrl.searchParams.set('key', apiKey);
        const timezoneResponse = await fetch(timezoneUrl.toString());
        const timezoneData = await timezoneResponse.json();
        timezoneId = timezoneData?.timeZoneId || null;
      } catch (error) {
        console.warn('Failed to fetch timezone:', error);
      }
    }
    
    // Transform to our format
    return {
      formatted_address: place.formattedAddress || null,
      international_phone_number: place.internationalPhoneNumber || null,
      website: place.websiteUri || null,
      rating: place.rating ?? null,
      user_ratings_total: place.userRatingCount ?? null,
      price_level: place.priceLevel ? priceLevelMap[place.priceLevel] ?? null : null,
      opening_hours: place.regularOpeningHours || null,
      current_opening_hours: place.currentOpeningHours || null,
      secondary_opening_hours: place.secondaryOpeningHours || null,
      geometry: place.location ? {
        location: {
          lat: place.location.latitude,
          lng: place.location.longitude,
        },
      } : null,
      plus_code: place.plusCode ? {
        global_code: place.plusCode.globalCode || null,
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
      types: place.types || [],
      vicinity: place.shortFormattedAddress || null,
      adr_address: place.adrFormatAddress || null,
      address_components: place.addressComponents || null,
      icon_mask_base_uri: place.iconMaskBaseUri || null,
      icon_background_color: place.iconBackgroundColor || null,
      timezone_id: timezoneId,
    };
  } catch (error) {
    console.error('Place Details API error:', error);
    return null;
  }
}

/**
 * Extract cuisine type from Google Places types array
 */
function extractCuisineType(types: string[]): string | null {
  if (!types || types.length === 0) return null;

  // Look for cuisine-specific restaurant types
  // Common patterns: {cuisine}_restaurant (e.g., italian_restaurant, mexican_restaurant)
  const cuisineTypes = types.filter(type => 
    type.includes('_restaurant') && 
    type !== 'restaurant' && 
    type !== 'food' &&
    !type.includes('fast_food') &&
    !type.includes('pizza')
  );

  if (cuisineTypes.length > 0) {
    // Return the first cuisine type found, removing '_restaurant' suffix for cleaner display
    const cuisine = cuisineTypes[0].replace('_restaurant', '');
    // Capitalize first letter
    return cuisine.charAt(0).toUpperCase() + cuisine.slice(1);
  }

  return null;
}

/**
 * Step 2: Generate AI tags and category using Gemini
 */
export async function generateGeminiTags(
  name: string,
  city: string,
  existingCategory?: string,
  description?: string,
  googleTypes?: string[]
): Promise<GeminiTagsData> {
  const apiKey = GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('NEXT_PUBLIC_GOOGLE_API_KEY is not configured in environment variables');
    throw new Error('Google API key not configured');
  }

  try {
    console.log(`🤖 Generating AI tags for: ${name}`);

    const prompt = `You are a travel expert categorizing destinations. Analyze this place and provide:
1. 5-8 descriptive tags (e.g., "romantic", "family-friendly", "instagrammable", "hidden gem", "michelin-recommended", "rooftop", "speakeasy", etc.)
2. Best category classification

Place: ${name}
Location: ${city}
${existingCategory ? `Current category: ${existingCategory}` : ''}
${description ? `Description: ${description}` : ''}
${googleTypes?.length ? `Google types: ${googleTypes.join(', ')}` : ''}

Respond ONLY with valid JSON in this exact format:
{
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "suggested_category": "Category Name"
}

Tags should be lowercase, concise, and highly searchable. Categories should be one of: Restaurants, Cafes, Bars, Hotels, Culture, Shopping, Nightlife, Activities, Other.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 200,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error ${response.status}:`, errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response (Gemini sometimes adds markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No valid JSON in Gemini response:', text);
      throw new Error('No valid JSON in Gemini response');
    }

    const result = JSON.parse(jsonMatch[0]);
    console.log(`Generated ${result.tags?.length || 0} tags: ${(result.tags || []).join(', ')}`);
    console.log(`   Suggested category: ${result.suggested_category || 'None'}`);

    return {
      tags: result.tags || [],
      suggested_category: result.suggested_category || null,
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      tags: [],
      suggested_category: null,
    };
  }
}

/**
 * Step 3: Determine best category from Google types
 */
export function categorizePlaceFromTypes(googleTypes: string[]): string | null {
  const typeMap: Record<string, string> = {
    restaurant: 'Restaurant',
    meal_takeaway: 'Restaurant',
    meal_delivery: 'Restaurant',
    cafe: 'Cafe',
    bar: 'Bar',
    night_club: 'Bar',
    lodging: 'Hotel',
    museum: 'Culture',
    art_gallery: 'Culture',
    library: 'Culture',
    tourist_attraction: 'Culture',
    shopping_mall: 'Shopping',
    store: 'Shopping',
    clothing_store: 'Shopping',
    shoe_store: 'Shopping',
    jewelry_store: 'Shopping',
    electronics_store: 'Shopping',
    book_store: 'Shopping',
    furniture_store: 'Shopping',
    home_goods_store: 'Shopping',
    department_store: 'Shopping',
    bakery: 'Bakery',
    park: 'Park',
    spa: 'Other',
    gym: 'Other',
    beauty_salon: 'Other',
    hair_care: 'Other',
    establishment: 'Other',
    point_of_interest: 'Other',
  };

  for (const type of googleTypes) {
    if (typeMap[type]) {
      return typeMap[type];
    }
  }

  return null;
}

/**
 * Main enrichment function - combines Places API + Gemini
 */
export async function enrichDestination(
  name: string,
  city: string,
  existingCategory?: string,
  description?: string
): Promise<EnrichedData> {
  console.log(`\n🚀 Starting enrichment for: ${name} in ${city}`);
  console.log(`   Existing category: ${existingCategory || 'None'}`);

  // Step 1: Get Google Places data
  const placesData = await findPlaceByText(name, city);

  // Step 2: Generate Gemini tags
  const geminiData = await generateGeminiTags(
    name,
    city,
    existingCategory,
    description,
    placesData.google_types
  );

  // Step 3: Determine final category
  let finalCategory = existingCategory || '';

  // Special rules: Places starting with "apple" or "aesop"/"aēsop" should be Shopping (retail stores)
  const nameLower = name.toLowerCase();
  if (nameLower.startsWith('apple')) {
    console.log(`Category from name rule: Shopping (Apple store)`);
    finalCategory = 'Shopping';
  } else if (nameLower.startsWith('aesop') || nameLower.startsWith('aēsop')) {
    console.log(`Category from name rule: Shopping (Aesop store)`);
    finalCategory = 'Shopping';
  }
  // Priority: Google types > Gemini suggestion > existing
  else if (placesData.google_types.length > 0) {
    const googleCategory = categorizePlaceFromTypes(placesData.google_types);
    if (googleCategory) {
      console.log(`Category from Google types: ${googleCategory}`);
      finalCategory = googleCategory;
    }
  } else if (geminiData.suggested_category) {
    console.log(`Category from Gemini: ${geminiData.suggested_category}`);
    finalCategory = geminiData.suggested_category;
  } else {
    console.log(`Keeping existing category: ${finalCategory}`);
  }

  // Note: If destination has michelin_stars > 0, category will be enforced at database level
  // via the trigger created in migration 421_ensure_michelin_is_dining.sql

  console.log(`Enrichment complete for ${name}`);
  console.log(`   Place ID: ${placesData.place_id || 'Not found'}`);
  console.log(`   Rating: ${placesData.rating || 'N/A'}`);
  console.log(`   Tags: ${geminiData.tags.length} tags generated`);
  console.log(`   Final category: ${finalCategory}\n`);

  return {
    places: placesData,
    gemini: geminiData,
    category: finalCategory,
  };
}
