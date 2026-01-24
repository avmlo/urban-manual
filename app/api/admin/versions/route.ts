import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/versions?destination_id=123
 * Fetches version history for a destination
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const destinationId = searchParams.get('destination_id');

    if (!destinationId) {
      return NextResponse.json({ error: 'destination_id is required' }, { status: 400 });
    }

    // Fetch versions
    const { data: versions, error } = await supabase
      .from('destination_versions')
      .select('*')
      .eq('destination_id', parseInt(destinationId))
      .order('version_number', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(versions || []);
  } catch (error: unknown) {
    console.error('Error fetching versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/versions/restore
 * Restores a destination to a specific version
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { destination_id, version_number } = body;

    if (!destination_id || !version_number) {
      return NextResponse.json(
        { error: 'destination_id and version_number are required' },
        { status: 400 }
      );
    }

    // Call the restore function
    const { data, error } = await supabase.rpc('restore_destination_version', {
      p_destination_id: destination_id,
      p_version_number: version_number,
    });

    if (error) {
      throw error;
    }

    // Fetch updated destination
    const { data: destination, error: fetchError } = await supabase
      .from('destinations')
      .select('*')
      .eq('id', destination_id)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    return NextResponse.json({
      success: true,
      destination,
      message: `Restored to version ${version_number}`,
    });
  } catch (error: unknown) {
    console.error('Error restoring version:', error);
    return NextResponse.json(
      { error: 'Failed to restore version', details: String(error) },
      { status: 500 }
    );
  }
}
