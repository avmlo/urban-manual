import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { Buffer } from 'buffer';

/**
 * Checks if a request is authorized to trigger cron jobs.
 *
 * Authorization methods:
 * 1. 'Authorization: Bearer <CRON_SECRET>' header
 * 2. 'x-vercel-cron: 1' header (set by Vercel Cron)
 */
export function isCronAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const vercelCronHeader = request.headers.get('x-vercel-cron');

  // Check Bearer token with constant-time comparison
  if (cronSecret && authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (token.length === cronSecret.length) {
      try {
        const tokenBuffer = Buffer.from(token);
        const secretBuffer = Buffer.from(cronSecret);
        if (timingSafeEqual(tokenBuffer, secretBuffer)) {
          return true;
        }
      } catch {
        // Ignore errors during buffer creation/comparison
      }
    }
  }

  // Check Vercel Cron header
  return vercelCronHeader === '1';
}
