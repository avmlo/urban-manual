/**
 * Supabase Client-Side Client
 * 
 * For use in Client Components only.
 * Handles authentication, session persistence, and RLS.
 */

import { createBrowserClient } from '@supabase/ssr';
import { validateSupabaseUrl, validateSupabaseAnonKey, formatValidationErrors } from './validation';

/**
 * Get Supabase URL from environment variables
 * Supports both NEXT_PUBLIC_ and non-prefixed variants
 */
function getSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  );
}

/**
 * Get Supabase anon/publishable key from environment variables
 * Supports both new (publishable) and legacy (anon) key names
 */
function getSupabaseKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  );
}

/**
 * Validate Supabase configuration with strict checks
 */
function validateConfig(url: string, key: string): { valid: boolean; errors: string[] } {
  const urlValidation = validateSupabaseUrl(url);
  const keyValidation = validateSupabaseAnonKey(key);
  
  const allErrors = [...urlValidation.errors, ...keyValidation.errors];
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Create Supabase browser client
 * This is the main client for client-side components
 * 
 * @param options - Optional configuration
 * @param options.skipValidation - Skip strict validation (use with caution)
 * 
 * @throws {Error} In production if configuration is invalid
 */
export function createClient(options?: { skipValidation?: boolean }) {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();

  // Skip validation if requested (for admin pages that need to work even with strict validation)
  const validation = options?.skipValidation ? { valid: true, errors: [] } : validateConfig(url, key);

  if (!validation.valid) {
    const errorMessage = formatValidationErrors(validation.errors);
    
    // Check if we're in a browser context (runtime) vs build time
    const isRuntime = typeof window !== 'undefined';
    const isProduction = process.env.NODE_ENV === 'production';
    
    // If skipValidation is true, still try to use the actual URL/key even if validation fails
    // This allows admin pages to work even if validation is too strict
    if (options?.skipValidation && url && key && !url.includes('placeholder') && !key.includes('placeholder')) {
      console.warn('[Supabase Client] Validation skipped, using provided URL/key');
      return createBrowserClient(url, key, {
        cookies: {
          getAll() {
            // Check if we're in a browser environment
            if (typeof window === 'undefined' || typeof document === 'undefined') {
              return [];
            }
            return document.cookie.split('; ').map(cookie => {
              const [name, ...rest] = cookie.split('=');
              return { name, value: rest.join('=') };
            });
          },
          setAll(cookiesToSet) {
            // Check if we're in a browser environment
            if (typeof window === 'undefined' || typeof document === 'undefined') {
              return;
            }
            cookiesToSet.forEach(({ name, value, options }) => {
              document.cookie = `${name}=${value}; path=${options?.path || '/'}; ${
                options?.maxAge ? `max-age=${options.maxAge};` : ''
              } ${options?.domain ? `domain=${options.domain};` : ''} ${
                options?.sameSite ? `samesite=${options.sameSite};` : ''
              } ${options?.secure ? 'secure;' : ''}`;
            });
          },
        },
      });
    }
    
    // Log error in all environments, but don't throw
    // This allows the app to continue running with a placeholder client
    // The placeholder client will fail gracefully when actually used
    if (isRuntime) {
      if (isProduction) {
        console.error('[Supabase Client] Configuration Validation Failed (production):');
        console.error(errorMessage);
        console.warn('[Supabase Client] Using placeholder client. Supabase features will not work until configuration is fixed.');
      } else {
        console.error('[Supabase Client] Configuration Validation Failed:');
        console.error(errorMessage);
        console.warn('[Supabase Client] Using placeholder client. Fix configuration to enable Supabase features.');
      }
    }

    // Return placeholder client (allows app to continue, but Supabase calls will fail)
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll() {
            // No-op
          },
        },
      }
    );
  }

  return createBrowserClient(url, key, {
    cookies: {
      getAll() {
        // Check if we're in a browser environment
        if (typeof window === 'undefined' || typeof document === 'undefined') {
          return [];
        }
        return document.cookie.split('; ').map(cookie => {
          const [name, ...rest] = cookie.split('=');
          return { name, value: rest.join('=') };
        });
      },
      setAll(cookiesToSet) {
        // Check if we're in a browser environment
        if (typeof window === 'undefined' || typeof document === 'undefined') {
          return;
        }
        cookiesToSet.forEach(({ name, value, options }) => {
          document.cookie = `${name}=${value}; path=${options?.path || '/'}; ${
            options?.maxAge ? `max-age=${options.maxAge};` : ''
          } ${options?.domain ? `domain=${options.domain};` : ''} ${
            options?.sameSite ? `samesite=${options.sameSite};` : ''
          } ${options?.secure ? 'secure;' : ''}`;
        });
      },
    },
  });
}

