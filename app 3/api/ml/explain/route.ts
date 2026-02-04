/**
 * ML Service Proxy - Explainable AI
 *
 * Proxies requests to the Python ML microservice for model explanations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, destination_id, method = 'shap' } = body;

    if (!user_id || !destination_id) {
      return NextResponse.json(
        { error: 'user_id and destination_id are required' },
        { status: 400 }
      );
    }

    const mlResponse = await fetch(`${ML_SERVICE_URL}/api/explain/recommendation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id,
        destination_id,
        method
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!mlResponse.ok) {
      console.error('ML explain service error:', mlResponse.statusText);
      return NextResponse.json(
        {
          error: 'ML explain service unavailable',
          fallback: true
        },
        { status: 503 }
      );
    }

    const data = await mlResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('ML explain error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate explanation',
        fallback: true
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const destinationId = searchParams.get('destination_id');
    const forecastDate = searchParams.get('forecast_date');

    if (!destinationId || !forecastDate) {
      return NextResponse.json(
        { error: 'destination_id and forecast_date are required' },
        { status: 400 }
      );
    }

    const mlResponse = await fetch(
      `${ML_SERVICE_URL}/api/explain/forecast/${destinationId}?forecast_date=${encodeURIComponent(forecastDate)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!mlResponse.ok) {
      console.error('ML explain service error:', mlResponse.statusText);
      return NextResponse.json(
        {
          error: 'ML explain service unavailable',
          fallback: true
        },
        { status: 503 }
      );
    }

    const data = await mlResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('ML explain error:', error);
    return NextResponse.json(
      {
        error: 'Failed to explain forecast',
        fallback: true
      },
      { status: 500 }
    );
  }
}

