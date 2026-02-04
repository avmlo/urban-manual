import { NextRequest, NextResponse } from 'next/server';
import { getPerformanceMonitor } from '@/lib/discovery-engine/performance';
import { getDiscoveryEngineCache } from '@/lib/discovery-engine/cache';
import { getFeatureFlags, getABTestAssignment } from '@/lib/discovery-engine/feature-flags';
import { createServerClient } from '@/lib/supabase-server';

/**
 * GET /api/discovery/monitoring/status
 * Get overall Discovery Engine status and configuration
 */
export async function GET(request: NextRequest) {
  try {
    const flags = getFeatureFlags();
    const monitor = getPerformanceMonitor();
    const cache = getDiscoveryEngineCache();

    // Get user ID for A/B test assignment
    let userId: string | undefined;
    try {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    } catch (error) {
      // Not authenticated
    }

    const stats = monitor.getStats(60 * 60 * 1000); // Last hour
    const cacheStats = cache.getStats();
    const abTestAssignment = userId ? getABTestAssignment(userId) : {};

    return NextResponse.json({
      featureFlags: flags,
      performance: {
        lastHour: stats,
      },
      cache: cacheStats,
      abTestAssignment,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Status monitoring error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get status',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

