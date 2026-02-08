import { test } from 'node:test';
import assert from 'node:assert';
import { GET } from '@/app/api/nearby/route';
import { NextRequest } from 'next/server';

// Ensure Upstash is not configured so we use memory limiter
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

// Mock console.error/log to avoid noise
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
console.error = () => {};
console.log = () => {};

test('nearby endpoint rate limiting', async () => {
  // Reset memory limiter cache if possible?
  // The memory limiter is a module-level global singleton in lib/rate-limit.ts.
  // It persists across calls in the same process.

  // The search limit is 20 requests per 10 seconds.
  const LIMIT = 20;
  let rateLimitHit = false;

  console.log = originalConsoleLog; // Restore for debugging if needed

  for (let i = 0; i < LIMIT + 5; i++) {
    const req = new NextRequest('http://localhost:3000/api/nearby?lat=0&lng=0');
    try {
      const res = await GET(req);
      if (res.status === 429) {
        rateLimitHit = true;
        break;
      }
    } catch {
      // Ignore other errors (like 500 due to missing DB)
    }
  }

  // Restore console
  console.error = originalConsoleError;

  // In the initial state, we expect NO rate limiting.
  // So rateLimitHit should be false.
  // assert.strictEqual(rateLimitHit, false, 'Should not be rate limited before fix');

  // Actually, to make this test useful for verification AFTER the fix,
  // I should assert that it IS rate limited.
  // So initially this test should FAIL.

  assert.strictEqual(rateLimitHit, true, 'Should return 429 when rate limit exceeded');
});
