#!/bin/bash
# GitHub Cleanup Script
# Cleans up temporary files and prepares for commit

set -e

echo "🧹 GitHub Cleanup Script"
echo "========================"
echo ""

# Step 1: Delete temporary SQL check files
echo "📋 Step 1: Deleting temporary SQL check files..."
rm -f CHECK_*.sql \
      APPLY_ALL_REMAINING_MIGRATIONS.sql \
      COPY_PASTE_MIGRATION.sql \
      QUICK_MIGRATION_CHECK.sql

echo "  ✅ Deleted temporary SQL files"

# Step 2: Delete migration backup directories
echo ""
echo "📋 Step 2: Deleting migration backup directories..."
rm -rf supabase/migrations_backup_*/
echo "  ✅ Deleted backup directories"

# Step 3: Delete temporary cleanup script (optional)
echo ""
read -p "Delete CLEANUP_TEMPORARY_FILES.sh? (y/n): " DELETE_CLEANUP
if [ "$DELETE_CLEANUP" = "y" ]; then
    rm -f CLEANUP_TEMPORARY_FILES.sh
    echo "  ✅ Deleted cleanup script"
else
    echo "  ⏭️  Keeping cleanup script"
fi

# Step 4: Show git status
echo ""
echo "📋 Step 3: Current git status:"
echo ""
git status --short

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "  1. Review changes: git status"
echo "  2. Stage migration deletions: git add -u supabase/migrations/"
echo "  3. Stage documentation: git add MIGRATION_*.md"
echo "  4. Commit: git commit -m 'Clean up applied migrations'"
echo "  5. Push: git push origin master"

