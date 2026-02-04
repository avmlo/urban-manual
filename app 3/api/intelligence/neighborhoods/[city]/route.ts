import { NextRequest, NextResponse } from 'next/server';
import { neighborhoodsDistrictsService } from '@/services/intelligence/neighborhoods-districts';

/**
 * GET /api/intelligence/neighborhoods/:city
 * Get neighborhoods for a city
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ city: string }> }
) {
  try {
    const resolvedParams = await params;
    const city = decodeURIComponent(resolvedParams.city);

    const neighborhoods = await neighborhoodsDistrictsService.getNeighborhoodsByCity(city);

    return NextResponse.json({
      neighborhoods,
      count: neighborhoods.length,
    });
  } catch (error: any) {
    console.error('Error getting neighborhoods:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

