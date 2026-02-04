import { NextRequest, NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * POST /api/graph/optimize-itinerary
 * Optimize a multi-day itinerary using graph and geographic data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { destination_ids, max_days = 3 } = body;

    if (!destination_ids || !Array.isArray(destination_ids) || destination_ids.length === 0) {
      return NextResponse.json(
        { error: 'destination_ids array is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${ML_SERVICE_URL}/api/graph/optimize-itinerary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination_ids,
        max_days,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'ML service error' }));
      return NextResponse.json(
        { error: error.detail || 'Failed to optimize itinerary' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in graph optimize-itinerary:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

