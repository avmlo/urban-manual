/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { embedText } from '@/lib/llm';
import { withErrorHandling, createUnauthorizedError } from '@/lib/errors';
import { enforceRateLimit, adminRatelimit, memoryAdminRatelimit } from '@/lib/rate-limit';

function buildEmbeddingText(d: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof d.name === 'string') parts.push(d.name);
  if (typeof d.city === 'string') parts.push(`City: ${d.city}`);
  if (typeof d.category === 'string') parts.push(`Category: ${d.category}`);
  const tags: string[] = [];
  if (Array.isArray(d.style_tags)) d.style_tags.forEach((t: unknown) => typeof t === 'string' && tags.push(t));
  if (Array.isArray(d.ambience_tags)) d.ambience_tags.forEach((t: unknown) => typeof t === 'string' && tags.push(t));
  if (Array.isArray(d.experience_tags)) d.experience_tags.forEach((t: unknown) => typeof t === 'string' && tags.push(t));
  if (Array.isArray(d.tags)) d.tags.forEach((t: unknown) => typeof t === 'string' && tags.push(t));
  if (tags.length) parts.push(`Tags: ${tags.join(', ')}`);
  if (typeof d.description === 'string') parts.push(d.description);
  if (typeof d.content === 'string') parts.push(d.content);
  return parts.join('\n');
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  // 1. Authentication Check
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const vercelCronSecret = request.headers.get('x-vercel-cron');

  let isAdmin = false;

  // Check for Cron Secret or Vercel Cron header
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    isAdmin = true;
  } else if (vercelCronSecret === '1') {
    isAdmin = true;
  }

  // If not Cron, check for Admin User Session
  if (!isAdmin) {
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    const role = (user?.app_metadata as Record<string, unknown> | null)?.role;
    if (role === 'admin') {
      isAdmin = true;
    }
  }

  if (!isAdmin) {
    throw createUnauthorizedError('Unauthorized');
  }

  // 2. Rate Limiting (Defense in Depth)
  // Shared bucket for admin tasks or use IP to prevent abuse even by authorized users
  const rateLimitRes = await enforceRateLimit({
    request,
    userId: 'admin-tasks',
    message: 'Too many refresh requests',
    limiter: adminRatelimit,
    memoryLimiter: memoryAdminRatelimit,
  });
  if (rateLimitRes) return rateLimitRes;

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
      .update({ vector_embedding: vec as unknown as any }) // vec is number[] which supabase-js handles
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
