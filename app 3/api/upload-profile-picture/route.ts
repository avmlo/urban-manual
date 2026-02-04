import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  uploadRatelimit,
  memoryUploadRatelimit,
  getIdentifier,
  createRateLimitResponse,
  isUpstashConfigured,
} from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify user is authenticated
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 3 uploads per minute
    const identifier = getIdentifier(request, user.id);
    const ratelimit = isUpstashConfigured() ? uploadRatelimit : memoryUploadRatelimit;
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

    if (!success) {
      return createRateLimitResponse(
        'Too many upload requests. Please wait a moment.',
        limit,
        remaining,
        reset
      );
    }

    // 2. Use service role client for storage operations
    const supabaseAdmin = createServiceRoleClient();

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 2MB for profile pictures)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 2MB' }, { status: 400 });
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `profile-${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `profiles/${fileName}`;

    // Upload to Supabase Storage
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('profile-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Overwrite existing profile picture
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('profile-images')
      .getPublicUrl(filePath);

    // Update user profile with avatar URL
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        avatar_url: urlData.publicUrl,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (updateError) {
      console.error('Update error:', updateError);
      // Still return the URL even if update fails
    }

    return NextResponse.json({ 
      url: urlData.publicUrl,
      path: filePath
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}

