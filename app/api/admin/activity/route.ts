import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/activity
 * Fetch activity logs with optional filters
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const searchParams = request.nextUrl.searchParams;

  // Check admin access
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = (user?.app_metadata as Record<string, unknown> | null)?.role === 'admin';

  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Parse query parameters
  const entityType = searchParams.get('entity_type');
  const entityId = searchParams.get('entity_id');
  const userId = searchParams.get('user_id');
  const action = searchParams.get('action');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    let query = supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (entityType) {
      query = query.eq('entity_type', entityType);
    }
    if (entityId) {
      query = query.eq('entity_id', entityId);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (action) {
      query = query.eq('action', action);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      logs: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 });
  }
}

/**
 * POST /api/admin/activity
 * Create a new activity log entry
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();

  // Check admin access
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = (user?.app_metadata as Record<string, unknown> | null)?.role === 'admin';

  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Extract IP and user agent
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
    const userAgent = request.headers.get('user-agent') || null;

    const logEntry = {
      user_id: user.id,
      user_email: user.email || 'unknown',
      action: body.action,
      entity_type: body.entity_type,
      entity_id: body.entity_id,
      entity_name: body.entity_name,
      changes: body.changes || null,
      metadata: body.metadata || null,
      ip_address: ip,
      user_agent: userAgent,
    };

    const { data, error } = await supabase
      .from('activity_logs')
      .insert([logEntry])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ log: data });
  } catch (error) {
    console.error('Error creating activity log:', error);
    return NextResponse.json({ error: 'Failed to create activity log' }, { status: 500 });
  }
}
