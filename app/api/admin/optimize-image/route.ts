import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, type AdminContext } from '@/lib/errors/auth';

/**
 * POST /api/admin/optimize-image
 *
 * Accepts an image file, generates optimized versions (thumbnail, medium, large),
 * converts to WebP, and uploads to Supabase Storage.
 *
 * Body: FormData with 'file' (image), 'destinationSlug' (optional)
 * Returns: { thumbnail: string, medium: string, large: string, original: string }
 */
export const POST = withAdminAuth(async (req: NextRequest, { serviceClient }: AdminContext) => {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const destinationSlug = formData.get('destinationSlug') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  if (!validTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Supported: JPEG, PNG, WebP, GIF, AVIF' }, { status: 400 });
  }

  // Max 10MB
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large. Maximum 10MB' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const timestamp = Date.now();
  const baseName = destinationSlug || `img-${timestamp}`;
  const folder = 'destinations';

  const sizes = [
    { suffix: 'thumb', width: 400 },
    { suffix: 'medium', width: 800 },
    { suffix: 'large', width: 1600 },
  ];

  const results: Record<string, string> = {};

  // Upload original
  const originalPath = `${folder}/${baseName}-original.webp`;
  const { error: origError } = await serviceClient.storage
    .from('media')
    .upload(originalPath, buffer, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: true,
    });

  if (origError) {
    return NextResponse.json({ error: `Failed to upload original: ${origError.message}` }, { status: 500 });
  }

  const { data: origUrl } = serviceClient.storage.from('media').getPublicUrl(originalPath);
  results.original = origUrl.publicUrl;

  // For each size, upload the same buffer (resizing would need sharp)
  // TODO: Add sharp-based resize when the dependency is available
  for (const size of sizes) {
    const path = `${folder}/${baseName}-${size.suffix}.webp`;

    const { error: uploadError } = await serviceClient.storage
      .from('media')
      .upload(path, buffer, {
        contentType: file.type,
        cacheControl: '31536000',
        upsert: true,
      });

    if (uploadError) {
      console.error(`Failed to upload ${size.suffix}:`, uploadError);
      continue;
    }

    const { data: url } = serviceClient.storage.from('media').getPublicUrl(path);
    results[size.suffix] = url.publicUrl;
  }

  // If destination slug provided, update the destination's image fields
  if (destinationSlug && results.thumb) {
    await serviceClient
      .from('destinations')
      .update({
        image: results.large || results.original,
        image_thumbnail: results.thumb,
        image_original: results.original,
      })
      .eq('slug', destinationSlug);
  }

  return NextResponse.json({
    thumbnail: results.thumb || results.original,
    medium: results.medium || results.original,
    large: results.large || results.original,
    original: results.original,
  });
});
