import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * ML Model Training Job
 * 
 * Triggers training of ML models (collaborative filtering, forecasting, graph sequencing).
 * This should be run weekly via cron.
 * 
 * GET /api/cron/train-ml-models
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const vercelCronSecret = request.headers.get('x-vercel-cron');

  if (cronSecret) {
    const hasValidSecret = authHeader === `Bearer ${cronSecret}`;
    const hasVercelCron = vercelCronSecret === '1';
    if (!hasValidSecret && !hasVercelCron) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    if (vercelCronSecret !== '1') {
      return NextResponse.json(
        { error: 'Unauthorized - must be called by Vercel cron' },
        { status: 401 }
      );
    }
  }

  const results: Array<{ model: string; status: string; error?: string }> = [];

  try {
    // 1. Train collaborative filtering model
    try {
      const response = await fetch(`${ML_SERVICE_URL}/api/recommendations/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ epochs: 50 }),
        signal: AbortSignal.timeout(300000), // 5 minute timeout
      });

      if (response.ok) {
        results.push({
          model: 'Collaborative Filtering',
          status: 'training_started',
        });
      } else {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        results.push({
          model: 'Collaborative Filtering',
          status: 'failed',
          error: error.detail || 'Training failed',
        });
      }
    } catch (error: any) {
      results.push({
        model: 'Collaborative Filtering',
        status: 'failed',
        error: error.message || 'ML service unavailable',
      });
    }

    // 2. Train graph sequencing model
    try {
      const response = await fetch(`${ML_SERVICE_URL}/api/graph/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ min_weight: 2, historical_days: 180 }),
        signal: AbortSignal.timeout(300000),
      });

      if (response.ok) {
        results.push({
          model: 'Graph Sequencing',
          status: 'training_started',
        });
      } else {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        results.push({
          model: 'Graph Sequencing',
          status: 'failed',
          error: error.detail || 'Training failed',
        });
      }
    } catch (error: any) {
      results.push({
        model: 'Graph Sequencing',
        status: 'failed',
        error: error.message || 'ML service unavailable',
      });
    }

    // 3. Train demand forecasting models
    try {
      const response = await fetch(`${ML_SERVICE_URL}/api/forecast/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ top_n: 200, historical_days: 180 }),
        signal: AbortSignal.timeout(600000), // 10 minute timeout
      });

      if (response.ok) {
        results.push({
          model: 'Demand Forecasting',
          status: 'training_started',
        });
      } else {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        results.push({
          model: 'Demand Forecasting',
          status: 'failed',
          error: error.detail || 'Training failed',
        });
      }
    } catch (error: any) {
      results.push({
        model: 'Demand Forecasting',
        status: 'failed',
        error: error.message || 'ML service unavailable',
      });
    }

    return NextResponse.json({
      success: true,
      models: results,
      timestamp: new Date().toISOString(),
      note: 'Model training runs in background. Check ML service status endpoints for progress.',
    });
  } catch (error: any) {
    console.error('ML training job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        models: results,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

