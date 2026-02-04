import OpenAI from "openai";
import { createServerClient } from "@/lib/supabase-server";

const client = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export async function embedCandidates() {
  try {
    const supabase = await createServerClient();
    
    const { data: candidates, error } = await supabase
      .from("discovery_candidates")
      .select("id, name, category, city, image_url")
      .is("embedding", null)
      .limit(50);

    if (error) {
      console.error('[Embed Candidates] Error fetching candidates:', error);
      return;
    }

    if (!candidates || candidates.length === 0) {
      console.log('[Embed Candidates] No candidates to embed');
      return;
    }

    console.log(`[Embed Candidates] Embedding ${candidates.length} candidates...`);

    for (const c of candidates) {
      try {
        const text = `${c.name}, ${c.category}, ${c.city}`;
        
        const embeddingResponse = await client.embeddings.create({
          model: "text-embedding-3-large",
          input: text,
        });

        const embedding = embeddingResponse.data[0].embedding;

        const { error: updateError } = await supabase
          .from("discovery_candidates")
          .update({ embedding })
          .eq("id", c.id);

        if (updateError) {
          console.error(`[Embed Candidates] Error updating candidate ${c.id}:`, updateError);
        } else {
          console.log(`[Embed Candidates] Embedded candidate: ${c.name}`);
        }
      } catch (error: any) {
        console.error(`[Embed Candidates] Error embedding candidate ${c.id}:`, error);
        continue;
      }
    }

    console.log(`[Embed Candidates] Completed embedding ${candidates.length} candidates`);
  } catch (error: any) {
    console.error('[Embed Candidates] Unexpected error:', error);
    throw error;
  }
}

