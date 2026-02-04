import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { multiDayTripPlanningService } from '@/services/intelligence/multi-day-planning';

/**
 * POST /api/intelligence/multi-day-plan
 * Generate optimized multi-day trip plan with route optimization
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const {
      city,
      startDate,
      endDate,
      preferences,
      userId: requestUserId,
    } = await request.json();

    if (!city || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: city, startDate, endDate' },
        { status: 400 }
      );
    }

    const plan = await multiDayTripPlanningService.generateMultiDayPlan(
      city,
      new Date(startDate),
      new Date(endDate),
      preferences,
      requestUserId || user?.id
    );

    if (!plan) {
      return NextResponse.json(
        { error: 'Failed to generate trip plan' },
        { status: 500 }
      );
    }

    return NextResponse.json(plan);
  } catch (error: any) {
    console.error('Error generating multi-day plan:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

