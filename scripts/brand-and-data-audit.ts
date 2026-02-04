/**
 * READ-ONLY audit: lists what would be changed.
 * No UPDATE/INSERT/DELETE — run this before applying any fixes.
 *
 * Usage (from project root): npx tsx scripts/brand-and-data-audit.ts
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_*)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('=== READ-ONLY AUDIT (no changes will be made) ===\n');

  // --- 1. EDITION brand fix: what would be updated ---
  const { data: editionRows, error: e1 } = await supabase
    .from('destinations')
    .select('id, name, city, category, brand')
    .eq('brand', 'EDITION');

  if (e1) {
    console.log('1. EDITION fix (would update): Error:', e1.message);
  } else {
    console.log('1. EDITION fix (would run: UPDATE ... SET brand = \'edition\' WHERE brand = \'EDITION\')');
    console.log('   Rows that would be updated:', editionRows?.length ?? 0);
    if (editionRows?.length) {
      editionRows.forEach((r: any) => console.log('   -', r.id, r.name, r.city, r.category, '| brand:', r.brand));
    }
    console.log('');
  }

  // --- 2. All brands with destinations (spot-check list) ---
  const { data: byBrand, error: e2 } = await supabase
    .from('destinations')
    .select('brand, name, city, category')
    .not('brand', 'is', null)
    .order('brand')
    .order('city');

  if (e2) {
    console.log('2. All brands + destinations: Error:', e2.message);
  } else {
    console.log('2. All brands with destinations (spot-check):');
    const byBrandName: Record<string, { name: string; city: string; category: string }[]> = {};
    for (const r of byBrand || []) {
      const b = (r as any).brand || 'null';
      if (!byBrandName[b]) byBrandName[b] = [];
      byBrandName[b].push({ name: (r as any).name, city: (r as any).city, category: (r as any).category });
    }
    Object.entries(byBrandName).forEach(([brand, list]) => {
      console.log('   Brand:', brand, '| count:', list.length);
      list.slice(0, 5).forEach(d => console.log('     -', d.name, '|', d.city, '|', d.category));
      if (list.length > 5) console.log('     ... and', list.length - 5, 'more');
    });
    console.log('');
  }

  // --- 3. Destinations missing brand but name suggests a brand ---
  const keywords = [
    'four seasons', 'aman', 'ritz', 'mandarin', 'rosewood', 'park hyatt', 'edition',
    'st regis', 'peninsula', 'fairmont', 'sofitel', 'hyatt', 'marriott', 'belmond',
  ];
  const { data: allWithNullBrand } = await supabase
    .from('destinations')
    .select('id, name, city, category')
    .is('brand', null);

  const suggested: any[] = (allWithNullBrand || []).filter((r: any) => {
    const n = (r.name || '').toLowerCase();
    return keywords.some(k => n.includes(k));
  });

  console.log('3. Destinations with NULL brand but name suggests a brand:');
  console.log('   Count:', suggested.length);
  suggested.forEach((r: any) => console.log('   -', r.id, r.name, r.city, r.category));
  console.log('');

  // --- 4. brand_id inconsistencies (only if column exists) ---
  const { data: sample } = await supabase.from('destinations').select('brand_id, brand').not('brand', 'is', null).limit(1);
  const hasBrandId = sample && sample[0] && 'brand_id' in (sample[0] as any);
  if (hasBrandId) {
    const { data: rows } = await supabase.from('destinations').select('brand, brand_id').not('brand', 'is', null);
    const map = new Map<string, Set<string>>();
    for (const r of rows || []) {
      const b = (r as any).brand;
      const id = String((r as any).brand_id ?? '');
      if (!map.has(b)) map.set(b, new Set());
      map.get(b)!.add(id);
    }
    const multi = [...map.entries()].filter(([, ids]) => ids.size > 1);
    console.log('4. brand_id: same brand text, multiple brand_ids:', multi.length);
    multi.forEach(([brand, ids]) => console.log('   -', brand, '->', [...ids]));
  } else {
    console.log('4. brand_id: column not present (or empty). Skipping brand_id consistency check.');
  }
  console.log('');

  // --- 5. Stale embeddings ---
  const { data: staleEmbed, count: staleCount } = await supabase
    .from('destinations')
    .select('id, name, city', { count: 'exact' })
    .eq('embedding_needs_update', true);

  console.log('5. Stale embeddings (embedding_needs_update = true):');
  console.log('   Count:', staleCount ?? staleEmbed?.length ?? 0);
  (staleEmbed || []).slice(0, 50).forEach((r: any) => console.log('   -', r.id, r.name, r.city));
  if ((staleCount ?? staleEmbed?.length ?? 0) > 50) console.log('   ... and more');
  console.log('');

  // --- 6. Missing AI summary ---
  const { count: total } = await supabase.from('destinations').select('*', { count: 'exact', head: true });

  let noAiShort: number | null = null;
  let noContent: number | null = null;
  let noSummarySample: any[] = [];

  const { count: noAiShortCount, data: noAiShortData } = await supabase
    .from('destinations')
    .select('id, name, city, category', { count: 'exact' })
    .is('ai_short_summary', null);
  noAiShort = noAiShortCount ?? null;
  if (noAiShortData?.length) noSummarySample = noAiShortData.slice(0, 20);

  const { count: noContentCount } = await supabase
    .from('destinations')
    .select('*', { count: 'exact', head: true })
    .is('content', null);
  noContent = noContentCount ?? null;

  console.log('6. Missing AI / content summaries:');
  console.log('   Total destinations:', total ?? '?');
  console.log('   ai_short_summary IS NULL:', noAiShort ?? '?');
  console.log('   content IS NULL:', noContent ?? '?');
  if (noSummarySample.length) {
    console.log('   Sample (ai_short_summary null):');
    noSummarySample.forEach((r: any) => console.log('   -', r.id, r.name, r.city, r.category));
  }
  console.log('');

  // --- 7. Empty AI columns (may not exist in all DBs) ---
  const totalDest = total ?? 0;
  const pct = (n: number) => (totalDest ? ((n / totalDest) * 100).toFixed(1) : '?');

  let noAiKeywords: number | null = null;
  let noAiVibe: number | null = null;
  const { count: cKw } = await supabase.from('destinations').select('*', { count: 'exact', head: true }).is('ai_keywords', null);
  const { count: cVibe } = await supabase.from('destinations').select('*', { count: 'exact', head: true }).is('ai_vibe_tags', null);
  noAiKeywords = cKw ?? null;
  noAiVibe = cVibe ?? null;

  console.log('7. Empty AI columns (candidates to populate or drop):');
  console.log('   ai_keywords IS NULL:', noAiKeywords ?? '?', totalDest ? `(${pct(noAiKeywords ?? 0)}%)` : '');
  console.log('   ai_vibe_tags IS NULL:', noAiVibe ?? '?', totalDest ? `(${pct(noAiVibe ?? 0)}%)` : '');
  console.log('   ai_short_summary (see #6):', noAiShort ?? '?');
  console.log('');

  console.log('=== END AUDIT (no changes were made) ===');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
