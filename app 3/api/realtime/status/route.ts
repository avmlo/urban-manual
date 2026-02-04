import { NextRequest, NextResponse } from 'next/server';
import { realtimeIntelligenceService } from '@/services/realtime/realtime-intelligence';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const destinationId = parseInt(searchParams.get('destination_id') || '0');
    const userId = searchParams.get('user_id') || undefined;

    if (!destinationId || destinationId <= 0) {
      return NextResponse.json(
        { error: 'destination_id is required' },
        { status: 400 }
      );
    }

    const status = await realtimeIntelligenceService.getRealtimeStatus(
      destinationId,
      userId
    );

    return NextResponse.json({ status });
  } catch (error: any) {
    console.error('Error fetching realtime status:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
