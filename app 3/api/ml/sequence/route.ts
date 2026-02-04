/**
 * ML Service Proxy - Sequence Models
 *
 * Proxies requests to the Python ML microservice for sequence prediction.
 */

import { NextRequest, NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { current_sequence, top_n = 3 } = body;

    if (!current_sequence || !Array.isArray(current_sequence)) {
      return NextResponse.json(
        { error: 'current_sequence array is required' },
        { status: 400 }
      );
    }

    const mlResponse = await fetch(
      `${ML_SERVICE_URL}/api/sequence/predict-next?top_n=${top_n}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ current_sequence }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!mlResponse.ok) {
      console.error('ML sequence service error:', mlResponse.statusText);
      return NextResponse.json(
        {
          error: 'ML sequence service unavailable',
          fallback: true,
          predictions: []
        },
        { status: 503 }
      );
    }

    const data = await mlResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('ML sequence error:', error);
    return NextResponse.json(
      {
        error: 'Failed to predict next actions',
        fallback: true,
        predictions: []
      },
      { status: 500 }
    );
  }
}

