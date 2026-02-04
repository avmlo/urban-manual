import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'buffer';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { sendPrivacyEmail } from '@/lib/utils/privacy-email';

const EXPORT_BATCH_SIZE = 5;
const DELETION_BATCH_SIZE = 3;

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = createServiceRoleClient();
  const results: CronResults = {
    exports: [],
    deletions: [],
  };

  try {
    results.exports = await processExportRequests(serviceClient);
    results.deletions = await processDeletionRequests(serviceClient);

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error('[account-data-requests] Cron error', error);
    return NextResponse.json({ error: 'Cron execution failed' }, { status: 500 });
  }
}

function isAuthorized(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const vercelCronHeader = request.headers.get('x-vercel-cron');

  if (cronSecret) {
    if (authHeader === `Bearer ${cronSecret}`) {
      return true;
    }
  }

  return vercelCronHeader === '1';
}

async function processExportRequests(client: ReturnType<typeof createServiceRoleClient>) {
  const { data: pending } = await client
    .from('account_data_requests')
    .select('*')
    .eq('request_type', 'export')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(EXPORT_BATCH_SIZE);

  if (!pending?.length) return [];

  const processed: Array<{ id: string; status: string; error?: string }> = [];

  for (const request of pending) {
    try {
      await client
        .from('account_data_requests')
        .update({ status: 'in_progress' })
        .eq('id', request.id);

      const payload = await buildExportPayload(client, request.user_id);
      const base64 = Buffer.from(JSON.stringify(payload, null, 2)).toString('base64');
      const fileUrl = `data:application/json;base64,${base64}`;

      await client
        .from('account_data_requests')
        .update({
          status: 'complete',
          processed_at: new Date().toISOString(),
          file_url: fileUrl,
          result_payload: payload,
        })
        .eq('id', request.id);

      const email = await getUserEmail(client, request.user_id);
      if (email) {
        await sendPrivacyEmail({
          to: email,
          subject: 'Your Urban Manual data export is ready',
          html: `Your data export request from Urban Manual has been completed. <a href="${fileUrl}" download>Download your data</a>.`,
          text: 'Your data export request from Urban Manual has been completed. Copy the download link from your dashboard.',
        });

        await client
          .from('account_data_requests')
          .update({ email_sent_at: new Date().toISOString() })
          .eq('id', request.id);
      }

      await client.from('account_privacy_audit').insert({
        user_id: request.user_id,
        action: 'export_complete',
        metadata: { request_id: request.id },
      });

      processed.push({ id: request.id, status: 'complete' });
    } catch (error) {
      const message = describeError(error);
      console.error('[account-data-requests] Export failed', error);
      await client
        .from('account_data_requests')
        .update({
          status: 'failed',
          last_error: message || 'Unknown export error',
        })
        .eq('id', request.id);

      processed.push({ id: request.id, status: 'failed', error: message });
    }
  }

  return processed;
}

async function processDeletionRequests(client: ReturnType<typeof createServiceRoleClient>) {
  const { data: pending } = await client
    .from('account_data_requests')
    .select('*')
    .eq('request_type', 'deletion')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(DELETION_BATCH_SIZE);

  if (!pending?.length) return [];

  const processed: Array<{ id: string; status: string; error?: string }> = [];

  for (const request of pending) {
    try {
      await client
        .from('account_data_requests')
        .update({ status: 'in_progress' })
        .eq('id', request.id);

      const email = await getUserEmail(client, request.user_id);
      const summary = await deleteUserData(client, request.user_id);

      await client
        .from('account_data_requests')
        .update({
          status: 'complete',
          processed_at: new Date().toISOString(),
          result_payload: summary,
        })
        .eq('id', request.id);

      if (email) {
        await sendPrivacyEmail({
          to: email,
          subject: 'Your Urban Manual account has been deleted',
          html: 'Your request to delete your Urban Manual account has been processed. All personal data has been purged. If this was not you, contact privacy@theurbanmanual.com immediately.',
          text: 'Your Urban Manual account has been deleted. Contact privacy@theurbanmanual.com if you need help.',
        });

        await client
          .from('account_data_requests')
          .update({ email_sent_at: new Date().toISOString() })
          .eq('id', request.id);
      }

      await client.from('account_privacy_audit').insert({
        user_id: request.user_id,
        action: 'deletion_complete',
        metadata: { request_id: request.id, summary },
      });

      processed.push({ id: request.id, status: 'complete' });
    } catch (error) {
      const message = describeError(error);
      console.error('[account-data-requests] Deletion failed', error);
      await client
        .from('account_data_requests')
        .update({
          status: 'failed',
          last_error: message || 'Unknown deletion error',
        })
        .eq('id', request.id);

      processed.push({ id: request.id, status: 'failed', error: message });
    }
  }

  return processed;
}

async function buildExportPayload(client: ReturnType<typeof createServiceRoleClient>, userId: string) {
  const [profile, savedPlaces, visitedPlaces, collections, trips, interactions] = await Promise.all([
    client.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
    client.from('saved_places').select('*').eq('user_id', userId),
    client.from('visited_places').select('*').eq('user_id', userId),
    client.from('collections').select('*').eq('user_id', userId),
    client.from('trips').select('*').eq('user_id', userId),
    client.from('user_interactions').select('*').eq('user_id', userId).limit(500),
  ]);

  const profileData = unwrapResponse<Record<string, unknown> | null>(profile as SupabaseResponse<Record<string, unknown> | null>);
  const savedData = unwrapResponse<Record<string, unknown>[] | null>(savedPlaces as SupabaseResponse<Record<string, unknown>[] | null>);
  const visitedData = unwrapResponse<Record<string, unknown>[] | null>(visitedPlaces as SupabaseResponse<Record<string, unknown>[] | null>);
  const collectionsData = unwrapResponse<Record<string, unknown>[] | null>(collections as SupabaseResponse<Record<string, unknown>[] | null>);
  const tripsData = unwrapResponse<Record<string, unknown>[] | null>(trips as SupabaseResponse<Record<string, unknown>[] | null>);
  const interactionsData = unwrapResponse<Record<string, unknown>[] | null>(interactions as SupabaseResponse<Record<string, unknown>[] | null>);

  return {
    generated_at: new Date().toISOString(),
    profile: profileData || null,
    saved_places: savedData || [],
    visited_places: visitedData || [],
    collections: collectionsData || [],
    trips: tripsData || [],
    interactions: interactionsData || [],
  };
}

async function deleteUserData(client: ReturnType<typeof createServiceRoleClient>, userId: string) {
  const tables = [
    'saved_places',
    'visited_places',
    'collections',
    'trips',
    'user_interactions',
    'personalization_scores',
    'account_privacy_audit',
  ];

  const summary: Record<string, string> = {};

  for (const table of tables) {
    try {
      await client.from(table).delete().eq('user_id', userId);
      summary[table] = 'deleted';
    } catch (error) {
      summary[table] = `error: ${describeError(error)}`;
    }
  }

  try {
    await client.from('account_data_requests').delete().eq('user_id', userId).neq('request_type', 'deletion');
  } catch (error) {
    summary['account_data_requests'] = `partial-delete-error: ${describeError(error)}`;
  }

  try {
    await client.from('user_profiles').delete().eq('user_id', userId);
    summary['user_profiles'] = 'deleted';
  } catch (error) {
    summary['user_profiles'] = `error: ${describeError(error)}`;
  }

  try {
    await client.auth.admin.deleteUser(userId);
    summary['auth_user'] = 'deleted';
  } catch (error) {
    summary['auth_user'] = `error: ${describeError(error)}`;
  }

  return summary;
}

async function getUserEmail(client: ReturnType<typeof createServiceRoleClient>, userId: string) {
  try {
    const { data, error } = await client.auth.admin.getUserById(userId);
    if (error) throw error;
    return data.user?.email || null;
  } catch (error) {
    console.error('[account-data-requests] Failed to fetch user email', error);
    return null;
  }
}

type CronResults = {
  exports: Array<{ id: string; status: string; error?: string }>;
  deletions: Array<{ id: string; status: string; error?: string }>;
};

type SupabaseResponse<T> = {
  data: T;
  error: { code?: string; message?: string } | null;
};

function unwrapResponse<T>(response: SupabaseResponse<T>) {
  if (response.error && response.error.code !== 'PGRST116') {
    throw response.error;
  }
  return response.data;
}

function describeError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message);
  }
  return 'Unknown error';
}
