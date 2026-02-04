import { embedText } from '@/lib/llm';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function updateDestinationEmbeddingById(destinationId: string, text: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  if (!supabase) return false;
  const vector = await embedText(text);
  if (!vector) return false;
  const { error } = await supabase
    .from('destinations')
    .update({ vector_embedding: vector as unknown as any })
    .eq('id', destinationId);
  return !error;
}

export async function updateDestinationEmbeddingBySlug(slug: string, text: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  if (!supabase) return false;
  const vector = await embedText(text);
  if (!vector) return false;
  const { error } = await supabase
    .from('destinations')
    .update({ vector_embedding: vector as unknown as any })
    .eq('slug', slug);
  return !error;
}


