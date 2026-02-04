import { NextRequest, NextResponse } from 'next/server';
import { forecastingService } from '@/services/intelligence/forecasting';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const destinationId = searchParams.get('destination_id');
    const days = parseInt(searchParams.get('days') || '30');
    const metric = searchParams.get('metric') as 'demand' | 'price' | null;

    if (!city && !destinationId) {
      return NextResponse.json(
        { error: 'city or destination_id is required' },
        { status: 400 }
      );
    }

    let forecast;

    if (metric === 'price' && destinationId) {
      forecast = await forecastingService.forecastPrice(destinationId, days);
    } else {
      forecast = await forecastingService.forecastDemand(city || undefined, destinationId || undefined, days);
    }

    if (!forecast) {
      return NextResponse.json(
        { error: 'Forecast not available. Insufficient historical data.' },
        { status: 404 }
      );
    }

    return NextResponse.json(forecast);
  } catch (error: any) {
    console.error('Error getting forecast:', error);
    return NextResponse.json(
      { error: 'Failed to get forecast', details: error.message },
      { status: 500 }
    );
  }
}

