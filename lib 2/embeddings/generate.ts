import { embedText } from '@/lib/llm';

/**
 * Generate embedding for a destination using OpenAI text-embedding-3-large
 * Combines all destination fields into a single text for embedding
 */
export async function generateDestinationEmbedding(destination: {
  name: string;
  city: string;
  category: string;
  content?: string;
  description?: string;
  tags?: string[];
}): Promise<number[]> {
  // Combine all text fields into a single embedding text
  const embeddingText = [
    destination.name,
    destination.city,
    destination.category,
    destination.content || destination.description || '',
    destination.tags?.join(' ') || ''
  ]
    .filter(Boolean)
    .join(' ');

  // Use the embedText utility from llm.ts (which uses OPENAI_EMBEDDING_MODEL)
  const embedding = await embedText(embeddingText);
  
  if (!embedding) {
    throw new Error('Failed to generate embedding');
  }

  return embedding;
}

