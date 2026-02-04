import { embedText } from '@/lib/llm';
import { trackContentMetric } from '@/lib/metrics';
import { createClient } from '@supabase/supabase-js';

export type SemanticSearchFilters = {
  city?: string;
  category?: string;
  open_now?: boolean;
};

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
// Support both new (publishable/secret) and legacy (anon/service_role) key naming
const key = (
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) as string;
const supabase = createClient(url, key);
const SEMANTIC_SEARCH_RPC = process.env.NEXT_PUBLIC_SEMANTIC_SEARCH_RPC || 'search_destinations_intelligent';

type SemanticSearchDependencies = {
  embed: typeof embedText;
  supabaseClient: typeof supabase;
  metricTracker: typeof trackContentMetric;
};

const defaultDeps: SemanticSearchDependencies = {
  embed: embedText,
  supabaseClient: supabase,
  metricTracker: trackContentMetric,
};

export function createSemanticBlendSearch(
  deps: Partial<SemanticSearchDependencies> = {}
) {
  const resolved: SemanticSearchDependencies = { ...defaultDeps, ...deps };

  return async function semanticBlendSearch(
    query: string,
    filters: SemanticSearchFilters = {}
  ) {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    const embedding = await resolved.embed(trimmedQuery);
    const vector = embedding ? Array.from(embedding) : null;

    if (!vector) {
      await logVectorMetric(
        'vector_failure',
        { query: trimmedQuery, reason: 'embedding_unavailable' },
        resolved.metricTracker
      );
      return fallbackSearch(trimmedQuery, filters, resolved);
    }

    try {
      const rpcResults = await runSemanticRpc(vector, filters, resolved);
      if (rpcResults.length > 0) {
        return rpcResults;
      }

      await logVectorMetric(
        'vector_failure',
        { query: trimmedQuery, reason: 'empty_rpc_results' },
        resolved.metricTracker
      );
    } catch (error: any) {
      console.error('[SemanticSearch] Hybrid RPC error:', error);
      await logVectorMetric(
        'vector_failure',
        { query: trimmedQuery, reason: error?.message || 'rpc_error' },
        resolved.metricTracker
      );
      return fallbackSearch(trimmedQuery, filters, resolved);
    }

    return fallbackSearch(trimmedQuery, filters, resolved);
  };
}

export const semanticBlendSearch = createSemanticBlendSearch();

async function runSemanticRpc(
  embedding: number[],
  filters: SemanticSearchFilters,
  deps: SemanticSearchDependencies
) {
  const params: Record<string, any> = {
    query_embedding: `[${embedding.join(',')}]`,
    user_id_param: null,
    limit_count: 20,
    city_filter: filters.city || null,
    category_filter: filters.category || null,
  };

  if (SEMANTIC_SEARCH_RPC === 'search_destinations_intelligent') {
    params.open_now_filter = filters.open_now ?? false;
  }

  const { data, error } = await deps.supabaseClient.rpc(SEMANTIC_SEARCH_RPC, params);

  if (error) {
    throw error;
  }

  let normalized = normalizeResults(data || []);

  if (SEMANTIC_SEARCH_RPC !== 'search_destinations_intelligent' && filters.open_now) {
    normalized = normalized.filter((result) => result.is_open_now);
  }

  return normalized;
}

async function fallbackSearch(
  query: string,
  filters: SemanticSearchFilters,
  deps: SemanticSearchDependencies
) {
  // Direct fallback to keyword search (Asimov integration removed)
  const keywordResults = await keywordFallbackSearch(query, filters, deps.supabaseClient);
  await logVectorMetric(
    'vector_fallback',
    { query, strategy: 'keyword', count: keywordResults.length },
    deps.metricTracker
  );
  return normalizeResults(keywordResults);
}


async function keywordFallbackSearch(
  query: string,
  filters: SemanticSearchFilters,
  client: typeof supabase
) {
  try {
    let keywordQuery = client
      .from('destinations')
      .select('id, slug, name, city, category, description, content, image, rating, price_level, michelin_stars, is_open_now')
      .limit(20);

    if (filters.city) {
      keywordQuery = keywordQuery.ilike('city', `%${filters.city}%`);
    }

    if (filters.category) {
      keywordQuery = keywordQuery.ilike('category', `%${filters.category}%`);
    }

    if (filters.open_now) {
      keywordQuery = keywordQuery.eq('is_open_now', true);
    }

    keywordQuery = keywordQuery.or(
      `name.ilike.%${query}%,description.ilike.%${query}%,content.ilike.%${query}%`
    );

    const { data } = await keywordQuery;
    return data || [];
  } catch (error) {
    console.error('[SemanticSearch] Keyword fallback error:', error);
    return [];
  }
}

function normalizeResults(data: any[]) {
  return (data || []).map((row: any) => ({
    ...row,
    image: row.image ?? row.image_url ?? row.main_image ?? null,
    similarity: row.similarity ?? row.similarity_score ?? null,
    final_score: row.final_score ?? row.rank_score ?? row.similarity ?? null,
    content: row.content ?? row.description ?? null,
  }));
}

async function logVectorMetric(
  event: 'vector_failure' | 'vector_fallback',
  payload: Record<string, any>,
  tracker: typeof trackContentMetric
) {
  try {
    await tracker(event, {
      source: 'semanticBlendSearch',
      ...payload,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[SemanticSearch] Unable to log vector metric:', error);
  }
}
