/**
 * Legacy Supabase Client Export
 * 
 * This file maintains backward compatibility with existing code.
 * New code should use lib/supabase/client.ts or lib/supabase/server.ts
 * 
 * @deprecated Use createBrowserClient from lib/supabase/client.ts instead
 */

import { createClient as createBrowserClient } from './supabase/client';

// Create a singleton client for backward compatibility
// Note: This is not ideal for SSR, but maintains compatibility
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

function getSupabase() {
  if (typeof window === 'undefined') {
    // Server-side: return a dummy client to prevent crashes
    // Server code should use createServerClient from lib/supabase/server.ts
    if (!supabaseInstance) {
      supabaseInstance = createBrowserClient();
    }
    return supabaseInstance;
  }
  
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient();
  }
  
  return supabaseInstance;
}

// Export singleton for backward compatibility
// This maintains the existing `import { supabase } from '@/lib/supabase'` pattern
export const supabase = getSupabase()!;
