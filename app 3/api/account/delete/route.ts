import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase-server';
import { withErrorHandling, createUnauthorizedError, handleSupabaseError } from '@/lib/errors';

const PENDING_STATUSES = ['pending', 'in_progress'];

export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : null;

  const serviceClient = createServiceRoleClient();

  // Prevent duplicate pending requests
  const { data: existingRequest, error: existingError } = await serviceClient
    .from('account_data_requests')
    .select('*')
    .eq('user_id', user.id)
    .eq('request_type', 'deletion')
    .in('status', PENDING_STATUSES)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') {
    throw handleSupabaseError(existingError);
  }

  if (existingRequest) {
    return NextResponse.json({
      success: true,
      request: existingRequest,
      message: 'A deletion request is already being processed.',
    });
  }

  const { data: newRequest, error: insertError } = await serviceClient
    .from('account_data_requests')
    .insert({
      user_id: user.id,
      request_type: 'deletion',
      status: 'pending',
      payload: reason ? { reason } : null,
    })
    .select()
    .single();

  if (insertError) {
    throw handleSupabaseError(insertError);
  }

  await serviceClient.from('account_privacy_audit').insert({
    user_id: user.id,
    action: 'request_deletion',
    metadata: {
      reason,
      request_id: newRequest.id,
      user_agent: request.headers.get('user-agent') || 'unknown',
    },
  });

  return NextResponse.json({
    success: true,
    request: newRequest,
    message: 'Account deletion request queued. You will receive an email once complete.',
  });
});
