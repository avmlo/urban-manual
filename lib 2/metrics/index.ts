import { createClient } from '@supabase/supabase-js';

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
// Support both new (publishable/secret) and legacy (anon/service_role) key naming
const key = (
  process.env.SUPABASE_SECRET_KEY || 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) as string;
const supabase = createClient(url, key);

export type ContentMetricEvent =
  | 'click'
  | 'dwell'
  | 'scroll'
  | 'vector_failure'
  | 'vector_fallback';

export async function trackContentMetric(event: ContentMetricEvent, payload: any) {
  try {
    await supabase.from('content_metrics').insert({ event, payload, created_at: new Date().toISOString() });
  } catch {}
}


