import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

/**
 * GET /api/brands/[brand]
 * Get all destinations for a specific brand
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ brand: string }> }
) {
  try {
    const { brand } = await context.params;
    const supabase = await createServerClient();

    if (!brand) {
      return NextResponse.json(
        { error: 'Brand parameter is required' },
        { status: 400 }
      );
    }

    // Get all destinations for this brand
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('*')
      .ilike('brand', brand)
      .order('rating', { ascending: false, nullsFirst: false });

    if (error) throw error;

    // Get user's saved/visited status for these destinations if authenticated
    const { data: { user } } = await supabase.auth.getUser();
    let userStatuses: Map<string, any> = new Map();

    if (user && destinations) {
      const slugs = (destinations as any[]).map((d: any) => d.slug);

      const [{ data: savedPlaces }, { data: visitedPlaces }] = await Promise.all([
        supabase
          .from('saved_places')
          .select('destination_slug')
          .eq('user_id', user.id)
          .in('destination_slug', slugs),
        supabase
          .from('visited_places')
          .select('destination_slug')
          .eq('user_id', user.id)
          .in('destination_slug', slugs),
      ]);

      const savedSet = new Set((savedPlaces as any[])?.map((s: any) => s.destination_slug) || []);
      const visitedSet = new Set((visitedPlaces as any[])?.map((v: any) => v.destination_slug) || []);

      (destinations as any[]).forEach((dest: any) => {
        userStatuses.set(dest.slug, {
          is_saved: savedSet.has(dest.slug),
          is_visited: visitedSet.has(dest.slug),
        });
      });
    }

    return NextResponse.json({
      brand,
      count: destinations?.length || 0,
      destinations: (destinations as any[])?.map((d: any) => ({
        ...d,
        user_status: user ? userStatuses.get(d.slug) : undefined,
      })) || [],
    });
  } catch (error: any) {
    console.error('Brand destinations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brand destinations', details: error.message },
      { status: 500 }
    );
  }
}
