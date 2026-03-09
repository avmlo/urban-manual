import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enforceRateLimit } from '../../lib/rate-limit';

// Mock dependencies
const mockLimit = vi.fn();

// Mock the rate limiters
const mockLimiter = {
  limit: mockLimit,
};

describe('enforceRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when rate limit is not exceeded', async () => {
    mockLimit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 10000,
    });

    const request = new Request('http://localhost/api/test');

    const result = await enforceRateLimit({
      request,
      userId: 'user-123',
      message: 'Rate limit exceeded',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      limiter: mockLimiter as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      memoryLimiter: mockLimiter as any,
    });

    expect(result).toBeNull();
    expect(mockLimit).toHaveBeenCalledWith('user:user-123');
  });

  it('should return 429 response when rate limit is exceeded', async () => {
    mockLimit.mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 10000,
    });

    const request = new Request('http://localhost/api/test');

    const result = await enforceRateLimit({
      request,
      userId: 'user-123',
      message: 'Rate limit exceeded',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      limiter: mockLimiter as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      memoryLimiter: mockLimiter as any,
    });

    expect(result).not.toBeNull();
    expect(result?.status).toBe(429);
    const body = await result?.json();
    expect(body).toEqual({
      error: 'Rate limit exceeded',
      rateLimitExceeded: true,
    });
    expect(mockLimit).toHaveBeenCalledWith('user:user-123');
  });

  it('should use IP address as identifier when userId is not provided', async () => {
    mockLimit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 10000,
    });

    const request = new Request('http://localhost/api/test', {
      headers: {
        'x-forwarded-for': '127.0.0.1',
      },
    });

    await enforceRateLimit({
      request,
      userId: null,
      message: 'Rate limit exceeded',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      limiter: mockLimiter as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      memoryLimiter: mockLimiter as any,
    });

    // The getIdentifier implementation might vary, but it should contain the IP
    expect(mockLimit).toHaveBeenCalledWith(expect.stringContaining('ip:127.0.0.1'));
  });
});
