import { NextRequest, NextResponse } from 'next/server';
import type { Destination } from '@/types/destination';
import { getHomepageDestinations } from '@/server/services/homepage-loaders';

type DestinationsHandlerDeps = {
  loadDestinations: () => Promise<Destination[]>;
};

export function createHomepageDestinationsHandler(deps: DestinationsHandlerDeps) {
  return async function handler(_request: NextRequest) {
    try {
      const destinations = await deps.loadDestinations();
      return NextResponse.json({ success: true, destinations });
    } catch (error: any) {
      console.error('Error loading homepage destinations', error);
      // Check if it's a Supabase config error
      if (error?.message?.includes('placeholder') || error?.message?.includes('invalid')) {
        return NextResponse.json({ success: true, destinations: [] }, { status: 200 });
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

export const GET = createHomepageDestinationsHandler({
  loadDestinations: () => getHomepageDestinations(),
});

// Reduced revalidate time to allow faster updates after POI creation
export const revalidate = 10;
