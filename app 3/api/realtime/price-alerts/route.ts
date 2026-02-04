import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

/**
 * API endpoint for price alerts
 * POST /api/realtime/price-alerts
 * 
 * Create or update price alerts for destinations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, destination_id, alert_type, threshold_value } = body;

    if (!user_id || !destination_id || !alert_type) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, destination_id, alert_type' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Check if alert already exists
    const { data: existing } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('user_id', user_id)
      .eq('destination_id', destination_id)
      .eq('alert_type', alert_type)
      .eq('is_active', true)
      .single();

    if (existing) {
      // Update existing alert
      const { error: updateError } = await supabase
        .from('price_alerts')
        .update({
          threshold_value,
          is_active: true,
        })
        .eq('id', existing.id);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update alert', details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: 'updated',
        alert_id: existing.id,
      });
    } else {
      // Create new alert
      const { data: newAlert, error: insertError } = await supabase
        .from('price_alerts')
        .insert({
          user_id,
          destination_id,
          alert_type,
          threshold_value,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json(
          { error: 'Failed to create alert', details: insertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: 'created',
        alert_id: newAlert.id,
      });
    }
  } catch (error: any) {
    console.error('Error in price alerts API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/realtime/price-alerts?user_id=xxx
 * Get active price alerts for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    const { data: alerts, error } = await supabase
      .from('price_alerts')
      .select('*, destinations(id, name, slug, city)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch alerts', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      alerts: alerts || [],
      count: alerts?.length || 0,
    });
  } catch (error: any) {
    console.error('Error in price alerts GET:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/realtime/price-alerts?alert_id=xxx
 * Deactivate a price alert
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('alert_id');

    if (!alertId) {
      return NextResponse.json(
        { error: 'alert_id is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from('price_alerts')
      .update({ is_active: false })
      .eq('id', alertId);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to deactivate alert', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Alert deactivated',
    });
  } catch (error: any) {
    console.error('Error in price alerts DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

