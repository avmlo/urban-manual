import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { embedText } from '@/lib/llm';

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

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Service role not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);
    const cursor = parseInt(searchParams.get('cursor') || '0', 10);
    const onlyMissing = searchParams.get('onlyMissing') !== 'false';

    // Fetch a page of destinations
    let query = supabase
      .from('destinations')
      .select('id, slug, name, city, category, description, content, tags, style_tags, ambience_tags, experience_tags, vector_embedding', { count: 'exact' })
      .order('id', { ascending: true })
      .range(cursor, cursor + limit - 1);

    if (onlyMissing) {
      // Filter will be handled client-side since PostgREST cannot filter vector null directly in some setups
    }

    const { data, error, count } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to refresh embeddings' }, { status: 500 });
  }
}


