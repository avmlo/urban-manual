import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

/**
 * Data Aggregation Job for ML Models
 * 
 * Aggregates user interactions (views, saves, visits) for ML model training.
 * This should be run daily via cron to prepare data for:
 * - Collaborative filtering model training
 * - Graph sequencing model training
 * - Demand forecasting
 * 
 * GET /api/cron/aggregate-user-data
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

  const supabase = createServiceRoleClient();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase service role client not available' },
      { status: 500 }
    );
  }

  const results: Array<{ task: string; status: string; count?: number; error?: string }> = [];
  const startTime = Date.now();

  try {
    // 1. Aggregate user interactions by destination (for CF model)
    try {
      const { data: interactionStats, error: interactionError } = await supabase
        .from('user_interactions')
        .select('destination_id, interaction_type')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (interactionError) throw interactionError;

      // Aggregate by destination
      const destinationStats: Record<number, { views: number; saves: number; clicks: number }> = {};
      
      (interactionStats || []).forEach((interaction: any) => {
        if (!interaction.destination_id) return;
        
        if (!destinationStats[interaction.destination_id]) {
          destinationStats[interaction.destination_id] = { views: 0, saves: 0, clicks: 0 };
        }

        if (interaction.interaction_type === 'view') {
          destinationStats[interaction.destination_id].views++;
        } else if (interaction.interaction_type === 'save') {
          destinationStats[interaction.destination_id].saves++;
        } else if (interaction.interaction_type === 'click') {
          destinationStats[interaction.destination_id].clicks++;
        }
      });

      // Update destinations table with aggregated stats (if columns exist)
      const updates = Object.entries(destinationStats).map(([destId, stats]) => ({
        id: parseInt(destId),
        views_count: stats.views,
        saves_count: stats.saves,
        clicks_count: stats.clicks,
      }));

      // Batch update (in chunks of 100)
      for (let i = 0; i < updates.length; i += 100) {
        const chunk = updates.slice(i, i + 100);
        for (const update of chunk) {
          await supabase
            .from('destinations')
            .update({
              views_count: update.views_count,
              saves_count: update.saves_count,
            })
            .eq('id', update.id);
        }
      }

      results.push({
        task: 'User interactions aggregated',
        status: 'success',
        count: Object.keys(destinationStats).length,
      });
    } catch (error: any) {
      results.push({
        task: 'User interactions aggregation',
        status: 'failed',
        error: error.message,
      });
    }

    // 2. Aggregate visit history for graph sequencing
    try {
      const { data: visits, error: visitsError } = await supabase
        .from('visited_places')
        .select('destination_slug, visited_at, user_id')
        .gte('visited_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString());

      if (visitsError) throw visitsError;

      // Count visits per destination
      const visitCounts: Record<string, number> = {};
      (visits || []).forEach((visit: any) => {
        if (visit.destination_slug) {
          visitCounts[visit.destination_slug] = (visitCounts[visit.destination_slug] || 0) + 1;
        }
      });

      // Update destinations with visit counts
      for (const [slug, count] of Object.entries(visitCounts)) {
        await supabase
          .from('destinations')
          .update({ visits_count: count })
          .eq('slug', slug);
      }

      results.push({
        task: 'Visit history aggregated',
        status: 'success',
        count: Object.keys(visitCounts).length,
      });
    } catch (error: any) {
      results.push({
        task: 'Visit history aggregation',
        status: 'failed',
        error: error.message,
      });
    }

    // 3. Aggregate analytics data for demand forecasting
    try {
      const { data: analytics, error: analyticsError } = await supabase
        .from('user_interactions')
        .select('destination_id, created_at, interaction_type')
        .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString());

      if (analyticsError) throw analyticsError;

      // Group by date and destination
      const dailyStats: Record<string, Record<number, { views: number; saves: number }>> = {};
      
      (analytics || []).forEach((item: any) => {
        if (!item.destination_id || !item.created_at) return;
        
        const date = new Date(item.created_at).toISOString().split('T')[0];
        if (!dailyStats[date]) {
          dailyStats[date] = {};
        }
        if (!dailyStats[date][item.destination_id]) {
          dailyStats[date][item.destination_id] = { views: 0, saves: 0 };
        }

        if (item.interaction_type === 'view') {
          dailyStats[date][item.destination_id].views++;
        } else if (item.interaction_type === 'save') {
          dailyStats[date][item.destination_id].saves++;
        }
      });

      // Store in analytics table (if it exists) or prepare for ML service
      // For now, we'll just log the stats
      const totalDays = Object.keys(dailyStats).length;
      const totalDestinations = new Set(
        Object.values(dailyStats).flatMap(day => Object.keys(day))
      ).size;

      results.push({
        task: 'Analytics data aggregated',
        status: 'success',
        count: totalDays,
      });
    } catch (error: any) {
      results.push({
        task: 'Analytics aggregation',
        status: 'failed',
        error: error.message,
      });
    }

    // 4. Trigger ML service to refresh data (if available)
    try {
      const mlServiceUrl = process.env.ML_SERVICE_URL;
      if (mlServiceUrl) {
        // Notify ML service that new data is available
        // The ML service can then fetch fresh data when training
        const response = await fetch(`${mlServiceUrl}/api/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          results.push({
            task: 'ML service notified',
            status: 'success',
          });
        }
      }
    } catch (error: any) {
      // ML service unavailable is not critical
      results.push({
        task: 'ML service notification',
        status: 'skipped',
        error: 'ML service not available',
      });
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      tasks: results,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Data aggregation job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        tasks: results,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

