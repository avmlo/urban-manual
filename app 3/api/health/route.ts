import { NextResponse } from 'next/server';

export async function GET() {
  const checks = {
    DATABASE_URL: !!(process.env.DATABASE_URL || process.env.POSTGRES_URL),
    PAYLOAD_SECRET: !!process.env.PAYLOAD_SECRET,
    SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    GOOGLE_MAPS_API_KEY: !!process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
    GOOGLE_AI_API_KEY: !!(process.env.GOOGLE_AI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY),
  };

  const allPassing = Object.values(checks).every(Boolean);

  return NextResponse.json({
    status: allPassing ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks,
    message: allPassing
      ? 'All environment variables are configured'
      : 'Some environment variables are missing. Check Vercel dashboard > Settings > Environment Variables',
  }, {
    status: allPassing ? 200 : 503,
  });
}
