/**
 * Upstash Vector Client Wrapper
 * 
 * Provides a typed interface for vector search operations.
 * Uses OpenAI text-embedding-3-large (1536 dimensions) for embeddings.
 */

import { Index } from '@upstash/vector';

// Vector dimension for OpenAI text-embedding-3-large
export const VECTOR_DIMENSION = 1536;

// Metadata structure for destinations
export interface DestinationMetadata {
  destination_id: number;
  name: string;
  city: string;
  country?: string;
  category?: string;
  price_range?: string;
  popularity_score?: number;
  michelin_stars?: number;
  slug?: string;
  [key: string]: string | number | undefined; // Index signature for Dict compatibility
}

// Vector search result
export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: DestinationMetadata;
}

/**
 * Check if Upstash Vector is configured
 */
export function isVectorConfigured(): boolean {
  return !!(
    process.env.UPSTASH_VECTOR_REST_URL &&
    process.env.UPSTASH_VECTOR_REST_TOKEN
  );
}

/**
 * Get the Upstash Vector index instance
 * Returns null if credentials are not configured
 */
export function getVectorIndex(): Index<DestinationMetadata> | null {
  const url = process.env.UPSTASH_VECTOR_REST_URL;
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      'Upstash Vector credentials not configured. Vector search features will be disabled.'
    );
    return null;
  }

  return new Index<DestinationMetadata>({
    url,
    token,
  });
}

/**
 * Upsert a destination embedding to the vector index
 */
export async function upsertDestinationEmbedding(
  destinationId: number,
  embedding: number[],
  metadata: DestinationMetadata
): Promise<void> {
  const index = getVectorIndex();

  if (!index) {
    console.warn('Vector index not configured, skipping upsert');
    return;
  }

  await index.upsert({
    id: `dest-${destinationId}`,
    vector: embedding,
    metadata,
  });
}

/**
 * Batch upsert destination embeddings
 */
export async function batchUpsertDestinationEmbeddings(
  items: Array<{
    destinationId: number;
    embedding: number[];
    metadata: DestinationMetadata;
  }>
): Promise<void> {
  const index = getVectorIndex();

  if (!index) {
    console.warn('Vector index not configured, skipping batch upsert');
    return;
  }

  await index.upsert(
    items.map(item => ({
      id: `dest-${item.destinationId}`,
      vector: item.embedding,
      metadata: item.metadata,
    }))
  );
}

/**
 * Query the vector index for similar destinations
 */
export async function queryVectorIndex(
  queryEmbedding: number[],
  options: {
    topK?: number;
    filter?: string;
    includeMetadata?: boolean;
  } = {}
): Promise<VectorSearchResult[]> {
  const index = getVectorIndex();

  if (!index) {
    console.warn('Vector index not configured, returning empty results');
    return [];
  }

  const result = await index.query({
    vector: queryEmbedding,
    topK: options.topK ?? 10,
    filter: options.filter,
    includeMetadata: options.includeMetadata ?? true,
  });

  return result.map(item => ({
    id: String(item.id),
    score: item.score,
    metadata: item.metadata as DestinationMetadata,
  }));
}

/**
 * Delete a destination from the vector index
 */
export async function deleteDestinationEmbedding(destinationId: number): Promise<void> {
  const index = getVectorIndex();

  if (!index) {
    console.warn('Vector index not configured, skipping delete');
    return;
  }

  await index.delete(`dest-${destinationId}`);
}

/**
 * Get index info and statistics
 */
export async function getIndexInfo() {
  const index = getVectorIndex();

  if (!index) {
    return {
      vectorCount: 0,
      pendingVectorCount: 0,
      dimension: VECTOR_DIMENSION,
      status: 'not_configured' as const,
    };
  }

  return await index.info();
}
