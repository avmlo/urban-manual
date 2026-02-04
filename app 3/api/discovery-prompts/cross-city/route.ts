import { NextRequest, NextResponse } from 'next/server';
import { generateCrossCityCorrelations } from '@/lib/discovery-prompts-generative';

/**
 * GET /api/discovery-prompts/cross-city
 * 
 * Query parameters:
 * - city: string (required) - Current city being browsed
 * - user_id: string (required) - User ID for correlation analysis
 * 
 * Returns cross-city correlation prompts
 * Example: "Loved cherry blossoms in Tokyo? Try jacaranda season in Lisbon this May."
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get('city');
    const userId = searchParams.get('user_id');

    if (!city) {
      return NextResponse.json(
        { error: 'City parameter is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id parameter is required' },
        { status: 400 }
      );
    }

    const correlations = await generateCrossCityCorrelations(userId, city.toLowerCase());

    return NextResponse.json({
      city,
      correlations,
      count: correlations.length,
    });
  } catch (error: any) {
    console.error('Error fetching cross-city correlations:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch cross-city correlations',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

