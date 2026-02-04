import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getVisitedSlugsForUser } from '@/server/services/homepage-loaders';

type VisitedHandlerDeps = {
  getCurrentUserId: () => Promise<string | null>;
  loadVisitedSlugs: (userId: string) => Promise<string[]>;
};

export function createHomepageVisitedHandler(deps: VisitedHandlerDeps) {
  return async function handler(_request: NextRequest) {
    try {
      const userId = await deps.getCurrentUserId();
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const slugs = await deps.loadVisitedSlugs(userId);
      return NextResponse.json({ success: true, slugs });
    } catch (error: any) {
      console.error('Error loading visited places for homepage', error);
      // Check if it's a Supabase config error
      if (error?.message?.includes('placeholder') || error?.message?.includes('invalid')) {
        return NextResponse.json({ success: true, slugs: [] }, { status: 200 });
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

async function getUserIdFromSession() {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.warn('Error retrieving auth user for homepage visited', error.message);
    return null;
  }

  return data?.user?.id ?? null;
}

export const GET = createHomepageVisitedHandler({
  getCurrentUserId: getUserIdFromSession,
  loadVisitedSlugs: getVisitedSlugsForUser,
});

export const dynamic = 'force-dynamic';
