import { NextRequest, NextResponse } from 'next/server';
import { neighborhoodsDistrictsService } from '@/services/intelligence/neighborhoods-districts';

/**
 * GET /api/intelligence/districts/:city
 * Get districts for a city
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ city: string }> }
) {
  try {
    const resolvedParams = await params;
    const city = decodeURIComponent(resolvedParams.city);

    const districts = await neighborhoodsDistrictsService.getDistrictsByCity(city);

    return NextResponse.json({
      districts,
      count: districts.length,
    });
  } catch (error: any) {
    console.error('Error getting districts:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

