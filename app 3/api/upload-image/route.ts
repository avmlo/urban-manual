import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  try {
    const { serviceClient: supabaseAdmin } = await requireAdmin(request);

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const slug = formData.get('slug') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = slug 
      ? `${slug}-${Date.now()}.${fileExt}`
      : `upload-${Date.now()}.${fileExt}`;
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
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
