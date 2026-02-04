/**
 * Google Distance Matrix API Integration
 * For calculating distances and travel times between multiple points
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

export interface DistanceMatrixElement {
  distanceMeters: number;
  duration: string;
  durationSeconds: number;
  status: 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS';
}

export interface DistanceMatrix {
  origins: Array<{ lat: number; lng: number } | string>;
  destinations: Array<{ lat: number; lng: number } | string>;
  elements: DistanceMatrixElement[][]; // [origin][destination]
}

/**
 * Calculate distance matrix between multiple origins and destinations
 */
export async function calculateDistanceMatrix(
  origins: Array<{ lat: number; lng: number } | string>,
  destinations: Array<{ lat: number; lng: number } | string>,
  mode: 'walking' | 'driving' | 'transit' | 'bicycling' = 'walking'
): Promise<DistanceMatrix | null> {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY not configured');
  }

  try {
    // Format origins
    const originsFormatted = origins.map(o => 
      typeof o === 'string' ? o : `${o.lat},${o.lng}`
    );

    // Format destinations
    const destinationsFormatted = destinations.map(d =>
      typeof d === 'string' ? `${d}` : `${d.lat},${d.lng}`
    );

    const requestBody: any = {
      origins: originsFormatted.map(o => {
        // Try to parse as lat/lng
        const coords = o.split(',');
        if (coords.length === 2 && !isNaN(parseFloat(coords[0]))) {
          return {
            location: { latLng: { latitude: parseFloat(coords[0]), longitude: parseFloat(coords[1]) } }
          };
        }
        return { address: o };
      }),
      destinations: destinationsFormatted.map(d => {
        const coords = d.split(',');
        if (coords.length === 2 && !isNaN(parseFloat(coords[0]))) {
          return {
            location: { latLng: { latitude: parseFloat(coords[0]), longitude: parseFloat(coords[1]) } }
          };
        }
        return { address: d };
      }),
      travelMode: mode.toUpperCase(),
      routingPreference: 'TRAFFIC_AWARE',
    };

    const response = await fetch(
      'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY!,
          'X-Goog-FieldMask': 'originIndex,destinationIndex,distanceMeters,duration',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Distance Matrix API error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.elements || data.elements.length === 0) {
      return null;
    }

    // Organize results into matrix format
    const elements: DistanceMatrixElement[][] = [];
    
    origins.forEach((_, originIndex) => {
      const row: DistanceMatrixElement[] = [];
      destinations.forEach((_, destIndex) => {
        const element = data.elements.find((e: any) => 
          e.originIndex === originIndex && e.destinationIndex === destIndex
        );
        
        if (element && element.status === 'OK') {
          row.push({
            distanceMeters: element.distanceMeters || 0,
            duration: formatDuration(element.duration),
            durationSeconds: parseDuration(element.duration),
            status: 'OK',
          });
        } else {
          row.push({
            distanceMeters: 0,
            duration: '0 mins',
            durationSeconds: 0,
            status: element?.status || 'NOT_FOUND',
          });
        }
      });
      elements.push(row);
    });

    return {
      origins,
      destinations,
      elements,
    };
  } catch (error: any) {
    console.error(`Error calculating distance matrix:`, error.message);
    return null;
  }
}

/**
 * Find nearby destinations within a certain distance/time
 */
export async function findNearbyDestinations(
  origin: { lat: number; lng: number },
  destinations: Array<{ lat: number; lng: number; slug: string }>,
  maxWalkingMinutes: number = 15,
  mode: 'walking' | 'driving' | 'transit' = 'walking'
): Promise<Array<{ slug: string; distanceMeters: number; durationMinutes: number }>> {
  const destinationsCoords = destinations.map(d => d.lat + ',' + d.lng);
  
  const matrix = await calculateDistanceMatrix(
    [`${origin.lat},${origin.lng}`],
    destinationsCoords,
    mode
  );

  if (!matrix || matrix.elements.length === 0) {
    return [];
  }

  const results: Array<{ slug: string; distanceMeters: number; durationMinutes: number }> = [];
  
  matrix.elements[0].forEach((element, index) => {
    if (element.status === 'OK' && element.durationSeconds <= maxWalkingMinutes * 60) {
      results.push({
        slug: destinations[index].slug,
        distanceMeters: element.distanceMeters,
        durationMinutes: Math.round(element.durationSeconds / 60),
      });
    }
  });

  // Sort by distance
  results.sort((a, b) => a.distanceMeters - b.distanceMeters);

  return results;
}

/**
 * Format duration string to seconds
 */
function formatDuration(duration: string): string {
  const seconds = parseDuration(duration);
  if (seconds < 60) {
    return `${seconds} secs`;
  } else {
    return `${Math.round(seconds / 60)} mins`;
  }
}

function parseDuration(duration: string): number {
  const match = duration.match(/(\d+)s/);
  if (match) {
    return parseInt(match[1], 10);
  }
  const seconds = parseInt(duration, 10);
  return isNaN(seconds) ? 0 : seconds;
}

