import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { embedText } from '@/lib/llm';
import { withErrorHandling, createUnauthorizedError } from '@/lib/errors';
import { isCronAuthorized } from '@/lib/security/cron';
import {
  adminRatelimit,
  memoryAdminRatelimit,
  enforceRateLimit,
} from '@/lib/rate-limit';

function buildEmbeddingText(d: any): string {
  const parts: string[] = [];
  if (d.name) parts.push(d.name);
  if (d.city) parts.push(`City: ${d.city}`);
  if (d.category) parts.push(`Category: ${d.category}`);
  const tags: string[] = [];
  (d.style_tags || []).forEach((t: string) => tags.push(t));
  (d.ambience_tags || []).forEach((t: string) => tags.push(t));
  (d.experience_tags || []).forEach((t: string) => tags.push(t));
  (d.tags || []).forEach((t: string) => tags.push(t));
  if (tags.length) parts.push(`Tags: ${tags.join(', ')}`);
  if (d.description) parts.push(d.description);
  if (d.content) parts.push(d.content);
  return parts.join('\n');
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  // 1. Authorization Check
  let isAuthorized = false;
  let userId = null;

  // Check if it's a valid cron/machine request
  if (isCronAuthorized(request)) {
    isAuthorized = true;
  } else {
    // Check if it's an admin user
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (user && user.app_metadata?.role === 'admin') {
      isAuthorized = true;
      userId = user.id;
    }
  }

  if (!isAuthorized) {
    throw createUnauthorizedError('Unauthorized: Admin or Cron secret required');
  }

  // 2. Rate Limiting
  const rateLimitResponse = await enforceRateLimit({
    request,
    userId, // Will use IP if null (for cron jobs)
    message: 'Too many embedding refresh requests',
    limiter: adminRatelimit,
    memoryLimiter: memoryAdminRatelimit,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    throw new Error('Service role not configured');
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);
  const cursor = parseInt(searchParams.get('cursor') || '0', 10);
  const onlyMissing = searchParams.get('onlyMissing') !== 'false';

  // Fetch a page of destinations
  const query = supabase
    .from('destinations')
    .select('id, slug, name, city, category, description, content, tags, style_tags, ambience_tags, experience_tags, vector_embedding', { count: 'exact' })
    .order('id', { ascending: true })
    .range(cursor, cursor + limit - 1);

  if (onlyMissing) {
    // Filter will be handled client-side since PostgREST cannot filter vector null directly in some setups
  }

  const { data, error, count } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const rows = (data || []);
  const processed: string[] = [];
  const skipped: string[] = [];
  const failed: Array<{ slug: string; reason: string }> = [];

  for (const d of rows) {
    if (onlyMissing && d.vector_embedding) {
      skipped.push(d.slug);
      continue;
    }
    const text = buildEmbeddingText(d);
    const vec = await embedText(text);
    if (!vec) {
      failed.push({ slug: d.slug, reason: 'embedding_failed' });
      continue;
    }
    const { error: upErr } = await supabase
      .from('destinations')
      .update({ vector_embedding: vec as unknown as any })
      .eq('id', d.id);
    if (upErr) {
      failed.push({ slug: d.slug, reason: upErr.message });
    } else {
      processed.push(d.slug);
    }
  }

  const nextCursor = cursor + rows.length;
  const hasMore = typeof count === 'number' ? nextCursor < count : rows.length === limit;

  return NextResponse.json({
    processedCount: processed.length,
    skippedCount: skipped.length,
    failedCount: failed.length,
    processed,
    skipped,
    failed,
    nextCursor: hasMore ? nextCursor : null,
    total: count ?? null,
  });
});
