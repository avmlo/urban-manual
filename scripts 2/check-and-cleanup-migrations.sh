#!/bin/bash
# Check all migrations and identify which can be safely deleted
# This script helps you clean up applied migration files

set -e

echo "🔍 Migration Check and Cleanup Script"
echo "======================================"
echo ""

MIGRATIONS_DIR="supabase/migrations"
BACKUP_DIR="supabase/migrations_backup_$(date +%Y%m%d_%H%M%S)"
APPLIED_FILE="/tmp/applied_migrations.txt"
TO_DELETE_FILE="/tmp/migrations_to_delete.txt"

# Create backup directory
echo "📦 Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# List all migration files
echo ""
echo "📋 All migration files:"
ls -1 "$MIGRATIONS_DIR"/*.sql | wc -l | xargs echo "  Total:"

# Create a list of migrations that are likely applied
# Based on the check results, these are confirmed applied:
cat > "$APPLIED_FILE" << 'EOF'
# Confirmed Applied Migrations (based on database checks)
416_enable_rls_co_visit_signals.sql
417_fix_all_security_issues.sql
418_fix_additional_function_security.sql
419_fix_user_profiles_rls.sql
420_add_nested_destinations.sql
421_ensure_michelin_is_dining.sql
EOF

echo ""
echo "✅ Confirmed applied migrations (from database checks):"
cat "$APPLIED_FILE" | grep -v '^#' | sed 's/^/  - /'

# Ask user which migrations to check
echo ""
echo "📝 To identify which migrations are applied:"
echo "  1. Run CHECK_MIGRATION_OBJECTS.sql in Supabase SQL Editor"
echo "  2. Note which migrations show '✅ Applied'"
echo "  3. Add those migration filenames to the cleanup list"
echo ""

# Create a script to safely delete migrations
cat > scripts/delete-applied-migrations.sh << 'DELETESCRIPT'
#!/bin/bash
# SAFE Migration Deletion Script
# Only deletes migrations that are confirmed applied

set -e

MIGRATIONS_DIR="supabase/migrations"
BACKUP_DIR="supabase/migrations_backup_$(date +%Y%m%d_%H%M%S)"

# List of migrations to delete (ADD YOUR CONFIRMED APPLIED ONES HERE)
# Format: one filename per line
MIGRATIONS_TO_DELETE=(
    # Add confirmed applied migrations here, for example:
    # "416_enable_rls_co_visit_signals.sql"
    # "417_fix_all_security_issues.sql"
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
DELETESCRIPT

chmod +x scripts/delete-applied-migrations.sh

echo "✅ Created deletion script: scripts/delete-applied-migrations.sh"
echo ""
echo "📋 Next steps:"
echo "  1. Run CHECK_MIGRATION_OBJECTS.sql in SQL Editor"
echo "  2. Note all migrations showing '✅ Applied'"
echo "  3. Edit scripts/delete-applied-migrations.sh"
echo "  4. Add confirmed applied migration filenames to MIGRATIONS_TO_DELETE array"
echo "  5. Run: ./scripts/delete-applied-migrations.sh"
echo ""
echo "⚠️  IMPORTANT:"
echo "  - Keep migration 999_cleanup_old_tables.sql (cleanup script)"
echo "  - Only delete migrations that are 100% confirmed applied"
echo "  - Backups will be created automatically"

