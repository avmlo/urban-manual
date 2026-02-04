-- Migration 301: Asimov Sync Trigger
-- Automatically sync new/updated destinations to Asimov

BEGIN;

-- Function to sync destination to Asimov (called via webhook/edge function)
-- Note: This is a placeholder - actual sync happens in Edge Function or background job
CREATE OR REPLACE FUNCTION notify_asimov_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- This trigger will call an Edge Function or webhook
  -- For now, we just log the change
  PERFORM pg_notify('asimov_sync', json_build_object(
    'id', NEW.id,
    'slug', NEW.slug,
    'name', NEW.name,
    'action', TG_OP
  )::text);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on destinations insert/update
DROP TRIGGER IF EXISTS trigger_asimov_sync ON destinations;
CREATE TRIGGER trigger_asimov_sync
  AFTER INSERT OR UPDATE ON destinations
  FOR EACH ROW
  WHEN (
    NEW.name IS NOT NULL AND 
    (NEW.description IS NOT NULL OR NEW.content IS NOT NULL)
  )
  EXECUTE FUNCTION notify_asimov_sync();

COMMENT ON FUNCTION notify_asimov_sync() IS 'Notifies Asimov sync service when destinations are created or updated';

COMMIT;
