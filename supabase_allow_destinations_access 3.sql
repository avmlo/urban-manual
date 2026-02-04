-- ============================================
-- ALLOW PUBLIC ACCESS TO DESTINATIONS TABLE
-- ============================================
-- Destinations are public data, so we allow anyone to read them
-- Only admins can write (which we'll do via service role key)
-- ============================================

-- Drop any existing restrictive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON destinations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON destinations;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON destinations;

-- Create policy to allow anyone to read destinations
CREATE POLICY "Public destinations are viewable by everyone"
ON destinations FOR SELECT
TO public
USING (true);

-- Create policy to allow service role to insert/update
CREATE POLICY "Service role can insert destinations"
ON destinations FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update destinations"
ON destinations FOR UPDATE
TO service_role
USING (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Destinations table is now publicly readable!';
  RAISE NOTICE '';
  RAISE NOTICE 'Anyone can read destinations (public data)';
  RAISE NOTICE 'Only service role can write (admin only)';
END $$;

