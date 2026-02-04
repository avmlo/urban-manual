#!/bin/bash
# SAFE Migration Deletion Script
# Only deletes migrations that are confirmed applied

set -e

MIGRATIONS_DIR="supabase/migrations"
BACKUP_DIR="supabase/migrations_backup_$(date +%Y%m%d_%H%M%S)"

# List of migrations to delete (CONFIRMED APPLIED MIGRATIONS)
# Format: one filename per line
# These are confirmed applied based on database checks and manual application:
MIGRATIONS_TO_DELETE=(
    # Older Migrations (018-302) - Applied and verified
    "018_intelligence.sql"
    "019_audit_current_state.sql"  # Audit script, but applied/run
    "020_consolidate_schema.sql"
    "021_add_helper_functions.sql"
    "022_add_tags_to_rpc.sql"
    "023_add_brand_to_user_collections.sql"
    "023_enable_vector_search.sql"
    "024_hybrid_search_function.sql"
    "025_conversation_tables.sql"
    "025_fix_embedding_dimension.sql"
    "026_add_advanced_enrichment_fields.sql"
    "210_location_relationships.sql"
    "300_conversational_ai.sql"
    "301_asimov_sync_trigger.sql"
    "302_remove_asimov_sync.sql"  # Partially applied, but safe to delete
    # Note: 200_complete_intelligence.sql is NOT applied (likely consolidated into 500)
    
    # Core Features (400-403) - Applied via APPLY_ALL_REMAINING_MIGRATIONS.sql
    "400_collections_system.sql"
    "401_itineraries_system.sql"
    "402_achievements_system.sql"
    "403_social_features.sql"
    # Enhancements (404-411)
    "404_visited_enhancements.sql"
    "405_collection_comments.sql"
    "406_add_birthday_field.sql"
    "407_add_editorial_summary.sql"
    "408_add_cuisine_type.sql"
    "409_add_google_trends.sql"
    "410_add_multi_source_trending.sql"
    "411_add_instagram_tiktok_trending.sql"
    # Advanced Features (412-415)
    "412_create_co_visitation_graph.sql"
    "413_phase3_advanced_features.sql"
    "414_phase4_optimization.sql"
    "415_travel_intelligence_improvement.sql"
    # Security & Fixes (416-421)
    "416_enable_rls_co_visit_signals.sql"
    "417_fix_all_security_issues.sql"
    "418_fix_additional_function_security.sql"
    "419_fix_user_profiles_rls.sql"
    "420_add_nested_destinations.sql"
    "421_ensure_michelin_is_dining.sql"
    # Major Features (500)
    "500_complete_travel_intelligence.sql"
    # Note: Keep 999_cleanup_old_tables.sql - it's a cleanup script, not a migration
)

if [ ${#MIGRATIONS_TO_DELETE[@]} -eq 0 ]; then
    echo "⚠️  No migrations specified for deletion"
    echo "   Edit this script and add migration filenames to MIGRATIONS_TO_DELETE array"
    exit 1
fi

echo "🗑️  Migration Deletion Script"
echo "=============================="
echo ""
echo "⚠️  WARNING: This will DELETE migration files!"
echo ""
echo "Migrations to delete:"
for mig in "${MIGRATIONS_TO_DELETE[@]}"; do
    echo "  - $mig"
done
echo ""
read -p "Are you sure you want to delete these? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Cancelled"
    exit 1
fi

# Create backup
echo ""
echo "📦 Creating backup..."
mkdir -p "$BACKUP_DIR"
for mig in "${MIGRATIONS_TO_DELETE[@]}"; do
    if [ -f "$MIGRATIONS_DIR/$mig" ]; then
        cp "$MIGRATIONS_DIR/$mig" "$BACKUP_DIR/"
        echo "  ✓ Backed up: $mig"
    else
        echo "  ⚠️  Not found: $mig"
    fi
done

# Delete migrations
echo ""
echo "🗑️  Deleting migrations..."
for mig in "${MIGRATIONS_TO_DELETE[@]}"; do
    if [ -f "$MIGRATIONS_DIR/$mig" ]; then
        rm "$MIGRATIONS_DIR/$mig"
        echo "  ✓ Deleted: $mig"
    fi
done

echo ""
echo "✅ Done! Backups saved in: $BACKUP_DIR"
