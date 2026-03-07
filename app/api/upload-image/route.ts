import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/adminAuth';
import {
  uploadRatelimit,
  memoryUploadRatelimit,
  getIdentifier,
  createRateLimitResponse,
  isUpstashConfigured,
} from '@/lib/rate-limit';
import { withErrorHandling } from '@/lib/errors';
import { validateImageFile, getSafeExtension } from '@/lib/security/image-validation';

export const POST = withErrorHandling(async (request: NextRequest) => {
  try {
    const { serviceClient: supabaseAdmin } = await requireAdmin(request);

    // Rate limiting: 3 uploads per minute
    const identifier = getIdentifier(request);
    const limiter = isUpstashConfigured() ? uploadRatelimit : memoryUploadRatelimit;
    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    if (!success) {
      return createRateLimitResponse('Upload rate limit exceeded. Please try again later.', limit, remaining, reset);
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const slug = formData.get('slug') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    // Validate image using magic bytes (prevents MIME type spoofing)
    const validation = await validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid image file' }, { status: 400 });
    }

    // Generate unique filename using safe extension from detected MIME type
    // Use non-null assertion for detectedMime as validateImageFile ensures it exists when valid is true
    const safeExt = getSafeExtension(validation.detectedMime!);
    const fileName = slug
      ? `${slug}-${Date.now()}.${safeExt}`
      : `upload-${Date.now()}.${safeExt}`;
    const filePath = `destinations/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('destination-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('destination-images')
      .getPublicUrl(filePath);

    return NextResponse.json({
      url: urlData.publicUrl,
      path: filePath
    });

  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
});
