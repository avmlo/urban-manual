import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import { getDestinationBySlugWithLocationGroup } from '@/lib/supabase/location-groups';

/**
 * GET /api/destinations/[slug]/location-group
 * Get all locations for a destination's location group
 */
export const GET = withErrorHandling(
  async (request: NextRequest, { params }: { params: { slug: string } }) => {
    const supabase = createServerClient();
    const { slug } = params;

    if (!slug) {
      throw createValidationError('Slug is required');
    }

    const result = await getDestinationBySlugWithLocationGroup(supabase, slug);

    if (!result) {
      return NextResponse.json({ error: 'Destination not found' }, { status: 404 });
    }

    return NextResponse.json({
      destination: result.destination,
      allLocations: result.allLocations,
      locationCount: result.allLocations.length,
      isMultiLocation: result.allLocations.length > 1,
    });
  }
);
