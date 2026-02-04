#!/bin/bash
# Additional Cleanup Script
# Cleans up temporary data files, backups, and old directories

set -e

echo "🧹 Additional Cleanup Script"
echo "============================"
echo ""

# Step 1: Delete backup directories
echo "📋 Step 1: Deleting backup directories..."
if [ -d "temp_files_backup_20251108_153310" ]; then
    rm -rf temp_files_backup_20251108_153310
    echo "  ✅ Deleted: temp_files_backup_20251108_153310"
else
    echo "  ⏭️  No backup directory found"
fi

# Step 2: Delete temporary JSON data files
echo ""
echo "📋 Step 2: Deleting temporary JSON data files..."
TEMP_JSON_FILES=(
    "embedding_generation_results.json"
    "potential_duplicates.json"
    "backup-image-urls.json"
    "geocoding_cache.json"
    "missing_destinations.json"
    "category_analysis.json"
    "migration-errors.json"
    "place-data-complete.json"
    "google_types_analysis.json"
    "merge_results.json"
    "final_duplicate_scan.json"
    "missing_data_fetch_results.json"
    "enrichment-results.json"
    "internal_duplicates.json"
    "google_fetch_results.json"
    "discovery-engine-export.json"
)

DELETED_JSON=0
for file in "${TEMP_JSON_FILES[@]}"; do
    if [ -f "$file" ]; then
        rm "$file"
        echo "  ✓ Deleted: $file"
        ((DELETED_JSON++))
    fi
done
echo "  ✅ Deleted $DELETED_JSON JSON files"

# Step 3: Delete log files
echo ""
echo "📋 Step 3: Deleting log files..."
if [ -f "enrichment-log.txt" ]; then
    rm "enrichment-log.txt"
    echo "  ✅ Deleted: enrichment-log.txt"
else
    echo "  ⏭️  No log file found"
fi

# Step 4: Delete CSV import file (optional)
echo ""
read -p "Delete destinations_import.csv? (y/n): " DELETE_CSV
if [ "$DELETE_CSV" = "y" ]; then
    if [ -f "destinations_import.csv" ]; then
        rm "destinations_import.csv"
        echo "  ✅ Deleted: destinations_import.csv"
    fi
else
    echo "  ⏭️  Keeping CSV file"
fi

# Step 5: Review old migrations directory
echo ""
echo "📋 Step 4: Old migrations directory check..."
if [ -d "migrations" ] && [ "$(ls -A migrations/*.sql 2>/dev/null)" ]; then
    echo "  ⚠️  Found old migrations/ directory with SQL files"
    echo "  📁 Location: ./migrations/"
    echo "  📊 Files: $(ls -1 migrations/*.sql 2>/dev/null | wc -l | tr -d ' ')"
    echo ""
    read -p "Delete old migrations/ directory? (y/n): " DELETE_OLD_MIGRATIONS
    if [ "$DELETE_OLD_MIGRATIONS" = "y" ]; then
        rm -rf migrations/
        echo "  ✅ Deleted: migrations/ directory"
    else
        echo "  ⏭️  Keeping old migrations directory"
    fi
else
    echo "  ⏭️  No old migrations directory found"
fi

# Step 6: Show remaining cleanup opportunities
echo ""
echo "📋 Step 5: Remaining items to review manually:"
echo ""
echo "  SQL files in root (review each):"
ls -1 *.sql 2>/dev/null | sed 's/^/    - /' || echo "    (none)"
echo ""
echo "  Untracked scripts (consider committing useful ones):"
git status --porcelain | grep "^??" | grep "scripts/" | sed 's/^?? /    - /' || echo "    (none)"

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary:"
echo "  - Deleted backup directories"
echo "  - Deleted temporary JSON files"
echo "  - Deleted log files"
echo "  - Reviewed old migrations directory"
echo ""
echo "💡 Next steps:"
echo "  1. Review SQL files in root - keep reference files, delete temporary ones"
echo "  2. Commit useful scripts: git add scripts/delete-applied-migrations.sh scripts/github-cleanup.sh"
echo "  3. Review and commit other useful scripts"

