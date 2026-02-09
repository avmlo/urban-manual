import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { toSlug, toTitleCase } from '@/lib/utils';

type SyncType = 'brands' | 'cities' | 'countries' | 'neighborhoods' | 'all';

export async function POST(request: NextRequest) {
  try {
    const { type = 'all' } = await request.json() as { type?: SyncType };

    // Use regular client for auth check
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client to bypass RLS for data operations
    const supabase = createServiceRoleClient();

    const results: Record<string, { found: number; inserted: number; existing: number }> = {};

    // Sync brands
    if (type === 'all' || type === 'brands') {
      const { data: destinations } = await supabase
        .from('destinations')
        .select('brand')
        .not('brand', 'is', null)
        .not('brand', 'eq', '');

      const uniqueBrands = [...new Set(
        destinations?.map(d => d.brand?.trim()).filter(Boolean) || []
      )];

      // Fetch all existing brand slugs in one query
      const { data: existingBrands } = await supabase
        .from('brands')
        .select('slug');
      const existingSlugs = new Set(existingBrands?.map(b => b.slug) || []);

      const newBrands = uniqueBrands
        .map(brand => ({ name: toTitleCase(brand), slug: toSlug(brand) }))
        .filter(b => !existingSlugs.has(b.slug));

      if (newBrands.length > 0) {
        const { error } = await supabase.from('brands').insert(newBrands);
        if (error) throw error;
      }

      results.brands = {
        found: uniqueBrands.length,
        inserted: newBrands.length,
        existing: uniqueBrands.length - newBrands.length,
      };
    }

    // Sync cities
    if (type === 'all' || type === 'cities') {
      const { data: destinations } = await supabase
        .from('destinations')
        .select('city, country')
        .not('city', 'is', null)
        .not('city', 'eq', '');

      const cityMap = new Map<string, { name: string; country: string | null }>();
      destinations?.forEach(d => {
        if (d.city) {
          const key = `${d.city.trim().toLowerCase()}-${(d.country || '').toLowerCase()}`;
          if (!cityMap.has(key)) {
            cityMap.set(key, {
              name: toTitleCase(d.city.trim()),
              country: d.country ? toTitleCase(d.country.trim()) : null
            });
          }
        }
      });

      // Fetch all existing city slugs in one query
      const { data: existingCities } = await supabase
        .from('cities')
        .select('slug');
      const existingSlugs = new Set(existingCities?.map(c => c.slug) || []);

      const newCities = [...cityMap.values()]
        .map(city => ({
          name: city.name,
          country: city.country,
          slug: toSlug(`${city.name}-${city.country || 'unknown'}`),
        }))
        .filter(c => !existingSlugs.has(c.slug));

      if (newCities.length > 0) {
        const { error } = await supabase.from('cities').insert(newCities);
        if (error) throw error;
      }

      results.cities = {
        found: cityMap.size,
        inserted: newCities.length,
        existing: cityMap.size - newCities.length,
      };
    }

    // Sync countries
    if (type === 'all' || type === 'countries') {
      const { data: destinations } = await supabase
        .from('destinations')
        .select('country')
        .not('country', 'is', null)
        .not('country', 'eq', '');

      const uniqueCountries = [...new Set(
        destinations?.map(d => d.country?.trim()).filter(Boolean) || []
      )];

      // Fetch all existing country slugs in one query
      const { data: existingCountries } = await supabase
        .from('countries')
        .select('slug');
      const existingSlugs = new Set(existingCountries?.map(c => c.slug) || []);

      const newCountries = uniqueCountries
        .map(country => ({ name: toTitleCase(country), slug: toSlug(country) }))
        .filter(c => !existingSlugs.has(c.slug));

      if (newCountries.length > 0) {
        const { error } = await supabase.from('countries').insert(newCountries);
        if (error) throw error;
      }

      results.countries = {
        found: uniqueCountries.length,
        inserted: newCountries.length,
        existing: uniqueCountries.length - newCountries.length,
      };
    }

    // Sync neighborhoods
    if (type === 'all' || type === 'neighborhoods') {
      const { data: destinations } = await supabase
        .from('destinations')
        .select('neighborhood, city, country')
        .not('neighborhood', 'is', null)
        .not('neighborhood', 'eq', '');

      const neighborhoodMap = new Map<string, { name: string; city: string | null; country: string | null }>();
      destinations?.forEach(d => {
        if (d.neighborhood) {
          const key = `${d.neighborhood.trim().toLowerCase()}-${(d.city || '').toLowerCase()}-${(d.country || '').toLowerCase()}`;
          if (!neighborhoodMap.has(key)) {
            neighborhoodMap.set(key, {
              name: toTitleCase(d.neighborhood.trim()),
              city: d.city ? toTitleCase(d.city.trim()) : null,
              country: d.country ? toTitleCase(d.country.trim()) : null
            });
          }
        }
      });

      // Fetch all existing neighborhood slugs in one query
      const { data: existingNeighborhoods } = await supabase
        .from('neighborhoods')
        .select('slug');
      const existingSlugs = new Set(existingNeighborhoods?.map(n => n.slug) || []);

      const newNeighborhoods = [...neighborhoodMap.values()]
        .map(n => ({
          name: n.name,
          city: n.city,
          country: n.country,
          slug: toSlug(`${n.name}-${n.city || 'unknown'}-${n.country || 'unknown'}`),
        }))
        .filter(n => !existingSlugs.has(n.slug));

      if (newNeighborhoods.length > 0) {
        const { error } = await supabase.from('neighborhoods').insert(newNeighborhoods);
        if (error) throw error;
      }

      results.neighborhoods = {
        found: neighborhoodMap.size,
        inserted: newNeighborhoods.length,
        existing: neighborhoodMap.size - newNeighborhoods.length,
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Sync completed',
      results
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
