import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ user_id: string }> }
) {
  try {
    const { user_id } = await context.params;
    const supabase = await createServerClient();

    const { data: alerts, error } = await supabase
      .from('opportunity_alerts')
      .select(`
        *,
        destinations (
          id, slug, name, city, image
        )
      `)
      .eq('user_id', user_id)
      .eq('read', false)
      .order('triggered_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return NextResponse.json({
      alerts: (alerts || []).map((a: any) => ({
        id: a.id,
        type: a.alert_type,
        severity: a.severity,
        destination: a.destinations,
        message: a.message,
        triggered_at: a.triggered_at,
      })),
    });
  } catch (e: any) {
    console.error('Alerts error:', e);
    return NextResponse.json(
      { error: 'Failed to load alerts', details: e.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ user_id: string }> }
) {
  try {
    const { user_id } = await context.params;
    const { alertId } = await request.json();
    const supabase = await createServerClient();

    const { error } = await supabase
      .from('opportunity_alerts')
      .update({ read: true })
      .eq('id', alertId)
      .eq('user_id', user_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Mark alert read error:', e);
    return NextResponse.json(
      { error: 'Failed to update alert', details: e.message },
      { status: 500 }
    );
  }
}


