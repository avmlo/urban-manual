/**
 * API Route: Get weather for a location
 * GET /api/weather?lat=...&lng=...
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchWeather } from '@/lib/enrichment/weather';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    const weather = await fetchWeather(lat, lng);

    if (!weather) {
      return NextResponse.json(
        { error: 'Weather data not available' },
        { status: 404 }
      );
    }

    return NextResponse.json(weather);
  } catch (error: any) {
    console.error('Error fetching weather:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather' },
      { status: 500 }
    );
  }
}

