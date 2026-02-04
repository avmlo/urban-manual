import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/adminAuth';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

function stripHtmlTags(text: string | null | undefined): string {
  if (!text) return '';
  
  return text
    .replace(/<p[^>]*>/gi, '') // Remove opening <p> tags
    .replace(/<\/p>/gi, '')    // Remove closing </p> tags
    .replace(/<br\s*\/?>/gi, '\n') // Convert <br> to newlines
    .trim();
}

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

async function getPlaceDetails(placeId: string) {
  if (!GOOGLE_API_KEY) return null;
  
  // Use Places API (New) - Place Details
  const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': [
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
        'photos',
        'location',
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

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { name, city, placeId } = body;

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
        return NextResponse.json({ error: 'Place not found' }, { status: 404 });
      }
    } else {
      return NextResponse.json({ error: 'Name or placeId is required' }, { status: 400 });
    }

    // Ensure we have a valid placeId
    if (!finalPlaceId) {
      return NextResponse.json({ error: 'Place ID is required' }, { status: 400 });
    }

    // Get place details
    const details = await getPlaceDetails(finalPlaceId);
    if (!details) {
      return NextResponse.json({ error: 'Failed to fetch place details' }, { status: 500 });
    }

    // Extract city from address components (more reliable) or formatted address
    let extractedCity = city;
    if (!extractedCity && details.address_components) {
      // Try to find city from address components
      for (const component of details.address_components) {
        if (component.types?.includes('locality')) {
          extractedCity = component.longText || component.shortText || extractedCity;
          break;
        }
      }
      // Fallback to administrative_area_level_1 if locality not found
      if (!extractedCity) {
        for (const component of details.address_components) {
          if (component.types?.includes('administrative_area_level_1')) {
            extractedCity = component.longText || component.shortText || extractedCity;
            break;
          }
        }
      }
    }
    // Last resort: extract from formatted address
    if (!extractedCity && details.formatted_address) {
      const addressParts = details.formatted_address.split(',').map((p: string) => p.trim());
      if (addressParts.length >= 2) {
        // Usually city is second-to-last (before country) or third-to-last
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
        imageUrl = `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=1200&key=${GOOGLE_API_KEY}`;
      } else if (photo.photo_reference) {
        // Fallback to old API format if photo_reference exists
        imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${photo.photo_reference}&key=${GOOGLE_API_KEY}`;
      }
    }

    // Build response with form-friendly data
    const editorialSummary = stripHtmlTags(details.editorial_summary?.overview || '');
    const result = {
      name: details.name || name,
      city: extractedCity || city || '',
      category: category,
      description: editorialSummary,
      content: editorialSummary,
      image: imageUrl,
      formatted_address: details.formatted_address || '',
      phone: details.international_phone_number || '',
      website: details.website || '',
      rating: details.rating || null,
      price_level: details.price_level || null,
      opening_hours: details.current_opening_hours || details.opening_hours || null,
      place_types: details.types || [],
      cuisine_type: extractCuisineType(details.types || []),
    };

    return NextResponse.json(result);

  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Fetch Google Place error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch place data' }, { status: 500 });
  }
}
