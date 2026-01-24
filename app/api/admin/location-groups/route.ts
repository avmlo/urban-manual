import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import {
  createLocationGroup,
  setPrimaryLocation,
  removeFromLocationGroup,
} from '@/lib/supabase/location-groups';

/**
 * POST /api/admin/location-groups
 * Create a new location group from multiple destinations
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = createServerClient();

  // Check if user is admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { destinationIds, primaryLocationId } = body;

  if (!destinationIds || !Array.isArray(destinationIds) || destinationIds.length < 2) {
    throw createValidationError('Must provide at least 2 destination IDs');
  }

  if (!primaryLocationId || !destinationIds.includes(primaryLocationId)) {
    throw createValidationError('Primary location must be one of the destination IDs');
  }

  const groupId = await createLocationGroup(supabase, destinationIds, primaryLocationId);

  if (!groupId) {
    return NextResponse.json({ error: 'Failed to create location group' }, { status: 500 });
  }

  return NextResponse.json({ groupId, success: true });
});

/**
 * PUT /api/admin/location-groups
 * Update location group settings (e.g., change primary location)
 */
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const supabase = createServerClient();

  // Check if user is admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { groupId, newPrimaryId } = body;

  if (!groupId || !newPrimaryId) {
    throw createValidationError('groupId and newPrimaryId are required');
  }

  const success = await setPrimaryLocation(supabase, groupId, newPrimaryId);

  if (!success) {
    return NextResponse.json({ error: 'Failed to update primary location' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});

/**
 * DELETE /api/admin/location-groups
 * Remove a destination from its location group
 */
export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const supabase = createServerClient();

  // Check if user is admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const destinationId = searchParams.get('destinationId');

  if (!destinationId) {
    throw createValidationError('destinationId is required');
  }

  const success = await removeFromLocationGroup(supabase, parseInt(destinationId));

  if (!success) {
    return NextResponse.json(
      { error: 'Failed to remove from location group' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
});
