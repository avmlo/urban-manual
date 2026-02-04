/**
 * Rate Limiting Utility using Upstash Redis
 *
 * This implementation provides serverless rate limiting for API routes.
 *
 * Setup Instructions:
 * 1. Create an Upstash account at https://upstash.com
 * 2. Create a Redis database (free tier available)
 * 3. Add these environment variables to .env.local:
 *    UPSTASH_REDIS_REST_URL=your_url_here
 *    UPSTASH_REDIS_REST_TOKEN=your_token_here
 * 4. Install dependencies: npm install @upstash/ratelimit @upstash/redis
 *
 * Usage in API routes:
 *
 * import { ratelimit } from '@/lib/rate-limit';
 *
 * export async function POST(request: Request) {
 *   const identifier = getIdentifier(request); // IP or user ID
 *   const { success, limit, reset, remaining } = await ratelimit.limit(identifier);
 *
 *   if (!success) {
 *     return new Response('Rate limit exceeded', {
 *       status: 429,
 *       headers: {
 *         'X-RateLimit-Limit': limit.toString(),
 *         'X-RateLimit-Remaining': remaining.toString(),
 *         'X-RateLimit-Reset': new Date(reset).toISOString(),
 *       }
 *     });
 *   }
 *
 *   // Process request...
 * }
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create a Redis instance
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

/**
 * Rate limiters for different use cases
 */

// General API endpoints: 10 requests per 10 seconds
export const apiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
  prefix: "ratelimit:api",
});

// Conversation/AI endpoints: 5 requests per 10 seconds (more expensive)
export const conversationRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "10 s"),
  analytics: true,
  prefix: "ratelimit:conversation",
});

// Search endpoints: 20 requests per 10 seconds
export const searchRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "10 s"),
  analytics: true,
  prefix: "ratelimit:search",
});

// File upload endpoints: 3 requests per minute
export const uploadRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "60 s"),
  analytics: true,
  prefix: "ratelimit:upload",
});

// Authentication endpoints: 5 requests per minute
export const authRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
  prefix: "ratelimit:auth",
});

/**
 * Extract identifier for rate limiting
 * Priority: user ID > IP address > forwarded IP > fallback
 */
export function getIdentifier(request: Request, userId?: string | null): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Try to get IP from various headers (Vercel, Cloudflare, etc.)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  const ip = cfConnectingIp || realIp || forwarded?.split(",")?.[0] || "anonymous";
  return `ip:${ip}`;
}

/**
 * Create rate limit response with proper headers
 */
export function createRateLimitResponse(
  message: string,
  limit: number,
  remaining: number,
  reset: number
): Response {
  return new Response(
    JSON.stringify({
      error: message,
      rateLimitExceeded: true,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": new Date(reset).toISOString(),
        "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
      },
    }
  );
}

/**
 * Alternative: In-memory rate limiting (no Redis required)
 * Use this as a fallback if Upstash is not configured
 */
class MemoryRatelimit {
  private cache = new Map<string, { count: number; resetAt: number }>();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Clean up old entries every minute
    const interval = setInterval(() => this.cleanup(), 60000);
    if (typeof interval.unref === "function") {
      interval.unref();
    }
  }

  async limit(identifier: string) {
    const now = Date.now();
    const cached = this.cache.get(identifier);

    if (!cached || now > cached.resetAt) {
      // New window
      this.cache.set(identifier, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        reset: now + this.windowMs,
      };
    }

    // Existing window
    cached.count++;
    const success = cached.count <= this.maxRequests;

    return {
      success,
      limit: this.maxRequests,
      remaining: Math.max(0, this.maxRequests - cached.count),
      reset: cached.resetAt,
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.resetAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Fallback rate limiters (in-memory)
export const memoryApiRatelimit = new MemoryRatelimit(10, 10000);
export const memoryConversationRatelimit = new MemoryRatelimit(5, 10000);
export const memorySearchRatelimit = new MemoryRatelimit(20, 10000);
export const memoryUploadRatelimit = new MemoryRatelimit(3, 60000);
export const memoryAuthRatelimit = new MemoryRatelimit(5, 60000);

/**
 * Check if Upstash is configured
 */
export const isUpstashConfigured = () => {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
};

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

type RateLimiter = {
  limit: (identifier: string) => Promise<RateLimitResult>;
};

interface EnforceRateLimitOptions {
  request: Request;
  userId?: string | null;
  message: string;
  limiter: RateLimiter;
  memoryLimiter: RateLimiter;
}

/**
 * Shared helper to run the configured rate limiter and return
 * a properly formatted 429 response if the request exceeds the quota.
 */
export async function enforceRateLimit({
  request,
  userId,
  message,
  limiter,
  memoryLimiter,
}: EnforceRateLimitOptions): Promise<Response | null> {
  const identifier = getIdentifier(request, userId ?? undefined);
  const activeLimiter = isUpstashConfigured() ? limiter : memoryLimiter;
  const { success, limit, remaining, reset } = await activeLimiter.limit(
    identifier
  );

  if (!success) {
    return createRateLimitResponse(message, limit, remaining, reset);
  }

  return null;
}
