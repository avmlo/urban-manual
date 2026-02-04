/**
 * Google Maps Static API Integration
 * Generate static map images for destinations
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

export interface StaticMapOptions {
  center: { lat: number; lng: number };
  zoom?: number;
  size?: string; // e.g., "800x400"
  maptype?: 'roadmap' | 'satellite' | 'terrain' | 'hybrid';
  markers?: Array<{
    lat: number;
    lng: number;
    label?: string;
    color?: string;
  }>;
  scale?: 1 | 2; // For retina displays
  format?: 'png' | 'jpg';
}

/**
 * Generate static map URL
 */
export function generateStaticMapUrl(options: StaticMapOptions): string {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY not configured');
  }

  const params = new URLSearchParams({
    center: `${options.center.lat},${options.center.lng}`,
    zoom: (options.zoom || 15).toString(),
    size: options.size || '800x400',
    maptype: options.maptype || 'roadmap',
    key: GOOGLE_API_KEY!,
  });

  if (options.scale) {
    params.set('scale', options.scale.toString());
  }

  if (options.format) {
    params.set('format', options.format);
  }

  // Add markers
  if (options.markers && options.markers.length > 0) {
    options.markers.forEach(marker => {
      let markerStr = `${marker.lat},${marker.lng}`;
      if (marker.label) {
        markerStr += `|label:${marker.label}`;
      }
      if (marker.color) {
        markerStr += `|color:${marker.color}`;
      }
      params.append('markers', markerStr);
    });
  }

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

/**
 * Generate static map for a destination
 */
export function generateDestinationMap(
  destination: { lat: number; lng: number; name?: string },
  options?: Partial<StaticMapOptions>
): string {
  return generateStaticMapUrl({
    center: destination,
    zoom: 16,
    size: '800x400',
    markers: [
      {
        lat: destination.lat,
        lng: destination.lng,
        label: destination.name?.[0] || 'D',
        color: '0x4285F4', // Google blue
      },
    ],
    ...options,
  });
}

