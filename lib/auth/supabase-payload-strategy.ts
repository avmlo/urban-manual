import type { AuthStrategyFunction } from "payload";
import { createClient } from "@supabase/supabase-js";

/**
 * Custom Payload CMS auth strategy that delegates to Supabase Auth.
 *
 * Flow:
 * 1. Extract Supabase access token from request cookies
 * 2. Verify token via Supabase `auth.getUser()`
 * 3. Check that user has `role: 'admin'` in `app_metadata`
 * 4. Find or create a corresponding record in Payload's `admins` collection
 * 5. Return authenticated user to Payload
 */
export const supabaseAuthStrategy: AuthStrategyFunction = async ({
  headers,
  payload,
}) => {
  try {
    const cookieHeader = headers.get("cookie");
    if (!cookieHeader) return { user: null };

    const accessToken = extractSupabaseToken(cookieHeader);
    if (!accessToken) return { user: null };

    // Verify token with Supabase
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const supabaseServiceKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return { user: null };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user: supabaseUser },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !supabaseUser) return { user: null };

    // Check admin role
    const role = (supabaseUser.app_metadata as Record<string, unknown>)?.role;
    if (role !== "admin") return { user: null };

    // Find or create corresponding Payload admin record
    const existing = await payload.find({
      collection: "admins",
      where: { supabaseId: { equals: supabaseUser.id } },
      limit: 1,
      overrideAccess: true,
    });

    let payloadUser;

    if (existing.docs.length > 0) {
      payloadUser = existing.docs[0];
    } else {
      // Auto-create admin record for this Supabase admin user
      payloadUser = await payload.create({
        collection: "admins",
        data: {
          email: supabaseUser.email || "",
          supabaseId: supabaseUser.id,
          name:
            (supabaseUser.user_metadata as Record<string, unknown>)
              ?.full_name ||
            supabaseUser.email ||
            "",
          role: "admin",
        },
        overrideAccess: true,
      });
    }

    return {
      user: {
        ...payloadUser,
        collection: "admins",
        _strategy: "supabase",
      },
    };
  } catch (err) {
    payload.logger?.error({ err }, "Supabase auth strategy error");
    return { user: null };
  }
};

/**
 * Extract Supabase access token from cookie header.
 *
 * Supabase SSR stores auth in chunked cookies:
 *   sb-<ref>-auth-token.0, sb-<ref>-auth-token.1, ...
 * or a single sb-<ref>-auth-token cookie.
 *
 * The value is a base64-encoded JSON: { access_token, refresh_token, ... }
 */
function extractSupabaseToken(cookieHeader: string): string | null {
  const cookies = parseCookies(cookieHeader);

  // Find the Supabase auth cookie(s)
  // Pattern: sb-<project-ref>-auth-token or sb-<project-ref>-auth-token.0
  const authCookiePrefix = Object.keys(cookies).find(
    (key) => key.includes("-auth-token") && !key.includes(".")
  );

  if (authCookiePrefix && cookies[authCookiePrefix]) {
    // Single cookie (not chunked)
    return parseAccessToken(cookies[authCookiePrefix]);
  }

  // Try chunked cookies
  const chunkPrefix = Object.keys(cookies).find(
    (key) => key.includes("-auth-token.0")
  );

  if (!chunkPrefix) return null;

  const baseName = chunkPrefix.replace(".0", "");
  let combined = "";
  let i = 0;
  while (cookies[`${baseName}.${i}`]) {
    combined += cookies[`${baseName}.${i}`];
    i++;
  }

  if (!combined) return null;
  return parseAccessToken(combined);
}

function parseAccessToken(cookieValue: string): string | null {
  try {
    // Cookie value might be URL-encoded base64 JSON
    const decoded = decodeURIComponent(cookieValue);
    const parsed = JSON.parse(
      decoded.startsWith("base64-")
        ? Buffer.from(decoded.slice(7), "base64").toString()
        : decoded
    );
    return parsed.access_token || null;
  } catch {
    // Might be a raw JWT
    if (cookieValue.split(".").length === 3) {
      return cookieValue;
    }
    return null;
  }
}

function parseCookies(header: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of header.split(";")) {
    const [rawKey, ...rawVal] = part.split("=");
    const key = rawKey?.trim();
    const val = rawVal.join("=").trim();
    if (key) result[key] = val;
  }
  return result;
}
