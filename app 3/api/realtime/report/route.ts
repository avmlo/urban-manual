import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

/**
 * API endpoint to submit user-reported real-time data
 * POST /api/realtime/report
 * 
 * Body:
 * {
 *   destination_id: number;
 *   report_type: 'wait_time' | 'closed' | 'special_offer';
 *   report_data: {
 *     wait_time?: number; // minutes
 *     message?: string;
 *   };
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { destination_id, report_type, report_data } = body;

    // Get user ID from auth header if available
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      // Extract user ID from JWT token if needed
      // For now, we'll allow anonymous reports but prefer authenticated
      try {
        const supabase = createServiceRoleClient();
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        userId = user?.id || null;
      } catch (e) {
        // Continue without user ID for anonymous reports
      }
    }

    if (!destination_id || !report_type || !report_data) {
      return NextResponse.json(
        { error: 'Missing required fields: destination_id, report_type, report_data' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Calculate expiration (reports expire after 4 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 4);

    // Insert user report
    const { data: report, error: reportError } = await supabase
      .from('user_reports')
      .insert({
        user_id: userId,
        destination_id,
        report_type,
        report_data,
        verified: false, // User reports need verification
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (reportError) {
      console.error('Error creating user report:', reportError);
      return NextResponse.json(
        { error: 'Failed to create report', details: reportError.message },
        { status: 500 }
      );
    }

    // If report type is wait_time, update destination_status
    if (report_type === 'wait_time' && report_data.wait_time !== undefined) {
      await supabase
        .from('destination_status')
        .insert({
          destination_id,
          status_type: 'wait_time',
          status_value: {
            current: report_data.wait_time,
            trend: 'stable', // Default, can be enhanced later
          },
          data_source: 'user_reported',
          confidence_score: 0.7,
          expires_at: expiresAt.toISOString(),
        });
    }

    return NextResponse.json({
      success: true,
      report_id: report.id,
      message: 'Report submitted successfully',
    });
  } catch (error: any) {
    console.error('Error in realtime report API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/realtime/report?destination_id=123
 * Get recent user reports for a destination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const destinationId = parseInt(searchParams.get('destination_id') || '0');

    if (!destinationId || destinationId <= 0) {
      return NextResponse.json(
        { error: 'destination_id is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Get verified reports from last 4 hours
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

    const { data: reports, error } = await supabase
      .from('user_reports')
      .select('*')
      .eq('destination_id', destinationId)
      .eq('verified', true)
      .gte('created_at', fourHoursAgo)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching reports:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reports', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reports: reports || [],
      count: reports?.length || 0,
    });
  } catch (error: any) {
    console.error('Error in realtime report GET:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

