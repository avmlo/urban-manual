import { NextRequest, NextResponse } from 'next/server';
import type { UserProfile } from '@/types/personalization';
import { createServerClient } from '@/lib/supabase-server';
import { getUserProfileById } from '@/server/services/homepage-loaders';

type ProfileHandlerDeps = {
  getCurrentUserId: () => Promise<string | null>;
  loadProfile: (userId: string) => Promise<UserProfile | null>;
};

export function createHomepageProfileHandler(deps: ProfileHandlerDeps) {
  return async function handler(_request: NextRequest) {
    try {
      const userId = await deps.getCurrentUserId();
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const profile = await deps.loadProfile(userId);

      return NextResponse.json({
        success: true,
        profile: profile ?? null,
      });
    } catch (error: any) {
      console.error('Error loading homepage profile', error);
      // Check if it's a Supabase config error
      if (error?.message?.includes('placeholder') || error?.message?.includes('invalid')) {
        return NextResponse.json({ success: true, profile: null }, { status: 200 });
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

async function getUserIdFromSession() {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.warn('Error retrieving auth user for homepage profile', error.message);
    return null;
  }

  return data?.user?.id ?? null;
}

export const GET = createHomepageProfileHandler({
  getCurrentUserId: getUserIdFromSession,
  loadProfile: getUserProfileById,
});

export const dynamic = 'force-dynamic';
