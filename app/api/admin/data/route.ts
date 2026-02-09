import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

type DataType = 'brands' | 'cities' | 'countries' | 'neighborhoods' | 'architects';

const VALID_TYPES: DataType[] = ['brands', 'cities', 'countries', 'neighborhoods', 'architects'];

// Columns eligible for ilike search per collection type
const SEARCH_COLUMNS: Record<DataType, string[]> = {
  brands: ['name'],
  cities: ['name', 'country'],
  countries: ['name'],
  neighborhoods: ['name', 'city', 'country'],
  architects: ['name', 'nationality'],
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') as DataType;

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  try {
    // Verify admin using regular client
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client to bypass RLS for admin operations
    const supabase = createServiceRoleClient();

    // Parse optional pagination params
    const pageParam = searchParams.get('page');
    const pageSizeParam = searchParams.get('pageSize');
    const search = searchParams.get('search')?.trim() || '';
    const paginate = pageParam !== null && pageSizeParam !== null;
    const page = Math.max(1, parseInt(pageParam || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeParam || '50', 10)));

    // When paginating, request exact count; otherwise skip the overhead
    let query = paginate
      ? supabase.from(type).select('*', { count: 'exact' })
      : supabase.from(type).select('*');

    // Apply search filter across relevant columns
    if (search) {
      const escaped = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
      const columns = SEARCH_COLUMNS[type];
      const orFilter = columns.map(col => `${col}.ilike.%${escaped}%`).join(',');
      query = query.or(orFilter);
    }

    // Ordering
    query = query.order('name');

    // Apply pagination range
    if (paginate) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    if (paginate) {
      return NextResponse.json({ data, total: count ?? 0, page, pageSize });
    }
    return NextResponse.json({ data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, data: itemData } = await request.json();

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // Verify admin using regular client
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client to bypass RLS for admin operations
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.from(type).insert(itemData).select().single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { type, id, data: itemData } = await request.json();

    if (!type || !VALID_TYPES.includes(type) || !id) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Verify admin using regular client
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client to bypass RLS for admin operations
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.from(type).update(itemData).eq('id', id).select().single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Architect-related UUID fields in destinations table (both reference architects table)
// Note: design_firm_id references design_firms table, not architects
const ARCHITECT_FIELDS = ['architect_id', 'interior_designer_id'] as const;

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') as DataType;
  const singleId = searchParams.get('id');
  const idsParam = searchParams.get('ids');

  // Support single id or comma-separated ids for bulk delete
  const ids = idsParam
    ? idsParam.split(',').filter(Boolean)
    : singleId
      ? [singleId]
      : [];

  if (!type || !VALID_TYPES.includes(type) || ids.length === 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    // Verify admin using regular client
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client to bypass RLS for admin operations
    const supabase = createServiceRoleClient();

    // For architects: clear foreign key references in destinations before deletion
    if (type === 'architects') {
      for (const field of ARCHITECT_FIELDS) {
        const { error: updateError } = await supabase
          .from('destinations')
          .update({ [field]: null })
          .in(field, ids);

        if (updateError) {
          // Detect stale trigger referencing old column name (architect → design_firm)
          if (updateError.message.includes('has no field "architect"')) {
            throw new Error(
              `Database trigger references the old "architect" column. ` +
              `Please apply migration 504_fix_triggers_after_architect_rename.sql in the Supabase SQL editor to fix this.`
            );
          }
          throw new Error(`Failed to clear ${field} references: ${updateError.message}`);
        }
      }
    }

    const { error } = await supabase.from(type).delete().in('id', ids);

    if (error) throw error;
    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
