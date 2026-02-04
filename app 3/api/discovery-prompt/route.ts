import { NextRequest, NextResponse } from 'next/server';
import { generateDiscoveryPrompt } from '@/services/gemini';
import { getSeasonalContext } from '@/services/seasonality';

/**
 * GET /api/discovery-prompt
 * 
 * Query parameters:
 * - city: string (required) - City name
 * - category: string (optional) - Category filter
 * 
 * Returns a dynamic discovery prompt for the city
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get('city');
    const category = searchParams.get('category') || undefined;

    if (!city) {
      return NextResponse.json(
        { error: 'City parameter is required' },
        { status: 400 }
      );
    }

    // Get seasonal context
    const seasonality = getSeasonalContext(city);

    // Generate discovery prompt
    const prompt = await generateDiscoveryPrompt(city, category, seasonality || undefined);

    return NextResponse.json({
      city,
      category,
      prompt,
      seasonality: seasonality ? {
        text: seasonality.text,
        event: seasonality.event,
        start: seasonality.start.toISOString(),
        end: seasonality.end.toISOString(),
      } : null,
    });
  } catch (error: any) {
    console.error('Error generating discovery prompt:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate discovery prompt',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

