import { NextRequest, NextResponse } from 'next/server';
import { htmlToPlainText } from '@/lib/sanitize';
import {
  withErrorHandling,
  createValidationError,
  createNotFoundError,
  createSuccessResponse,
} from '@/lib/errors';
import {
  proxyRatelimit,
  memoryProxyRatelimit,
  enforceRateLimit,
} from '@/lib/rate-limit';

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

async function findPlaceId(query: string, name?: string, city?: string): Promise<string | null> {
  if (!GOOGLE_API_KEY) return null;
  
  // Use Places API (New) - Text Search
  const searchQueries = [];
  
  // Strategy 1: Try exact query first (name + city)
  searchQueries.push(query);
  
  // Strategy 2: If we have name and city separately, try just name
  if (name && city && `${name} ${city}` !== query) {
    searchQueries.push(`${name} ${city}`);
    searchQueries.push(name);
  }

  // Try each search query
  for (const searchQuery of searchQueries) {
    try {
      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
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

async function getPlaceDetails(placeId: string, minimal: boolean = false) {
  if (!GOOGLE_API_KEY) return null;

  // Build field mask - skip photos and reviews in minimal mode for faster response
  const fields = [
    'displayName',
    'formattedAddress',
    'addressComponents',
    'internationalPhoneNumber',
    'websiteUri',
    'priceLevel',
    'rating',
    'userRatingCount',
    'regularOpeningHours',
    'currentOpeningHours',
    'editorialSummary',
    'types',
    'primaryTypeDisplayName',
    'location',
    'googleMapsUri',
    'businessStatus',
  ];

  // Only request photos and reviews if not in minimal mode
  if (!minimal) {
    fields.push('photos');
    fields.push('reviews');
  }

  // Use Places API (New) - Place Details
  const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': fields.join(','),
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
    name: place.displayName?.text || '',
    formatted_address: place.formattedAddress || '',
    international_phone_number: place.internationalPhoneNumber || '',
    website: place.websiteUri || '',
    price_level: place.priceLevel ? priceLevelToNumber(place.priceLevel) : null,
    rating: place.rating ?? null,
    user_ratings_total: place.userRatingCount ?? null,
    opening_hours: place.regularOpeningHours ? transformOpeningHours(place.regularOpeningHours) : null,
    current_opening_hours: place.currentOpeningHours ? transformOpeningHours(place.currentOpeningHours) : null,
    editorial_summary: place.editorialSummary ? {
      overview: place.editorialSummary.overview || '',
    } : null,
    types: place.types || [],
    primary_type_display_name: place.primaryTypeDisplayName?.text || null,
    photos: place.photos || null,
    address_components: place.addressComponents || null,
    geometry: place.location ? {
      location: {
        lat: place.location.latitude,
        lng: place.location.longitude,
      },
    } : null,
    google_maps_uri: place.googleMapsUri || null,
    business_status: place.businessStatus || null,
    reviews: place.reviews ? place.reviews.slice(0, 5).map((r: any) => ({
      author_name: r.authorAttribution?.displayName || '',
      rating: r.rating || null,
      text: r.text?.text || '',
      time: r.publishTime || null,
      relative_time: r.relativePublishTimeDescription || '',
    })) : null,
  };
}

// Helper to extract cuisine type from types array
function extractCuisineType(types: string[]): string | null {
  if (!types || types.length === 0) return null;
  const cuisineTypes = types.filter(type => 
    type.includes('_restaurant') && 
    type !== 'restaurant' && 
    type !== 'food' &&
    !type.includes('fast_food') &&
    !type.includes('pizza')
  );
  if (cuisineTypes.length > 0) {
    const cuisine = cuisineTypes[0].replace('_restaurant', '');
    return cuisine.charAt(0).toUpperCase() + cuisine.slice(1);
  }
  return null;
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

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Rate limiting for external API proxy
  const rateLimitResponse = await enforceRateLimit({
    request,
    message: 'Too many place detail requests. Please try again later.',
    limiter: proxyRatelimit,
    memoryLimiter: memoryProxyRatelimit,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const body = await request.json();
  const { name, city, placeId, minimal } = body;

  // If placeId is provided directly, use it (from autocomplete)
  let finalPlaceId: string | null = null;

  if (placeId) {
    finalPlaceId = placeId;
  } else if (name) {
    // Build search query
    const query = city ? `${name}, ${city}` : name;

    // Find place ID
    finalPlaceId = await findPlaceId(query, name, city);
    if (!finalPlaceId) {
      throw createNotFoundError('Place');
    }
  } else {
    throw createValidationError('Name or placeId is required');
  }

  // Ensure we have a valid placeId
  if (!finalPlaceId) {
    throw createValidationError('Place ID is required');
  }

  // Get place details (skip photos in minimal mode for faster itinerary additions)
  const details = await getPlaceDetails(finalPlaceId, minimal === true);
  if (!details) {
    throw createNotFoundError('Place details');
  }

  // Extract city, country, and neighborhood from address components
  let extractedCity = city;
  let extractedCountry = '';
  let extractedNeighborhood = '';

  if (details.address_components) {
    for (const component of details.address_components) {
      const types = component.types || [];
      // City
      if (!extractedCity && types.includes('locality')) {
        extractedCity = component.longText || component.shortText || '';
      }
      // Country
      if (types.includes('country')) {
        extractedCountry = component.longText || component.shortText || '';
      }
      // Neighborhood
      if (!extractedNeighborhood && (types.includes('neighborhood') || types.includes('sublocality') || types.includes('sublocality_level_1'))) {
        extractedNeighborhood = component.longText || component.shortText || '';
      }
    }
    // Fallback city to administrative_area_level_1 if locality not found
    if (!extractedCity) {
      for (const component of details.address_components) {
        if (component.types?.includes('administrative_area_level_1')) {
          extractedCity = component.longText || component.shortText || '';
          break;
        }
      }
    }
  }
  // Last resort: extract city from formatted address
  if (!extractedCity && details.formatted_address) {
    const addressParts = details.formatted_address.split(',').map((p: string) => p.trim());
    if (addressParts.length >= 2) {
      extractedCity = addressParts[addressParts.length - 3] || addressParts[addressParts.length - 2] || '';
    }
  }

  // Determine category from types
  let category = '';
  if (details.types && Array.isArray(details.types)) {
    // Priority order for category mapping
    const categoryMap: Record<string, string> = {
      'restaurant': 'restaurant',
      'cafe': 'cafe',
      'bar': 'bar',
      'lodging': 'hotel',
      'museum': 'museum',
      'art_gallery': 'gallery',
      'shopping_mall': 'shopping',
      'store': 'shopping',
      'park': 'park',
      'tourist_attraction': 'attraction',
      'church': 'attraction',
      'temple': 'attraction',
    };

    for (const type of details.types) {
      if (categoryMap[type]) {
        category = categoryMap[type];
        break;
      }
    }

    if (!category) {
      category = details.types[0]?.replace(/_/g, ' ') || '';
    }
  }

  // Get first photo if available
  let imageUrl = null;
  if (details.photos && details.photos.length > 0) {
    const photo = details.photos[0];
    // New Places API uses 'name' property which is a full path like 'places/ChIJ.../photos/photo_reference'
    if (photo.name) {
      // Use our proxy endpoint to fetch the photo (avoids CORS and auth issues)
      imageUrl = `/api/google-place-photo?name=${encodeURIComponent(photo.name)}&maxWidth=1200`;
    } else if (photo.photo_reference) {
      // Fallback to old API format if photo_reference exists
      imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${photo.photo_reference}&key=${GOOGLE_API_KEY}`;
    }
  }

  // Build Google Maps URL from place_id or use the one from API
  const googleMapsUrl = details.google_maps_uri || `https://www.google.com/maps/place/?q=place_id:${finalPlaceId}`;

  // Build response with form-friendly data
  const editorialSummary = htmlToPlainText(details.editorial_summary?.overview || '');
  const result = {
    name: details.name || name,
    city: extractedCity || city || '',
    country: extractedCountry,
    neighborhood: extractedNeighborhood,
    category: category,
    description: editorialSummary,
    content: editorialSummary,
    editorial_summary: editorialSummary,
    image: imageUrl,
    address: details.formatted_address || '',
    formatted_address: details.formatted_address || '',
    phone_number: details.international_phone_number || '',
    website: details.website || '',
    rating: details.rating || null,
    user_ratings_total: details.user_ratings_total || null,
    price_level: details.price_level || null,
    opening_hours: details.current_opening_hours || details.opening_hours || null,
    place_types: details.types || [],
    cuisine_type: extractCuisineType(details.types || []),
    // Include coordinates for transit connector
    latitude: details.geometry?.location?.lat || null,
    longitude: details.geometry?.location?.lng || null,
    place_id: finalPlaceId,
    google_maps_url: googleMapsUrl,
    google_name: details.name || '',
    business_status: details.business_status || null,
    reviews: details.reviews || [],
  };

  return createSuccessResponse(result);
})
