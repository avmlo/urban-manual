-- Migration: Consolidate architect, interior_designer, and design_firm text columns
-- into a single column renamed from "architect" to "design_firm".
--
-- Steps:
-- 1. Merge interior_designer and design_firm data into architect (comma-separated, no duplicates)
-- 2. Drop interior_designer and design_firm text columns
-- 3. Rename architect column to design_firm

-- Step 1a: Merge interior_designer into architect where architect is empty but interior_designer has data
UPDATE destinations
SET architect = interior_designer
WHERE (architect IS NULL OR architect = '')
  AND interior_designer IS NOT NULL
  AND interior_designer != '';

-- Step 1b: Append interior_designer to architect where both have data and they differ
UPDATE destinations
SET architect = architect || ', ' || interior_designer
WHERE architect IS NOT NULL AND architect != ''
  AND interior_designer IS NOT NULL AND interior_designer != ''
  AND architect NOT ILIKE '%' || interior_designer || '%';

-- Step 1c: Merge design_firm into architect where architect is empty but design_firm has data
UPDATE destinations
SET architect = design_firm
WHERE (architect IS NULL OR architect = '')
  AND design_firm IS NOT NULL
  AND design_firm != '';

-- Step 1d: Append design_firm to architect where both have data and they differ
UPDATE destinations
SET architect = architect || ', ' || design_firm
WHERE architect IS NOT NULL AND architect != ''
  AND design_firm IS NOT NULL AND design_firm != ''
  AND architect NOT ILIKE '%' || design_firm || '%';

-- Step 2: Drop old columns
ALTER TABLE destinations DROP COLUMN IF EXISTS interior_designer;
ALTER TABLE destinations DROP COLUMN IF EXISTS design_firm;

-- Step 3: Rename architect to design_firm
ALTER TABLE destinations RENAME COLUMN architect TO design_firm;

-- Step 4: Update index (drop old, create new if needed)
DROP INDEX IF EXISTS idx_destinations_design_firm;
CREATE INDEX IF NOT EXISTS idx_destinations_design_firm ON destinations(design_firm) WHERE design_firm IS NOT NULL;
