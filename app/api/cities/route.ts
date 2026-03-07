import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import { enforceRateLimit, apiRatelimit, memoryApiRatelimit } from '@/lib/rate-limit';

// Edge Runtime for faster cold starts (~100ms vs ~1s for Node.js)
export const runtime = 'edge';

export const GET = withErrorHandling(async (request: NextRequest) => {
  // Rate limit check to prevent abuse
  const rateLimitResponse = await enforceRateLimit({
    request,
    message: 'Too many requests',
    limiter: apiRatelimit,
    memoryLimiter: memoryApiRatelimit,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Use anon key for public data access (fixing security audit 7.1)
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

// Force dynamic because we use request headers for rate limiting
export const dynamic = 'force-dynamic';
