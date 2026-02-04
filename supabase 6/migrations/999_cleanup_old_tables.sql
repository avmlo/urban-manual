-- Migration 999: Clean Up Old Tables (Run After Full Validation)
-- DANGER: Only run after complete validation
-- This is irreversible without backups

BEGIN;

DO $$

BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CLEANUP MIGRATION - OLD TABLES';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'This will drop saved_destinations and visited_destinations tables.';
  RAISE NOTICE 'Make sure you have backups and have validated the new schema works.';
  RAISE NOTICE '========================================';

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_destinations') THEN
    RAISE NOTICE 'Dropping saved_destinations table...';
    DROP TABLE saved_destinations CASCADE;
    RAISE NOTICE '✓ saved_destinations dropped';
  ELSE
    RAISE NOTICE 'saved_destinations table does not exist';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visited_destinations') THEN
    RAISE NOTICE 'Dropping visited_destinations table...';
    DROP TABLE visited_destinations CASCADE;
    RAISE NOTICE '✓ visited_destinations dropped';
  ELSE
    RAISE NOTICE 'visited_destinations table does not exist';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Cleanup complete';
  RAISE NOTICE '========================================';

END $$;

COMMIT;

