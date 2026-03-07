import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withErrorHandling, createValidationError } from '@/lib/errors';

// Edge Runtime for faster cold starts (~100ms vs ~1s for Node.js)
export const runtime = 'edge';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Security: Strictly use ANON key to enforce RLS policies for public data access
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw createValidationError('Supabase configuration missing');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Query distinct cities from the destinations table
  const { data, error } = await supabase
    .from('destinations')
    .select('city')
    .not('city', 'is', null)
    .order('city');

  if (error) {
    console.error('Error fetching cities:', error);
    throw error;
  }

  // Extract unique cities
  const cities = [...new Set(data.map((d: { city: string }) => d.city))].sort();

  // Add cache headers - city list rarely changes
  const response = NextResponse.json({ cities });
  response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
  return response;
});

// Enable ISR - revalidate every 5 minutes
export const revalidate = 300;
