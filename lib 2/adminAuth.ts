import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Don't throw during module initialization - throw when actually used instead
function requireSupabaseConfig() {
  if (!SUPABASE_URL || SUPABASE_URL.includes('placeholder') || SUPABASE_URL.includes('invalid')) {
    throw new Error('Supabase URL is not configured. Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.');
  }

  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('placeholder') || SUPABASE_ANON_KEY.includes('invalid')) {
    throw new Error('Supabase anon key is not configured. Set SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
}

export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getBearerToken(request: Request): string {
  const header = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    throw new AuthError('Unauthorized', 401);
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    throw new AuthError('Unauthorized', 401);
  }
  return token;
}

export async function getUserFromRequest(request: Request): Promise<{ user: User; supabase: SupabaseClient }> {
  requireSupabaseConfig(); // Check config when actually used
  
  const token = getBearerToken(request);

  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthError('Unauthorized', 401);
  }

  return { user, supabase };
}

export async function requireAdmin(request: Request): Promise<{
  user: User;
  serviceClient: SupabaseClient;
}> {
  requireSupabaseConfig(); // Check config when actually used
  
  const { user } = await getUserFromRequest(request);

  const role = (user.app_metadata as Record<string, any> | null)?.role;
  if (role !== 'admin') {
    throw new AuthError('Forbidden', 403);
  }

  if (!SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY.includes('placeholder') || SUPABASE_SERVICE_ROLE_KEY.includes('invalid')) {
    throw new Error('Supabase service role key is not configured. Set SUPABASE_SERVICE_ROLE_KEY.');
  }

  const serviceClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY);

  return { user, serviceClient };
}
