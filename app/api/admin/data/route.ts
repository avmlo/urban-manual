import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

type DataType = 'brands' | 'cities' | 'countries' | 'neighborhoods' | 'architects';

const VALID_TYPES: DataType[] = ['brands', 'cities', 'countries', 'neighborhoods', 'architects'];

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
    const { data, error } = await supabase.from(type).select('*').order('name');

    if (error) throw error;
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
  const id = searchParams.get('id');

  if (!type || !VALID_TYPES.includes(type) || !id) {
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
          .eq(field, id);

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

    const { error } = await supabase.from(type).delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
