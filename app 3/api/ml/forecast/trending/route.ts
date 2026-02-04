/**
 * ML Service Proxy - Trending Destinations
 *
 * Proxies requests to the Python ML microservice for trending destinations
 * based on demand forecasting.
 */

import { NextRequest, NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const topN = searchParams.get('top_n') || '20';
    const forecastDays = searchParams.get('forecast_days') || '7';

    // Call ML service
    const mlResponse = await fetch(
      `${ML_SERVICE_URL}/api/forecast/trending?top_n=${topN}&forecast_days=${forecastDays}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!mlResponse.ok) {
      console.error('ML forecast service error:', mlResponse.statusText);

      return NextResponse.json(
        {
          error: 'ML forecast service unavailable',
          fallback: true,
          trending: []
        },
        { status: 503 }
      );
    }

    const data = await mlResponse.json();

    return NextResponse.json(data);

  } catch (error) {
    console.error('ML forecast error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch trending destinations',
        fallback: true,
        trending: []
      },
      { status: 500 }
    );
  }
}
