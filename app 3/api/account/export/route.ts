import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase-server';
import { withErrorHandling, createUnauthorizedError, handleSupabaseError } from '@/lib/errors';

const PENDING_STATUSES = ['pending', 'in_progress'];

export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  const createNew = request.nextUrl.searchParams.get('create') === 'true';
  const serviceClient = createServiceRoleClient();
  let createdRequest = null;

  if (createNew) {
    const { data: pendingRequest, error: pendingError } = await serviceClient
      .from('account_data_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('request_type', 'export')
      .in('status', PENDING_STATUSES)
      .maybeSingle();

    if (pendingError && pendingError.code !== 'PGRST116') {
      throw handleSupabaseError(pendingError);
    }

    if (!pendingRequest) {
      const { data: inserted, error: insertError } = await serviceClient
        .from('account_data_requests')
        .insert({
          user_id: user.id,
          request_type: 'export',
          status: 'pending',
          payload: {
            requested_via: 'account_settings',
          },
        })
        .select()
        .single();

      if (insertError) {
        throw handleSupabaseError(insertError);
      }

      createdRequest = inserted;

      await serviceClient.from('account_privacy_audit').insert({
        user_id: user.id,
        action: 'request_export',
        metadata: {
          request_id: inserted.id,
          user_agent: request.headers.get('user-agent') || 'unknown',
        },
      });
    }
  }

  const { data: requests, error } = await supabase
    .from('account_data_requests')
    .select('*')
    .eq('user_id', user.id)
    .eq('request_type', 'export')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    throw handleSupabaseError(error);
  }

  return NextResponse.json({
    success: true,
    requests: requests || [],
    created: Boolean(createdRequest),
  });
});
