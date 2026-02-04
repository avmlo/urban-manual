/**
 * Supabase Client Exports
 * 
 * Main entry point for Supabase clients.
 * Re-exports all client creation functions.
 */

// Client-side (browser)
export { createClient as createBrowserClient } from './client';

// Server-side
export { createServerClient, createServiceRoleClient } from './server';

// Middleware
export { createClient as createMiddlewareClient } from './middleware';

// Legacy exports for backward compatibility
export { createClient as createClientComponentClient } from './client';
export { createServerClient as createServerClientLegacy } from './server';

