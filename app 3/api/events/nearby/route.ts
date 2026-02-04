/**
 * API Route: Get nearby events
 * GET /api/events/nearby?lat=...&lng=...&radius=...
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchNearbyEvents } from '@/lib/enrichment/events';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const radiusKm = parseFloat(searchParams.get('radius') || '5');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    const events = await fetchNearbyEvents(lat, lng, radiusKm, limit);

    return NextResponse.json({
      location: { lat, lng },
      radiusKm,
      events,
      count: events.length,
    });
  } catch (error: any) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

