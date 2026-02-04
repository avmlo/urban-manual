-- Fix city and country mappings
-- Update incorrect city/country combinations

-- Provence is in France
UPDATE destinations
SET country = 'France'
WHERE LOWER(city) = 'provence' AND (country IS NULL OR country != 'France');

-- Prague is in Czech Republic
UPDATE destinations
SET country = 'Czech Republic'
WHERE LOWER(city) = 'prague' AND (country IS NULL OR country != 'Czech Republic');

-- Hakone is in Japan
UPDATE destinations
SET country = 'Japan'
WHERE LOWER(city) = 'hakone' AND (country IS NULL OR country != 'Japan');

-- Pingtung is in Taiwan
UPDATE destinations
SET country = 'Taiwan'
WHERE LOWER(city) = 'pingtung' AND (country IS NULL OR country != 'Taiwan');

-- Auvergne is in France
UPDATE destinations
SET country = 'France'
WHERE LOWER(city) = 'auvergne' AND (country IS NULL OR country != 'France');

-- Replace "10 rue" with "Paris" (case-insensitive)
UPDATE destinations
SET city = 'Paris'
WHERE LOWER(city) LIKE '%10 rue%' OR city = '10 rue';

-- Also update country for Paris if not set
UPDATE destinations
SET country = 'France'
WHERE city = 'Paris' AND (country IS NULL OR country != 'France');

-- Log the changes
DO $$
DECLARE
  provence_count INTEGER;
  prague_count INTEGER;
  hakone_count INTEGER;
  pingtung_count INTEGER;
  auvergne_count INTEGER;
  paris_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO provence_count FROM destinations WHERE LOWER(city) = 'provence';
  SELECT COUNT(*) INTO prague_count FROM destinations WHERE LOWER(city) = 'prague';
  SELECT COUNT(*) INTO hakone_count FROM destinations WHERE LOWER(city) = 'hakone';
  SELECT COUNT(*) INTO pingtung_count FROM destinations WHERE LOWER(city) = 'pingtung';
  SELECT COUNT(*) INTO auvergne_count FROM destinations WHERE LOWER(city) = 'auvergne';
  SELECT COUNT(*) INTO paris_count FROM destinations WHERE city = 'Paris';
  
  RAISE NOTICE 'Updated destinations: Provence: %, Prague: %, Hakone: %, Pingtung: %, Auvergne: %, Paris: %',
    provence_count, prague_count, hakone_count, pingtung_count, auvergne_count, paris_count;
END $$;

