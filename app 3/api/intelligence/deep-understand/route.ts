import { NextRequest, NextResponse } from 'next/server';
import { deepIntentAnalysisService } from '@/services/intelligence/deep-intent-analysis';
import { createServerClient } from '@/lib/supabase-server';

/**
 * POST /api/intelligence/deep-understand
 * Enhanced intent analysis with multi-intent detection
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { query, conversationHistory = [], userId } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'query is required' },
        { status: 400 }
      );
    }

    const result = await deepIntentAnalysisService.analyzeMultiIntent(
      query,
      conversationHistory,
      userId || user?.id
    );

    return NextResponse.json({
      ...result,
      query,
    });
  } catch (error: any) {
    console.error('Error analyzing intent:', error);
    return NextResponse.json(
      { error: 'Failed to analyze intent', details: error.message },
      { status: 500 }
    );
  }
}

