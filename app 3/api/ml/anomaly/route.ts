/**
 * ML Service Proxy - Anomaly Detection
 *
 * Proxies requests to the Python ML microservice for anomaly detection.
 */

import { NextRequest, NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const destinationId = searchParams.get('destination_id');
    const city = searchParams.get('city');
    const days = searchParams.get('days') || '30';
    const contamination = searchParams.get('contamination') || '0.1';
    const type = searchParams.get('type') || 'traffic'; // 'traffic' or 'sentiment'

    if (destinationId) {
      const endpoint = type === 'sentiment'
        ? `${ML_SERVICE_URL}/api/anomaly/destination/${destinationId}/sentiment?days=${days}`
        : `${ML_SERVICE_URL}/api/anomaly/destination/${destinationId}?days=${days}&contamination=${contamination}`;

      const mlResponse = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!mlResponse.ok) {
        console.error('ML anomaly service error:', mlResponse.statusText);
        return NextResponse.json(
          {
            error: 'ML anomaly service unavailable',
            fallback: true,
            anomalies: []
          },
          { status: 503 }
        );
      }

      const data = await mlResponse.json();
      return NextResponse.json(data);
    }

    if (city) {
      const mlResponse = await fetch(
        `${ML_SERVICE_URL}/api/anomaly/city/${encodeURIComponent(city)}?days=${days}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!mlResponse.ok) {
        console.error('ML anomaly service error:', mlResponse.statusText);
        return NextResponse.json(
          {
            error: 'ML anomaly service unavailable',
            fallback: true,
            anomalies: []
          },
          { status: 503 }
        );
      }

      const data = await mlResponse.json();
      return NextResponse.json(data);
    }

    return NextResponse.json(
      { error: 'destination_id or city is required' },
      { status: 400 }
    );

  } catch (error) {
    console.error('ML anomaly error:', error);
    return NextResponse.json(
      {
        error: 'Failed to detect anomalies',
        fallback: true,
        anomalies: []
      },
      { status: 500 }
    );
  }
}

