import { createServerClient } from '@/lib/supabase-server';

export type Context = Awaited<ReturnType<typeof createContext>>;

export async function createContext() {
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  return {
    supabase,
    userId: session?.user?.id || null,
  };
}

