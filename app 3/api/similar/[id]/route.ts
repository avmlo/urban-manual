import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const destinationId = parseInt(id);
    
    if (isNaN(destinationId)) {
      return NextResponse.json({ error: 'Invalid destination ID' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Get similar places (semantic similarity)
    const { data: similar } = await supabase
      .from('destination_relationships')
      .select(`
        destination_b,
        similarity_score,
        destinations!destination_relationships_destination_b_fkey (*)
      `)
      .eq('destination_a', destinationId)
      .eq('relation_type', 'similar')
      .gte('similarity_score', 0.75)
      .order('similarity_score', { ascending: false })
      .limit(5);

    // Get complementary places (co-visitation)
    const { data: complementary } = await supabase
      .from('destination_relationships')
      .select(`
        destination_b,
        similarity_score,
        destinations!destination_relationships_destination_b_fkey (*)
      `)
      .eq('destination_a', destinationId)
      .eq('relation_type', 'complementary')
      .order('similarity_score', { ascending: false })
      .limit(5);

    return NextResponse.json({
      similar: (similar || []).map((s: any) => ({
        ...s.destinations,
        match_score: s.similarity_score,
        label: 'Similar Vibe',
      })),
      complementary: (complementary || []).map((c: any) => ({
        ...c.destinations,
        match_score: c.similarity_score,
        label: 'Pair With',
      })),
    });
  } catch (e: any) {
    console.error('Similar destinations error:', e);
    return NextResponse.json(
      { error: 'Failed to load similar', details: e.message },
      { status: 500 }
    );
  }
}


