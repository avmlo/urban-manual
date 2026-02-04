-- ============================================
-- RE-ENABLE RLS AFTER IMPORT
-- ============================================
-- Run this AFTER importing data successfully
-- ============================================

-- Re-enable RLS on destinations table
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Public destinations are viewable by everyone" ON destinations;
DROP POLICY IF EXISTS "Service role can insert destinations" ON destinations;
DROP POLICY IF EXISTS "Service role can update destinations" ON destinations;

-- Create policy to allow anyone to read destinations (public data)
CREATE POLICY "Anyone can view destinations"
ON destinations FOR SELECT
TO public
USING (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS re-enabled on destinations table';
  RAISE NOTICE '';
  RAISE NOTICE 'Destinations are now:';
  RAISE NOTICE '- Publicly readable (anyone can view)';
  RAISE NOTICE '- Protected from unauthorized writes';
  RAISE NOTICE '';
  RAISE NOTICE 'All done! Your database is secure and ready to use.';
END $$;

