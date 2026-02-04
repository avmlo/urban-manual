-- Verify if old migrations/ directory features are already in database
-- This checks if tables from old migrations exist (indicating they were applied)

-- Check for trips/itinerary tables (from trips.sql)
SELECT 
    'trips' as feature,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trips')
        THEN '✅ EXISTS (from old migrations/ or new migrations)'
        ELSE '❌ NOT FOUND'
    END as status,
    'From: trips.sql (old) or 401_itineraries_system.sql (new)' as source
UNION ALL
SELECT 
    'itinerary_items' as feature,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'itinerary_items')
        THEN '✅ EXISTS'
        ELSE '❌ NOT FOUND'
    END as status,
    'From: trips.sql (old) or 401_itineraries_system.sql (new)' as source
UNION ALL

-- Check for social features (from social-features.sql)
SELECT 
    'user_profiles' as feature,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles')
        THEN '✅ EXISTS'
        ELSE '❌ NOT FOUND'
    END as status,
    'From: social-features.sql (old) or 403_social_features.sql (new)' as source
UNION ALL
SELECT 
    'lists' as feature,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lists')
           OR EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collections')
        THEN '✅ EXISTS (lists or collections)'
        ELSE '❌ NOT FOUND'
    END as status,
    'From: social-features.sql (old) or 400_collections_system.sql (new)' as source
UNION ALL
SELECT 
    'reviews' as feature,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews')
        THEN '✅ EXISTS'
        ELSE '❌ NOT FOUND'
    END as status,
    'From: social-features.sql (old) or 403_social_features.sql (new)' as source
UNION ALL
SELECT 
    'activities' as feature,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activities')
           OR EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_feed')
        THEN '✅ EXISTS (activities or activity_feed)'
        ELSE '❌ NOT FOUND'
    END as status,
    'From: social-features.sql (old) or 403_social_features.sql (new)' as source
UNION ALL

-- Check for saved/visited places (from saved_visited_places.sql)
SELECT 
    'saved_places' as feature,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_places')
        THEN '✅ EXISTS'
        ELSE '❌ NOT FOUND'
    END as status,
    'From: saved_visited_places.sql (old) or 404_visited_enhancements.sql (new)' as source
UNION ALL
SELECT 
    'visited_places' as feature,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visited_places')
        THEN '✅ EXISTS'
        ELSE '❌ NOT FOUND'
    END as status,
    'From: saved_visited_places.sql (old) or 404_visited_enhancements.sql (new)' as source
UNION ALL

-- Check for achievements (from 011_achievements_system.sql)
SELECT 
    'achievements' as feature,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_achievements')
           OR EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'achievements')
        THEN '✅ EXISTS'
        ELSE '❌ NOT FOUND'
    END as status,
    'From: 011_achievements_system.sql (old) or 402_achievements_system.sql (new)' as source
UNION ALL

-- Check for personalization (from 009_personalization_system.sql)
SELECT 
    'personalization' as feature,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'personalization_scores')
        THEN '✅ EXISTS'
        ELSE '❌ NOT FOUND'
    END as status,
    'From: 009_personalization_system.sql (old) or 500_complete_travel_intelligence.sql (new)' as source
ORDER BY feature;

