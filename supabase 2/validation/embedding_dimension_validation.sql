-- Embedding Dimension Health Checks
-- Run BEFORE the migration to ensure no rows already exceed/violate expectations
SELECT * FROM validate_embedding_dimensions(3072);

-- Optionally view counts per table
SELECT 'destinations' AS table_name, COUNT(*) FILTER (WHERE embedding IS NULL) AS null_vectors,
       COUNT(*) FILTER (WHERE embedding IS NOT NULL) AS populated_vectors
FROM destinations;

-- Run AFTER the migration + re-embedding to confirm all rows comply
SELECT * FROM validate_embedding_dimensions(3072);
