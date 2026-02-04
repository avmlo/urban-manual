import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase-server';
import { withErrorHandling, createUnauthorizedError, createValidationError, handleSupabaseError } from '@/lib/errors';

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
  const { privacy_mode, allow_tracking, email_notifications } = body;

  const updateData: Record<string, boolean> = {};

  if (privacy_mode !== undefined) {
    if (typeof privacy_mode !== 'boolean') {
      throw createValidationError('privacy_mode must be a boolean');
    }
    updateData.privacy_mode = privacy_mode;
  }

  if (allow_tracking !== undefined) {
    if (typeof allow_tracking !== 'boolean') {
      throw createValidationError('allow_tracking must be a boolean');
    }
    updateData.allow_tracking = allow_tracking;
  }

  if (email_notifications !== undefined) {
    if (typeof email_notifications !== 'boolean') {
      throw createValidationError('email_notifications must be a boolean');
    }
    updateData.email_notifications = email_notifications;
  }

  if (Object.keys(updateData).length === 0) {
    throw createValidationError('No privacy preferences provided');
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: user.id,
      ...updateData,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    })
    .select('privacy_mode, allow_tracking, email_notifications')
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  const serviceClient = createServiceRoleClient();
  await serviceClient.from('account_privacy_audit').insert({
    user_id: user.id,
    action: 'update_privacy_settings',
    metadata: {
      ...updateData,
      user_agent: request.headers.get('user-agent') || 'unknown',
    },
  });

  return NextResponse.json({
    success: true,
    preferences: data,
  });
});
