/**
 * API Route: Get City-Level Google Trends
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchCityTrends } from '@/lib/google-trends';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');

    if (!city) {
      return NextResponse.json(
        { error: 'City parameter is required' },
        { status: 400 }
      );
    }

    const trends = await fetchCityTrends(city);

    return NextResponse.json({
      city,
      ...trends,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching city trends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch city trends', details: error.message },
      { status: 500 }
    );
  }
}

