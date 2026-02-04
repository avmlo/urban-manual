/**
 * ML Service Proxy - Topic Modeling
 *
 * Proxies requests to the Python ML microservice for topic modeling.
 */

import { NextRequest, NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const mlResponse = await fetch(`${ML_SERVICE_URL}/api/topics/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    if (!mlResponse.ok) {
      console.error('ML topics service error:', mlResponse.statusText);
      return NextResponse.json(
        {
          error: 'ML topics service unavailable',
          fallback: true,
          topics: []
        },
        { status: 503 }
      );
    }

    const data = await mlResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('ML topics error:', error);
    return NextResponse.json(
      {
        error: 'Failed to extract topics',
        fallback: true,
        topics: []
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get('city');
    const destinationId = searchParams.get('destination_id');
    const minTopicSize = searchParams.get('min_topic_size') || '5';

    if (city) {
      const mlResponse = await fetch(
        `${ML_SERVICE_URL}/api/topics/city/${encodeURIComponent(city)}?min_topic_size=${minTopicSize}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!mlResponse.ok) {
        console.error('ML topics service error:', mlResponse.statusText);
        return NextResponse.json(
          {
            error: 'ML topics service unavailable',
            fallback: true,
            topics: []
          },
          { status: 503 }
        );
      }

      const data = await mlResponse.json();
      return NextResponse.json(data);
    }

    if (destinationId) {
      const mlResponse = await fetch(
        `${ML_SERVICE_URL}/api/topics/destination/${destinationId}?min_topic_size=${minTopicSize}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!mlResponse.ok) {
        console.error('ML topics service error:', mlResponse.statusText);
        return NextResponse.json(
          {
            error: 'ML topics service unavailable',
            fallback: true,
            topics: []
          },
          { status: 503 }
        );
      }

      const data = await mlResponse.json();
      return NextResponse.json(data);
    }

    return NextResponse.json(
      { error: 'city or destination_id is required' },
      { status: 400 }
    );

  } catch (error) {
    console.error('ML topics error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch topics',
        fallback: true,
        topics: []
      },
      { status: 500 }
    );
  }
}

