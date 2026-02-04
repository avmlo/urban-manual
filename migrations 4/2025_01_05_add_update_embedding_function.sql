-- Helper function to update destination embedding and search_text
-- This is needed because Supabase client doesn't easily support vector column updates
-- Accepts embedding as text (e.g., '[1.0,2.0,3.0,...]') and converts to vector type

CREATE OR REPLACE FUNCTION update_destination_embedding(
  p_slug text,
  p_embedding text,  -- Accept as text, convert to vector
  p_search_text text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE destinations
  SET
    embedding = p_embedding::vector,  -- Cast text to vector type
    search_text = p_search_text
  WHERE slug = p_slug;
END;
$$;
