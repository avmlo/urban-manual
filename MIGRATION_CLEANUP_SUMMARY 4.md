# Migration Cleanup Summary

## ✅ Applied Migrations (38 total - Ready to Delete)

### Older Migrations (018-302) - 14 files
- ✅ `018_intelligence.sql` - Creates co_visit_signals, adds rank_score
- ✅ `019_audit_current_state.sql` - Audit script (applied/run)
- ✅ `020_consolidate_schema.sql` - Creates saved_places/visited_places
- ✅ `021_add_helper_functions.sql` - Creates user destination functions
- ✅ `022_add_tags_to_rpc.sql` - Updates functions with tags
- ✅ `023_add_brand_to_user_collections.sql` - Updates functions with brand
- ✅ `023_enable_vector_search.sql` - Enables pgvector extension
- ✅ `024_hybrid_search_function.sql` - Creates hybrid search function
- ✅ `025_conversation_tables.sql` - Creates conversation tables
- ✅ `025_fix_embedding_dimension.sql` - Fixes embedding to vector(3072)
- ✅ `026_add_advanced_enrichment_fields.sql` - Adds enrichment fields
- ✅ `210_location_relationships.sql` - Creates locations table
- ✅ `300_conversational_ai.sql` - Creates conversation tables with embeddings
- ✅ `301_asimov_sync_trigger.sql` - Creates Asimov sync trigger
- ✅ `302_remove_asimov_sync.sql` - Removes Asimov sync (partially applied, safe to delete)

### Core Features (400-403) - 4 files
- ✅ `400_collections_system.sql`
- ✅ `401_itineraries_system.sql`
- ✅ `402_achievements_system.sql`
- ✅ `403_social_features.sql`

### Enhancements (404-411) - 8 files
- ✅ `404_visited_enhancements.sql`
- ✅ `405_collection_comments.sql`
- ✅ `406_add_birthday_field.sql`
- ✅ `407_add_editorial_summary.sql`
- ✅ `408_add_cuisine_type.sql`
- ✅ `409_add_google_trends.sql`
- ✅ `410_add_multi_source_trending.sql`
- ✅ `411_add_instagram_tiktok_trending.sql`

### Advanced Features (412-415) - 4 files
- ✅ `412_create_co_visitation_graph.sql`
- ✅ `413_phase3_advanced_features.sql`
- ✅ `414_phase4_optimization.sql`
- ✅ `415_travel_intelligence_improvement.sql`

### Security & Fixes (416-421) - 6 files
- ✅ `416_enable_rls_co_visit_signals.sql`
- ✅ `417_fix_all_security_issues.sql`
- ✅ `418_fix_additional_function_security.sql`
- ✅ `419_fix_user_profiles_rls.sql`
- ✅ `420_add_nested_destinations.sql`
- ✅ `421_ensure_michelin_is_dining.sql`

### Major Features (500) - 1 file
- ✅ `500_complete_travel_intelligence.sql`

## ❌ Not Applied (Keep These)

- ❌ `200_complete_intelligence.sql` - **NOT applied** (likely consolidated into `500_complete_travel_intelligence.sql`)

## ⚠️  Notes

1. **200_complete_intelligence.sql**: This migration is not applied. It was likely consolidated into `500_complete_travel_intelligence.sql`. Keep this file for reference or delete if you're confident it's been superseded.

2. **302_remove_asimov_sync.sql**: Partially applied (trigger may still exist). Safe to delete the file, but you may want to manually verify the trigger is removed:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_asimov_sync';
   SELECT * FROM pg_proc WHERE proname = 'notify_asimov_sync';
   ```

3. **019_audit_current_state.sql**: This is an audit script that doesn't create database objects. It's safe to delete if you don't need it for reference.

4. **Duplicate migrations**: 
   - `025_conversation_tables.sql` and `300_conversational_ai.sql` both create conversation tables. Both are applied, so both can be deleted.
   - `018_intelligence.sql` and `200_complete_intelligence.sql` have overlapping features. Only 018 is applied.

## 🗑️  Cleanup Command

Run the deletion script to remove all 38 applied migrations:

```bash
./scripts/delete-applied-migrations.sh
```

This will:
- Create backups in `supabase/migrations_backup_[timestamp]/`
- Delete 38 applied migration files
- Keep non-applied migrations and cleanup scripts

## 📋 Remaining Files After Cleanup

After cleanup, you'll have:
- **Old migrations** (if any not listed above)
- **200_complete_intelligence.sql** (not applied, keep for reference or delete)
- **999_cleanup_old_tables.sql** (cleanup script, keep)

## Summary

- **Total migrations**: 40 files
- **Applied & ready to delete**: 38 files
- **Not applied (keep)**: 1 file (200)
- **Cleanup script (keep)**: 1 file (999)
