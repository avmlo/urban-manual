/**
 * Eventbrite API Integration
 * Fetch nearby events for destinations
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const EVENTBRITE_TOKEN = process.env.EVENTBRITE_TOKEN;

export interface Event {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  url: string;
  venue?: {
    name: string;
    address?: string;
    lat?: number;
    lng?: number;
  };
  category?: string;
  imageUrl?: string;
}

/**
 * Fetch nearby events using Eventbrite API
 */
export async function fetchNearbyEvents(
  latitude: number,
  longitude: number,
  radiusKm: number = 5,
  limit: number = 10
): Promise<Event[]> {
  if (!EVENTBRITE_TOKEN) {
    console.warn('EVENTBRITE_TOKEN not configured, skipping event fetch');
    return [];
  }

  try {
    const response = await fetch(
      `https://www.eventbriteapi.com/v3/events/search/?` +
      `location.latitude=${latitude}&` +
      `location.longitude=${longitude}&` +
      `location.within=${radiusKm}km&` +
      `expand=venue&` +
      `status=live&` +
      `order_by=start_asc&` +
      `page_size=${limit}&` +
      `token=${EVENTBRITE_TOKEN}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Eventbrite API error: ${response.status} - ${errorText}`);
      return [];
    }

    const data = await response.json();

    if (!data.events || data.events.length === 0) {
      return [];
    }

    return data.events.map((event: any) => ({
      id: event.id,
      name: event.name?.text || 'Untitled Event',
      description: event.description?.text,
      startDate: event.start?.utc || event.start?.local,
      endDate: event.end?.utc || event.end?.local,
      url: event.url || `https://www.eventbrite.com/e/${event.id}`,
      venue: event.venue ? {
        name: event.venue.name || 'Unknown Venue',
        address: event.venue.address?.localized_area_display || undefined,
        lat: event.venue.latitude ? parseFloat(event.venue.latitude) : undefined,
        lng: event.venue.longitude ? parseFloat(event.venue.longitude) : undefined,
      } : undefined,
      category: event.category_id ? getCategoryName(event.category_id) : undefined,
      imageUrl: event.logo?.url,
    }));
  } catch (error: any) {
    console.error(`Error fetching events:`, error.message);
    return [];
  }
}

/**
 * Get category name from Eventbrite category ID
 */
function getCategoryName(categoryId: string): string {
  const categories: Record<string, string> = {
    '103': 'Music',
    '104': 'Business',
    '105': 'Food & Drink',
    '106': 'Community',
    '107': 'Arts',
    '108': 'Sports & Fitness',
    '109': 'Health',
    '110': 'Science & Tech',
    '111': 'Travel & Outdoor',
    '112': 'Charity & Causes',
    '113': 'Film & Media',
    '114': 'Fashion',
    '115': 'Home & Lifestyle',
    '116': 'Hobbies',
    '117': 'Religion',
    '118': 'Family & Education',
    '119': 'Holiday',
    '120': 'Government',
    '121': 'Spirituality',
    '122': 'School Activities',
    '123': 'Auto & Boat',
    '124': 'Other',
  };
  return categories[categoryId] || 'Other';
}

