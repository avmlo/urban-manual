/**
 * Supabase Server-Side Clients (Legacy Export)
 * 
 * This file re-exports from the new lib/supabase/server.ts structure
 * for backward compatibility with existing code.
 * 
 * @deprecated New code should import directly from lib/supabase/server.ts
 */

// Re-export from new structure
export { createServerClient, createServiceRoleClient } from './supabase/server';

/**
 * Client component client (for backward compatibility)
 * @deprecated Use createBrowserClient from lib/supabase/client.ts
 */
export function createClientComponentClient() {
  // Re-export from new client structure
  const { createClient } = require('./supabase/client');
  return createClient();
}

