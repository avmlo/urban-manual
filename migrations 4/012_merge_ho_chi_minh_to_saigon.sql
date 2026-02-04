-- Merge ho-chi-minh-city into saigon
-- Update all destinations with city = 'ho-chi-minh-city' to 'saigon'

UPDATE destinations
SET city = 'saigon'
WHERE city = 'ho-chi-minh-city';

-- Verify the update
SELECT COUNT(*) as remaining_ho_chi_minh
FROM destinations
WHERE city = 'ho-chi-minh-city';

SELECT COUNT(*) as saigon_count
FROM destinations
WHERE city = 'saigon';

