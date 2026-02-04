import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = 
    process.env.SUPABASE_SECRET_KEY || 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase configuration is missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE keys.');
  }

  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city') || undefined;
    const category = searchParams.get('category') || undefined;
    const archetype = searchParams.get('archetype') || undefined;
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    let q = supabase
      .from('discovery_prompts')
      .select('id, city, category, archetype, variant_a, variant_b, weight')
      .order('weight', { ascending: false })
      .limit(limit);

    if (city) q = q.ilike('city', `%${city}%`).or(`city_id.is.not.null`);
    if (category) q = q.ilike('category', `%${category}%`);
    if (archetype) q = q.ilike('archetype', `%${archetype}%`);

    const { data, error } = await q;
    if (error) throw error;

    // Apply interest_score weighting from forecasting_data
    let weighted = data || [];
    if (city) {
      const { data: forecast } = await supabase
        .from('forecasting_data')
        .select('city, interest_score')
        .ilike('city', `%${city}%`)
        .order('last_forecast', { ascending: false })
        .limit(1);
      const interest = forecast?.[0]?.interest_score || 1.0;
      weighted = weighted.map((p: any) => ({ ...p, weight: (p.weight || 1) * interest }));
    }

    // Choose up to 2 prompts with A/B variant
    const chosen = (weighted)
      .sort((a: any, b: any) => (b.weight || 0) - (a.weight || 0))
      .slice(0, 2)
      .map((p: any) => ({
        title: p.variant_a || p.variant_b || 'Prompt',
        variant: p.variant_a ? 'A' : (p.variant_b ? 'B' : 'A'),
        city: p.city,
        archetype: p.archetype,
        weight: p.weight,
      }));

    return NextResponse.json({ items: chosen });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to load prompts', details: e.message }, { status: 500 });
  }
}


