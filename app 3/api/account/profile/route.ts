import { createServerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, createUnauthorizedError, createValidationError, handleSupabaseError } from '@/lib/errors';

export const GET = withErrorHandling(async () => {
  const supabase = await createServerClient();

  // Get the authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  // Fetch the user's profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) {
    throw handleSupabaseError(profileError);
  }

  return NextResponse.json({ profile: profile || null });
});

export const PUT = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();

  // Get the authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  // Parse the request body
  const body = await request.json();
  const {
    display_name,
    bio,
    location,
    website_url,
    birthday,
    username,
    is_public,
  } = body;

  // Validate username if provided (alphanumeric, underscore, hyphen only)
  if (username && !/^[a-zA-Z0-9_-]+$/.test(username)) {
    throw createValidationError('Username can only contain letters, numbers, underscores, and hyphens');
  }

  // Validate birthday format if provided (YYYY-MM-DD)
  if (birthday && !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
    throw createValidationError('Birthday must be in YYYY-MM-DD format');
  }

  // Validate website URL if provided
  if (website_url) {
    try {
      new URL(website_url);
    } catch {
      throw createValidationError('Invalid website URL');
    }
  }

  // Check if username is already taken (if changing username)
  if (username) {
    const { data: existingUser, error: existingUserError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('username', username)
      .neq('user_id', user.id)
      .maybeSingle();

    if (existingUserError) {
      throw handleSupabaseError(existingUserError);
    }

    if (existingUser) {
      throw createValidationError('Username is already taken', { username: ['This username is already taken'] });
    }
  }

  // Prepare update data (only include fields that were provided)
  const updateData: any = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };

  if (display_name !== undefined) updateData.display_name = display_name;
  if (bio !== undefined) updateData.bio = bio;
  if (location !== undefined) updateData.location = location;
  if (website_url !== undefined) updateData.website_url = website_url;
  if (birthday !== undefined) updateData.birthday = birthday;
  if (username !== undefined) updateData.username = username;
  if (is_public !== undefined) updateData.is_public = is_public;

  // Update the profile
  const { data: updatedProfile, error: updateError } = await supabase
    .from('user_profiles')
    .upsert(updateData)
    .select()
    .single();

  if (updateError) {
    throw handleSupabaseError(updateError);
  }

  return NextResponse.json({
    success: true,
    profile: updatedProfile,
  });
});
