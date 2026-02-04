-- ============================================
-- TEMPORARILY DISABLE RLS FOR IMPORT
-- ============================================
-- Run this BEFORE importing data
-- Then re-enable RLS after import is complete
-- ============================================

-- Temporarily disable RLS on destinations table
ALTER TABLE destinations DISABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS temporarily disabled on destinations table';
  RAISE NOTICE '';
  RAISE NOTICE 'Now run: node import_destinations_to_supabase.js';
  RAISE NOTICE '';
  RAISE NOTICE 'After import, run supabase_enable_rls.sql to re-enable RLS';
END $$;

