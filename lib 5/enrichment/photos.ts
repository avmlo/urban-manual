/**
 * Google Places Photos API Integration
 * Fetches high-quality photos for destinations
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

export interface PlacePhoto {
  name: string; // photoReference
  widthPx: number;
  heightPx: number;
  authorAttributions?: Array<{
    displayName: string;
    uri?: string;
    photoUri?: string;
  }>;
}

export interface PhotoMetadata {
  photoReference: string;
  url: string;
  width: number;
  height: number;
  author?: string;
  authorUri?: string;
}

/**
 * Fetch photos for a place ID
 */
export async function fetchPlacePhotos(placeId: string): Promise<PlacePhoto[]> {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY not configured');
  }

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY!,
          'X-Goog-FieldMask': 'photos',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Places API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.photos || [];
  } catch (error: any) {
    console.error(`Error fetching photos for place ${placeId}:`, error.message);
    return [];
  }
}

/**
 * Get photo URL from photo reference
 * @param photoReference - The photo reference from Places API
 * @param maxWidth - Maximum width in pixels (default: 1200)
 * @param maxHeight - Maximum height in pixels (optional)
 */
export function getPhotoUrl(
  photoReference: string,
  maxWidth: number = 1200,
  maxHeight?: number
): string {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY not configured');
  }

  const params = new URLSearchParams({
    photo_reference: photoReference,
    maxwidth: maxWidth.toString(),
    key: GOOGLE_API_KEY!,
  });

  if (maxHeight) {
    params.set('maxheight', maxHeight.toString());
  }

  return `https://places.googleapis.com/v1/${photoReference}/media?${params.toString()}`;
}

/**
 * Fetch and process photos for a destination
 * Returns an array of photo metadata with URLs
 */
export async function processPlacePhotos(
  placeId: string,
  limit: number = 10
): Promise<PhotoMetadata[]> {
  const photos = await fetchPlacePhotos(placeId);
  
  if (photos.length === 0) {
    return [];
  }

  // Process up to limit photos
  const photosToProcess = photos.slice(0, limit);
  
  const processedPhotos: PhotoMetadata[] = photosToProcess.map((photo) => {
    const photoReference = photo.name.split('/').pop() || photo.name;
    
    return {
      photoReference,
      url: getPhotoUrl(photoReference, 1200),
      width: photo.widthPx,
      height: photo.heightPx,
      author: photo.authorAttributions?.[0]?.displayName,
      authorUri: photo.authorAttributions?.[0]?.uri,
    };
  });

  return processedPhotos;
}

