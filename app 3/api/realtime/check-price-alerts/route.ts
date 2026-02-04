import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

/**
 * API endpoint to check and trigger price alerts
 * POST /api/realtime/check-price-alerts
 * 
 * This should be called by a cron job or background worker
 * Checks all active price alerts and triggers notifications if thresholds are met
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();

    // Get all active price alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('is_active', true);

    if (alertsError) {
      return NextResponse.json(
        { error: 'Failed to fetch alerts', details: alertsError.message },
        { status: 500 }
      );
    }

    if (!alerts || alerts.length === 0) {
      return NextResponse.json({
        triggered: 0,
        checked: 0,
        message: 'No active alerts to check',
      });
    }

    const triggeredAlerts: any[] = [];
    const now = new Date();

    // Check each alert
    for (const alert of alerts) {
      try {
        // Get current destination data
        const { data: destination } = await supabase
          .from('destinations')
          .select('price_level, rating, michelin_stars')
          .eq('id', alert.destination_id)
          .single();

        if (!destination) continue;

        let shouldTrigger = false;
        const threshold = alert.threshold_value || {};

        // Check price drop alerts
        if (alert.alert_type === 'price_drop' && threshold.max_price) {
          const currentPrice = destination.price_level || 0;
          if (currentPrice > 0 && currentPrice <= threshold.max_price) {
            shouldTrigger = true;
          }
        }

        // Check availability alerts
        if (alert.alert_type === 'availability' && threshold.available === true) {
          // Check if destination has recent bookings or availability
          // This would need integration with booking APIs
          // For now, we'll skip this check
        }

        // Check rating alerts
        if (alert.alert_type === 'rating_improved' && threshold.min_rating) {
          const currentRating = destination.rating || 0;
          if (currentRating >= threshold.min_rating) {
            shouldTrigger = true;
          }
        }

        if (shouldTrigger) {
          // Update alert with trigger time
          await supabase
            .from('price_alerts')
            .update({ last_triggered_at: now.toISOString() })
            .eq('id', alert.id);

          triggeredAlerts.push({
            alert_id: alert.id,
            user_id: alert.user_id,
            destination_id: alert.destination_id,
            alert_type: alert.alert_type,
          });
        }
      } catch (err) {
        console.error(`Error checking alert ${alert.id}:`, err);
      }
    }

    return NextResponse.json({
      triggered: triggeredAlerts.length,
      checked: alerts.length,
      alerts: triggeredAlerts,
    });
  } catch (error: any) {
    console.error('Error in check price alerts:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

