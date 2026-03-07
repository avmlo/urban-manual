import { NextRequest } from 'next/server';

/**
 * Checks if the request is authorized as a Cron job or machine-to-machine admin task.
 *
 * Valid authorization methods:
 * 1. `Authorization: Bearer <CRON_SECRET>` header (if CRON_SECRET is set in env)
 * 2. `x-vercel-cron: 1` header (injected by Vercel Cron)
 */
export function isCronAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const vercelCronHeader = request.headers.get('x-vercel-cron');

  if (cronSecret && authHeader) {
    if (authHeader === `Bearer ${cronSecret}`) {
      return true;
    }
  }

  return vercelCronHeader === '1';
}
