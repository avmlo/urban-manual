/**
 * Unified API Middleware
 *
 * Composes error handling, rate limiting, authentication, and observability
 * into a single declarative wrapper for API route handlers.
 *
 * Usage:
 *   export const GET = withStandardApi({
 *     rateLimit: 'search',
 *     auth: 'optional',
 *   }, async (req, ctx) => {
 *     return createSuccessResponse({ data: 'hello' });
 *   });
 */

import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse, createSuccessResponse } from "@/lib/errors/handlers";
import { createValidationError } from "@/lib/errors/handlers";
import { CustomError, ErrorCode } from "@/lib/errors/types";
import { getUser, requireAuth, requireAdmin } from "@/lib/errors/auth";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  apiRatelimit,
  conversationRatelimit,
  searchRatelimit,
  uploadRatelimit,
  authRatelimit,
  adminRatelimit,
  proxyRatelimit,
  memoryApiRatelimit,
  memoryConversationRatelimit,
  memorySearchRatelimit,
  memoryUploadRatelimit,
  memoryAuthRatelimit,
  memoryAdminRatelimit,
  memoryProxyRatelimit,
  getIdentifier,
  isUpstashConfigured,
  createRateLimitResponse,
} from "@/lib/rate-limit";
import { recordApiCall } from "@/lib/observability/metrics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Predefined rate-limit tiers */
export type RateLimitTier =
  | "api"
  | "conversation"
  | "search"
  | "upload"
  | "auth"
  | "admin"
  | "proxy"
  | "none";

/** Auth level for the route */
export type AuthLevel = "none" | "optional" | "required" | "admin";

export interface StandardApiContext {
  user: User | null;
  serviceClient?: SupabaseClient;
}

export interface StandardApiOptions {
  /** Which rate-limit bucket to use. Defaults to "api". */
  rateLimit?: RateLimitTier;
  /** Authentication requirement. Defaults to "none". */
  auth?: AuthLevel;
  /** Human-readable name for observability. Falls back to the request path. */
  routeName?: string;
}

type HandlerFn = (
  req: NextRequest,
  ctx: StandardApiContext,
  params?: unknown
) => Promise<NextResponse>;

// ---------------------------------------------------------------------------
// Rate-limiter lookup
// ---------------------------------------------------------------------------

const rateLimiters: Record<
  Exclude<RateLimitTier, "none">,
  { primary: { limit: (id: string) => Promise<{ success: boolean; limit: number; remaining: number; reset: number }> }; fallback: { limit: (id: string) => Promise<{ success: boolean; limit: number; remaining: number; reset: number }> }; message: string }
> = {
  api: {
    primary: apiRatelimit,
    fallback: memoryApiRatelimit,
    message: "Too many requests. Please try again later.",
  },
  conversation: {
    primary: conversationRatelimit,
    fallback: memoryConversationRatelimit,
    message: "Too many AI requests. Please wait a moment.",
  },
  search: {
    primary: searchRatelimit,
    fallback: memorySearchRatelimit,
    message: "Too many search requests. Please slow down.",
  },
  upload: {
    primary: uploadRatelimit,
    fallback: memoryUploadRatelimit,
    message: "Upload limit reached. Please wait before uploading again.",
  },
  auth: {
    primary: authRatelimit,
    fallback: memoryAuthRatelimit,
    message: "Too many authentication attempts. Please try again later.",
  },
  admin: {
    primary: adminRatelimit,
    fallback: memoryAdminRatelimit,
    message: "Admin rate limit exceeded.",
  },
  proxy: {
    primary: proxyRatelimit,
    fallback: memoryProxyRatelimit,
    message: "External API rate limit reached. Please try again later.",
  },
};

// ---------------------------------------------------------------------------
// Core middleware
// ---------------------------------------------------------------------------

/**
 * Unified API route wrapper.
 *
 * Provides:
 * 1. Structured error handling (catches all errors, returns standard shape)
 * 2. Rate limiting (configurable tier)
 * 3. Authentication (none | optional | required | admin)
 * 4. Observability (latency tracking, error reporting)
 */
export function withStandardApi(
  options: StandardApiOptions,
  handler: HandlerFn
) {
  const {
    rateLimit: rateLimitTier = "api",
    auth: authLevel = "none",
    routeName,
  } = options;

  return async (req: NextRequest, params?: unknown): Promise<NextResponse> => {
    const start = Date.now();
    const route = routeName ?? req.nextUrl.pathname;

    try {
      // ---------------------------------------------------------------
      // 1. Rate limiting
      // ---------------------------------------------------------------
      if (rateLimitTier !== "none") {
        const config = rateLimiters[rateLimitTier];
        const identifier = getIdentifier(req);
        const limiter = isUpstashConfigured()
          ? config.primary
          : config.fallback;
        const { success, limit, remaining, reset } =
          await limiter.limit(identifier);

        if (!success) {
          recordApiCall(route, 429, Date.now() - start);
          return createRateLimitResponse(
            config.message,
            limit,
            remaining,
            reset
          );
        }
      }

      // ---------------------------------------------------------------
      // 2. Authentication
      // ---------------------------------------------------------------
      let ctx: StandardApiContext = { user: null };

      switch (authLevel) {
        case "optional":
          ctx.user = await getUser(req);
          break;
        case "required": {
          const user = await requireAuth(req);
          ctx = { user };
          break;
        }
        case "admin": {
          const { user, serviceClient } = await requireAdmin(req);
          ctx = { user, serviceClient };
          break;
        }
        case "none":
        default:
          break;
      }

      // ---------------------------------------------------------------
      // 3. Execute handler
      // ---------------------------------------------------------------
      const response = await handler(req, ctx, params);

      recordApiCall(route, response.status, Date.now() - start);
      return response;
    } catch (error) {
      const latency = Date.now() - start;

      // Handle known errors
      if (error instanceof CustomError) {
        recordApiCall(route, error.statusCode, latency, true);
        return createErrorResponse(error);
      }

      // Supabase-style errors (have .code)
      if (error && typeof error === "object" && "code" in error) {
        const { handleSupabaseError } = await import("@/lib/errors/handlers");
        const mapped = handleSupabaseError(error);
        recordApiCall(route, mapped.statusCode, latency, true);
        return createErrorResponse(mapped);
      }

      // Unknown errors
      console.error(`[API Error] ${route}:`, error);
      recordApiCall(route, 500, latency, true);
      return createErrorResponse(error);
    }
  };
}

// Re-export helpers so routes only need one import
export { createSuccessResponse, createValidationError } from "@/lib/errors/handlers";
export { createNotFoundError, createUnauthorizedError, createRateLimitError } from "@/lib/errors/handlers";
