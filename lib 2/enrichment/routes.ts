/**
 * Google Routes API Integration
 * For calculating routes and directions between destinations
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

export interface RouteLeg {
  distanceMeters: number;
  duration: string; // e.g., "15 mins"
  durationSeconds: number;
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
  steps?: Array<{
    distanceMeters: number;
    duration: string;
    instructions: string;
    polyline?: string;
  }>;
}

export interface Route {
  distanceMeters: number;
  duration: string;
  durationSeconds: number;
  legs: RouteLeg[];
  polyline?: string; // Encoded polyline for map display
}

/**
 * Calculate route between two points using Google Routes API
 */
export async function calculateRoute(
  origin: { lat: number; lng: number } | string,
  destination: { lat: number; lng: number } | string,
  mode: 'walking' | 'driving' | 'transit' | 'bicycling' = 'walking',
  waypoints?: Array<{ lat: number; lng: number } | string>
): Promise<Route | null> {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY not configured');
  }

  try {
    // Format origin
    const originStr = typeof origin === 'string' 
      ? origin 
      : `${origin.lat},${origin.lng}`;
    
    // Format destination
    const destinationStr = typeof destination === 'string'
      ? destination
      : `${destination.lat},${destination.lng}`;

    // Format waypoints if provided
    const waypointModifiers = waypoints?.map(wp => ({
      location: typeof wp === 'string' ? wp : `${wp.lat},${wp.lng}`,
    }));

    const requestBody: any = {
      origin: typeof origin === 'string' ? { address: origin } : {
        location: {
          latLng: {
            latitude: origin.lat,
            longitude: origin.lng,
          },
        },
      },
      destination: typeof destination === 'string' ? { address: destination } : {
        location: {
          latLng: {
            latitude: destination.lat,
            longitude: destination.lng,
          },
        },
      },
      travelMode: mode === 'walking' ? 'WALK' : mode === 'driving' ? 'DRIVE' : mode === 'transit' ? 'TRANSIT' : 'BICYCLE',
      computeAlternativeRoutes: false,
    };

    // Only add routingPreference for DRIVE mode
    if (mode === 'driving') {
      requestBody.routingPreference = 'TRAFFIC_AWARE';
    }

    if (waypointModifiers && waypointModifiers.length > 0) {
      requestBody.intermediates = waypointModifiers;
    }

    const response = await fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY!,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline,routes.legs',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Routes API error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    
    return {
      distanceMeters: route.distanceMeters || 0,
      duration: formatDuration(route.duration),
      durationSeconds: parseDuration(route.duration),
      legs: route.legs?.map((leg: any) => ({
        distanceMeters: leg.distanceMeters || 0,
        duration: formatDuration(leg.duration),
        durationSeconds: parseDuration(leg.duration),
        startLocation: leg.startLocation?.latLng || { lat: 0, lng: 0 },
        endLocation: leg.endLocation?.latLng || { lat: 0, lng: 0 },
      })) || [],
      polyline: route.polyline?.encodedPolyline,
    };
  } catch (error: any) {
    console.error(`Error calculating route:`, error.message);
    return null;
  }
}

/**
 * Format duration string (e.g., "600s" -> "10 mins")
 */
function formatDuration(duration: string): string {
  const seconds = parseDuration(duration);
  if (seconds < 60) {
    return `${seconds} secs`;
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)} mins`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
}

/**
 * Parse duration string to seconds
 */
function parseDuration(duration: string): number {
  // Duration format: "600s" or "10m" or "1h 30m"
  const match = duration.match(/(\d+)s/);
  if (match) {
    return parseInt(match[1], 10);
  }
  // Fallback: try to parse as seconds
  const seconds = parseInt(duration, 10);
  return isNaN(seconds) ? 0 : seconds;
}

/**
 * Calculate route from city center to a destination
 */
export async function calculateRouteFromCityCenter(
  destination: { lat: number; lng: number },
  cityCenter: { lat: number; lng: number },
  mode: 'walking' | 'driving' | 'transit' = 'walking'
): Promise<Route | null> {
  return calculateRoute(cityCenter, destination, mode);
}

