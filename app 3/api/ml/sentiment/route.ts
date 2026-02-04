/**
 * ML Service Proxy - Sentiment Analysis
 *
 * Proxies requests to the Python ML microservice for sentiment analysis.
 */

import { NextRequest, NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const mlResponse = await fetch(`${ML_SERVICE_URL}/api/sentiment/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    if (!mlResponse.ok) {
      console.error('ML sentiment service error:', mlResponse.statusText);
      return NextResponse.json(
        {
          error: 'ML sentiment service unavailable',
          fallback: true,
          results: []
        },
        { status: 503 }
      );
    }

    const data = await mlResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('ML sentiment error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze sentiment',
        fallback: true,
        results: []
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const destinationId = searchParams.get('destination_id');
    const days = searchParams.get('days') || '30';

    if (!destinationId) {
      return NextResponse.json(
        { error: 'destination_id is required' },
        { status: 400 }
      );
    }

    const mlResponse = await fetch(
      `${ML_SERVICE_URL}/api/sentiment/destination/${destinationId}?days=${days}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!mlResponse.ok) {
      console.error('ML sentiment service error:', mlResponse.statusText);
      return NextResponse.json(
        {
          error: 'ML sentiment service unavailable',
          fallback: true
        },
        { status: 503 }
      );
    }

    const data = await mlResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('ML sentiment error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch destination sentiment',
        fallback: true
      },
      { status: 500 }
    );
  }
}

