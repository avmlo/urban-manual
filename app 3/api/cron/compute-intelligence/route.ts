import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  // Verify cron secret (optional - Vercel cron jobs automatically include a header)
  // You can use CRON_SECRET for additional security or rely on Vercel's built-in security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // Vercel automatically sends a cron secret in the 'x-vercel-cron' header
  // For additional security, you can also check a custom CRON_SECRET
  const vercelCronSecret = request.headers.get('x-vercel-cron');
  
  // If CRON_SECRET is set, require it OR Vercel's built-in cron header
  if (cronSecret) {
    const hasValidSecret = authHeader === `Bearer ${cronSecret}`;
    const hasVercelCron = vercelCronSecret === '1';
    
    if (!hasValidSecret && !hasVercelCron) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    // If no CRON_SECRET is set, rely on Vercel's built-in cron security
    // Vercel cron jobs will include x-vercel-cron: 1 header
    if (vercelCronSecret !== '1') {
      return NextResponse.json({ error: 'Unauthorized - must be called by Vercel cron' }, { status: 401 });
    }
  }

  const supabase = createServiceRoleClient();
  
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase service role client not available' },
      { status: 500 }
    );
  }

  const tasks: Array<{ task: string; status: string; error?: string }> = [];

  try {
    // Daily: Compute rankings
    const rankResult = await supabase.rpc('compute_rank_scores');
    tasks.push({
      task: 'Rankings computed',
      status: rankResult.error ? 'failed' : 'success',
      error: rankResult.error?.message,
    });

    // Daily: Compute trending
    const trendingResult = await supabase.rpc('compute_trending_scores');
    tasks.push({
      task: 'Trending computed',
      status: trendingResult.error ? 'failed' : 'success',
      error: trendingResult.error?.message,
    });

    // Weekly: Co-visitation (only on Mondays)
    const isMonday = new Date().getDay() === 1;
    if (isMonday) {
      const coVisitResult = await supabase.rpc('compute_co_visitation');
      tasks.push({
        task: 'Co-visitation computed',
        status: coVisitResult.error ? 'failed' : 'success',
        error: coVisitResult.error?.message,
      });

      const relationshipsResult = await supabase.rpc('compute_destination_relationships');
      tasks.push({
        task: 'Relationships computed',
        status: relationshipsResult.error ? 'failed' : 'success',
        error: relationshipsResult.error?.message,
      });
    }

    return NextResponse.json({
      success: true,
      tasks,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        tasks,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

