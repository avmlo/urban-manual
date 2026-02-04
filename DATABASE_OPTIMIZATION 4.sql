-- Database Optimization Guide
-- Run these queries in your Supabase SQL Editor to improve query performance

-- ============================================
-- INDEXES FOR DESTINATIONS TABLE
-- ============================================

-- Index for city filtering (most common query)
CREATE INDEX IF NOT EXISTS idx_destinations_city ON destinations(city);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_destinations_category ON destinations(category);

-- Index for slug lookups (destination detail pages)
CREATE INDEX IF NOT EXISTS idx_destinations_slug ON destinations(slug);

-- Composite index for city + category (common combination)
CREATE INDEX IF NOT EXISTS idx_destinations_city_category ON destinations(city, category);

-- Index for search by name
CREATE INDEX IF NOT EXISTS idx_destinations_name ON destinations USING gin(to_tsvector('english', name));

-- Index for coordinates (for location-based queries)
CREATE INDEX IF NOT EXISTS idx_destinations_coordinates ON destinations(lat, long);

-- ============================================
-- INDEXES FOR USER TABLES
-- ============================================

-- Saved destinations indexes
CREATE INDEX IF NOT EXISTS idx_saved_destinations_user_id ON saved_destinations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_destinations_destination_id ON saved_destinations(destination_id);
CREATE INDEX IF NOT EXISTS idx_saved_destinations_user_dest ON saved_destinations(user_id, destination_id);

-- Visited destinations indexes
CREATE INDEX IF NOT EXISTS idx_visited_destinations_user_id ON visited_destinations(user_id);
CREATE INDEX IF NOT EXISTS idx_visited_destinations_destination_id ON visited_destinations(destination_id);
CREATE INDEX IF NOT EXISTS idx_visited_destinations_user_dest ON visited_destinations(user_id, destination_id);

-- User stats indexes
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_destination_id ON check_ins(destination_id);

-- ============================================
-- ANALYZE TABLES
-- ============================================

-- Update table statistics for query planner
ANALYZE destinations;
ANALYZE saved_destinations;
ANALYZE visited_destinations;
ANALYZE user_stats;
ANALYZE check_ins;

-- ============================================
-- QUERY OPTIMIZATION EXAMPLES
-- ============================================

-- Before: Slow query without index
-- SELECT * FROM destinations WHERE city = 'New York' AND category = 'Restaurant';

-- After: Fast query with composite index
-- Uses idx_destinations_city_category automatically

-- Before: Full table scan for search
-- SELECT * FROM destinations WHERE name ILIKE '%cafe%';

-- After: Fast full-text search
-- SELECT * FROM destinations WHERE to_tsvector('english', name) @@ to_tsquery('english', 'cafe');

-- ============================================
-- CONNECTION POOLING (Already handled by Supabase)
-- ============================================

-- Supabase automatically provides connection pooling
-- No additional configuration needed

-- ============================================
-- ROW LEVEL SECURITY PERFORMANCE
-- ============================================

-- Ensure RLS policies use indexed columns
-- Example: user_id should always be indexed when used in RLS policies

-- Check existing RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('saved_destinations', 'visited_destinations', 'user_stats');

-- ============================================
-- MATERIALIZED VIEWS (Optional - for heavy aggregations)
-- ============================================

-- Example: Popular destinations by city
CREATE MATERIALIZED VIEW IF NOT EXISTS popular_destinations_by_city AS
SELECT 
  city,
  category,
  COUNT(*) as destination_count,
  AVG(CASE WHEN rating IS NOT NULL THEN rating ELSE 0 END) as avg_rating
FROM destinations
GROUP BY city, category
ORDER BY city, destination_count DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_popular_dest_city ON popular_destinations_by_city(city);

-- Refresh materialized view (run periodically, e.g., daily)
-- REFRESH MATERIALIZED VIEW popular_destinations_by_city;

-- ============================================
-- QUERY PERFORMANCE MONITORING
-- ============================================

-- Check slow queries (requires pg_stat_statements extension)
-- SELECT query, calls, total_time, mean_time, max_time
-- FROM pg_stat_statements
-- ORDER BY mean_time DESC
-- LIMIT 20;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- ============================================
-- VACUUM AND MAINTENANCE
-- ============================================

-- Supabase handles automatic vacuuming
-- But you can manually vacuum if needed:
-- VACUUM ANALYZE destinations;

-- ============================================
-- IMPLEMENTATION CHECKLIST
-- ============================================

-- [ ] Run all CREATE INDEX commands above
-- [ ] Run ANALYZE on all tables
-- [ ] Monitor query performance for 1 week
-- [ ] Check index usage statistics
-- [ ] Consider materialized views for heavy aggregations
-- [ ] Set up periodic REFRESH for materialized views (if used)
-- [ ] Review slow query logs monthly

-- ============================================
-- EXPECTED PERFORMANCE IMPROVEMENTS
-- ============================================

-- City filtering: 10-50x faster
-- Category filtering: 5-20x faster
-- Slug lookups: 100x faster
-- User saved/visited queries: 20-100x faster
-- Location-based queries: 10-30x faster
-- Full-text search: 50-200x faster

-- ============================================
-- NOTES
-- ============================================

-- 1. Indexes increase write time slightly but dramatically improve read performance
-- 2. For a read-heavy application like a travel guide, this tradeoff is beneficial
-- 3. Monitor index usage and remove unused indexes if any
-- 4. Supabase automatically handles connection pooling and basic optimizations
-- 5. Test queries before and after indexing to measure improvements

