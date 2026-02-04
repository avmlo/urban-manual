-- Migration: Ensure all places starting with "apple" or "aesop"/"aēsop" are categorized as Shopping (retail stores)
-- This applies to both new and existing destinations

-- 1. Update existing destinations that start with "apple" or "aesop"/"aēsop" (case-insensitive)
UPDATE destinations
SET category = 'Shopping'
WHERE (LOWER(name) LIKE 'apple%' OR LOWER(name) LIKE 'aesop%' OR LOWER(name) LIKE 'aēsop%')
  AND category != 'Shopping';

-- 2. Create trigger function to automatically set category for retail stores
CREATE OR REPLACE FUNCTION ensure_retail_stores_are_shopping()
RETURNS TRIGGER AS $$
BEGIN
  -- If name starts with "apple" or "aesop"/"aēsop" (case-insensitive), set category to Shopping
  IF LOWER(NEW.name) LIKE 'apple%' OR LOWER(NEW.name) LIKE 'aesop%' OR LOWER(NEW.name) LIKE 'aēsop%' THEN
    NEW.category := 'Shopping';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger to run before insert or update
DROP TRIGGER IF EXISTS trigger_ensure_retail_stores_are_shopping ON destinations;
CREATE TRIGGER trigger_ensure_retail_stores_are_shopping
  BEFORE INSERT OR UPDATE ON destinations
  FOR EACH ROW
  EXECUTE FUNCTION ensure_retail_stores_are_shopping();

-- Success message
SELECT 'Migration completed! All Apple and Aesop stores are now categorized as Shopping.' as status;

