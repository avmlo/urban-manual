/**
 * ML Service Proxy - Demand Forecast
 *
 * Proxies requests to the Python ML microservice for demand forecasting.
 */

import { NextRequest, NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const destinationId = searchParams.get('destination_id');
    const periods = searchParams.get('periods') || '30';

    if (!destinationId) {
      return NextResponse.json(
        { error: 'destination_id is required' },
        { status: 400 }
      );
    }

    // Call ML service
    const mlResponse = await fetch(
      `${ML_SERVICE_URL}/api/forecast/demand/${destinationId}?periods=${periods}`,
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
          fallback: true
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
        error: 'Failed to fetch demand forecast',
        fallback: true
      },
      { status: 500 }
    );
  }
}
