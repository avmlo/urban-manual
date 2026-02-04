import { NextRequest, NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * POST /api/graph/complete-day
 * Suggest a complete day itinerary starting from a place
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { starting_place_id, categories, max_places = 5 } = body;

    if (!starting_place_id) {
      return NextResponse.json(
        { error: 'starting_place_id is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${ML_SERVICE_URL}/api/graph/complete-day`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        starting_place_id,
        categories,
        max_places,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'ML service error' }));
      return NextResponse.json(
        { error: error.detail || 'Failed to generate complete day' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in graph complete-day:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

