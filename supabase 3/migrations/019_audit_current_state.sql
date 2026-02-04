-- Migration 019: Audit Current State
-- Run this first to see what tables actually exist in Supabase

DO $$

BEGIN
  RAISE NOTICE '=== SCHEMA AUDIT ===';
  RAISE NOTICE 'Running at: %', NOW();
  RAISE NOTICE '';

  -- Check saved_places
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_places') THEN
    RAISE NOTICE '✓ saved_places EXISTS';
    RAISE NOTICE '  - Rows: %', (SELECT COUNT(*) FROM saved_places);
    RAISE NOTICE '  - Columns: %', (
      SELECT STRING_AGG(column_name, ', ' ORDER BY ordinal_position)
      FROM information_schema.columns 
      WHERE table_name = 'saved_places'
    );
  ELSE
    RAISE NOTICE '✗ saved_places DOES NOT EXIST';
  END IF;

  RAISE NOTICE '';

  -- Check saved_destinations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_destinations') THEN
    RAISE NOTICE '✓ saved_destinations EXISTS';
    RAISE NOTICE '  - Rows: %', (SELECT COUNT(*) FROM saved_destinations);
    RAISE NOTICE '  - Columns: %', (
      SELECT STRING_AGG(column_name, ', ' ORDER BY ordinal_position)
      FROM information_schema.columns 
      WHERE table_name = 'saved_destinations'
    );
  ELSE
    RAISE NOTICE '✗ saved_destinations DOES NOT EXIST';
  END IF;

  RAISE NOTICE '';

  -- Check visited_places
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visited_places') THEN
    RAISE NOTICE '✓ visited_places EXISTS';
    RAISE NOTICE '  - Rows: %', (SELECT COUNT(*) FROM visited_places);
    RAISE NOTICE '  - Columns: %', (
      SELECT STRING_AGG(column_name, ', ' ORDER BY ordinal_position)
      FROM information_schema.columns 
      WHERE table_name = 'visited_places'
    );
  ELSE
    RAISE NOTICE '✗ visited_places DOES NOT EXIST';
  END IF;

  RAISE NOTICE '';

  -- Check visited_destinations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visited_destinations') THEN
    RAISE NOTICE '✓ visited_destinations EXISTS';
    RAISE NOTICE '  - Rows: %', (SELECT COUNT(*) FROM visited_destinations);
    RAISE NOTICE '  - Columns: %', (
      SELECT STRING_AGG(column_name, ', ' ORDER BY ordinal_position)
      FROM information_schema.columns 
      WHERE table_name = 'visited_destinations'
    );
  ELSE
    RAISE NOTICE '✗ visited_destinations DOES NOT EXIST';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=== END AUDIT ===';

END $$;

