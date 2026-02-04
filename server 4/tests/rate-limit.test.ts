import test from 'node:test';
import assert from 'node:assert/strict';
import { enforceRateLimit } from '../../lib/rate-limit';

type MockLimiterResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

class MockLimiter {
  public callCount = 0;
  private result: MockLimiterResult;

  constructor(result: MockLimiterResult) {
    this.result = result;
  }

  async limit(): Promise<MockLimiterResult> {
    this.callCount += 1;
    return this.result;
  }
}

const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const restoreEnv = () => {
  process.env.UPSTASH_REDIS_REST_URL = originalUrl;
  process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
};

test('enforceRateLimit allows requests when quota available', async () => {
  process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

  const limiter = new MockLimiter({
    success: true,
    limit: 10,
    remaining: 9,
    reset: Date.now() + 1000,
  });
  const fallback = new MockLimiter({
    success: true,
    limit: 10,
    remaining: 9,
    reset: Date.now() + 1000,
  });

  const response = await enforceRateLimit({
    request: new Request('https://example.com/api'),
    message: 'Too many requests',
    limiter,
    memoryLimiter: fallback,
  });

  assert.equal(response, null);
  assert.equal(limiter.callCount, 1);
  assert.equal(fallback.callCount, 0);

  restoreEnv();
});

test('enforceRateLimit returns 429 and headers when throttled', async () => {
  process.env.UPSTASH_REDIS_REST_URL = '';
  process.env.UPSTASH_REDIS_REST_TOKEN = '';

  const now = 1_700_000_000_000;
  const originalNow = Date.now;
  Date.now = () => now;

  const reset = now + 5000;

  const limiter = new MockLimiter({
    success: false,
    limit: 5,
    remaining: 0,
    reset,
  });

  const response = await enforceRateLimit({
    request: new Request('https://example.com/api'),
    message: 'Too many requests',
    limiter,
    memoryLimiter: limiter,
  });

  assert.ok(response);
  assert.equal(response?.status, 429);
  assert.equal(response?.headers.get('X-RateLimit-Limit'), '5');
  assert.equal(response?.headers.get('X-RateLimit-Remaining'), '0');
  assert.equal(
    response?.headers.get('X-RateLimit-Reset'),
    new Date(reset).toISOString()
  );
  assert.equal(response?.headers.get('Retry-After'), '5');

  Date.now = originalNow;
  restoreEnv();
});
