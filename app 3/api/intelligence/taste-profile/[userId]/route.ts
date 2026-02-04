import { NextRequest, NextResponse } from 'next/server';
import { tasteProfileEvolutionService } from '@/services/intelligence/taste-profile-evolution';

/**
 * GET /api/intelligence/taste-profile/:userId
 * Get taste profile evolution for a user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const resolvedParams = await params;
    const userId = resolvedParams.userId;

    const profile = await tasteProfileEvolutionService.getTasteProfile(userId);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error('Error getting taste profile:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/intelligence/taste-profile/:userId/update
 * Update taste profile with new interactions
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const resolvedParams = await params;
    const userId = resolvedParams.userId;

    const { interactions } = await request.json();

    if (!interactions || !Array.isArray(interactions)) {
      return NextResponse.json(
        { error: 'interactions array is required' },
        { status: 400 }
      );
    }

    await tasteProfileEvolutionService.updateTasteProfile(userId, interactions);

    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    console.error('Error updating taste profile:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

