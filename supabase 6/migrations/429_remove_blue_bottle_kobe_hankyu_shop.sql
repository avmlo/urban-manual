-- Migration: Remove Blue Bottle Coffee Kobe Hankyu Shop destination
-- This destination is a duplicate and should be removed

-- 1. Delete related records first (to avoid foreign key constraint issues)
DELETE FROM saved_places WHERE destination_slug = 'blue-bottle-coffee-kobe-hankyu-shop';
DELETE FROM visited_places WHERE destination_slug = 'blue-bottle-coffee-kobe-hankyu-shop';

-- 2. Delete the destination itself
DELETE FROM destinations WHERE slug = 'blue-bottle-coffee-kobe-hankyu-shop';

-- Success message
SELECT 'Migration completed! Blue Bottle Coffee Kobe Hankyu Shop has been removed.' as status;

