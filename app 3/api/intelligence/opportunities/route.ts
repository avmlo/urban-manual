import { NextRequest, NextResponse } from 'next/server';
import { opportunityDetectionService } from '@/services/intelligence/opportunity-detection';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city') || undefined;
    const limit = parseInt(searchParams.get('limit') || '10');

    if (user) {
      // Get user-specific opportunities
      const opportunities = await opportunityDetectionService.detectOpportunities(
        user.id,
        city,
        limit
      );
      return NextResponse.json({ opportunities, count: opportunities.length });
    } else {
      // Get general opportunities
      const opportunities = await opportunityDetectionService.detectOpportunities(
        undefined,
        city,
        limit
      );
      return NextResponse.json({ opportunities, count: opportunities.length });
    }
  } catch (error: any) {
    console.error('Error getting opportunities:', error);
    return NextResponse.json(
      { error: 'Failed to get opportunities', details: error.message },
      { status: 500 }
    );
  }
}

