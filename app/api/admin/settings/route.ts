import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, type AdminContext } from '@/lib/errors/auth';

export const GET = withAdminAuth(async (_req: NextRequest, { serviceClient }: AdminContext) => {
  const { data, error } = await serviceClient
    .from('admin_settings')
    .select('settings, updated_at')
    .eq('id', 'main')
    .single();

  if (error) {
    // Table might not exist yet — return empty settings
    return NextResponse.json({ settings: {}, updated_at: null });
  }

  return NextResponse.json({ settings: data.settings, updated_at: data.updated_at });
});

export const PUT = withAdminAuth(async (req: NextRequest, { user, serviceClient }: AdminContext) => {
  const { settings } = await req.json();

  if (!settings || typeof settings !== 'object') {
    return NextResponse.json({ error: 'Invalid settings payload' }, { status: 400 });
  }

  const { data, error } = await serviceClient
    .from('admin_settings')
    .upsert({
      id: 'main',
      settings,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .select('settings, updated_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data.settings, updated_at: data.updated_at });
});
