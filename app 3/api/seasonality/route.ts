import { NextRequest, NextResponse } from 'next/server';
import { getSeasonalContext, getAllSeasonalEvents } from '@/services/seasonality';

/**
 * GET /api/seasonality
 * 
 * Query parameters:
 * - city: string (required) - City name
 * - date: string (optional) - Date to check (YYYY-MM-DD), defaults to today
 * 
 * Returns seasonal context for a city
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get('city');
    const dateParam = searchParams.get('date');

    if (!city) {
      return NextResponse.json(
        { error: 'City parameter is required' },
        { status: 400 }
      );
    }

    const date = dateParam ? new Date(dateParam) : new Date();
    const context = getSeasonalContext(city, date);

    if (!context) {
      // Return all events for the city if no active context
      const allEvents = getAllSeasonalEvents(city);
      return NextResponse.json({
        city,
        hasActiveEvent: false,
        events: allEvents.map(e => ({
          event: e.event,
          description: e.description,
          start: e.start.toISOString(),
          end: e.end.toISOString(),
          priority: e.priority,
        })),
      });
    }

    return NextResponse.json({
      city,
      hasActiveEvent: true,
      context: {
        text: context.text,
        event: context.event,
        start: context.start.toISOString(),
        end: context.end.toISOString(),
      },
      events: getAllSeasonalEvents(city).map(e => ({
        event: e.event,
        description: e.description,
        start: e.start.toISOString(),
        end: e.end.toISOString(),
        priority: e.priority,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching seasonality:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch seasonality data',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

