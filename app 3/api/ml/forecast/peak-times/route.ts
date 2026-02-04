/**
 * ML Service Proxy - Peak Times
 *
 * Proxies requests to the Python ML microservice for peak time analysis.
 */

import { NextRequest, NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const destinationId = searchParams.get('destination_id');
    const forecastDays = searchParams.get('forecast_days') || '30';

    if (!destinationId) {
      return NextResponse.json(
        { error: 'destination_id is required' },
        { status: 400 }
      );
    }

    // Call ML service
    const mlResponse = await fetch(
      `${ML_SERVICE_URL}/api/forecast/peak-times/${destinationId}?forecast_days=${forecastDays}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!mlResponse.ok) {
      console.error('ML peak times service error:', mlResponse.statusText);

      return NextResponse.json(
        {
          error: 'ML peak times service unavailable',
          fallback: true
        },
        { status: 503 }
      );
    }

    const data = await mlResponse.json();

    return NextResponse.json(data);

  } catch (error) {
    console.error('ML peak times error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch peak times',
        fallback: true
      },
      { status: 500 }
    );
  }
}
