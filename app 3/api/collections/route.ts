import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { withErrorHandling, createUnauthorizedError, createValidationError, handleSupabaseError } from '@/lib/errors';

/**
 * POST /api/collections
 * Create a new collection
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  const body = await request.json();
  const { name, description, emoji, color, is_public } = body;

  if (!name || !name.trim()) {
    throw createValidationError('Collection name is required');
  }

  // Insert collection
  const { data, error } = await supabase
    .from('collections')
    .insert({
      user_id: user.id,
      name: name.trim(),
      description: description?.trim() || null,
      emoji: emoji || '📍',
      color: color || '#3B82F6',
      is_public: is_public ?? false,
      destination_count: 0,
    })
    .select()
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  return NextResponse.json({ collection: data }, { status: 201 });
});

/**
 * GET /api/collections
 * Get user's collections
 */
export const GET = withErrorHandling(async () => {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw handleSupabaseError(error);
  }

  return NextResponse.json({ collections: data || [] });
});

