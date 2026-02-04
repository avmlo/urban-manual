# GitHub Cleanup Plan

## Current Status

### Files to Commit
- ✅ Deleted migration files (38 files) - These are the applied migrations we cleaned up
- ✅ Updated `MIGRATION_SUMMARY.md`

### Files to Delete (Don't Commit)
- ❌ Temporary SQL check files (11 files)
- ❌ Migration backup directories
- ❌ Temporary cleanup scripts

### Remote Branches to Clean
- Many old `claude/` and `codex/` branches that might be merged

## Cleanup Steps

### 1. Update .gitignore
✅ Already updated to ignore:
- Temporary SQL check files
- Migration backup directories
- Supabase temp files
- Large JSON data files (except config files)

### 2. Clean Up Local Files
```bash
# Delete temporary SQL check files
rm -f CHECK_*.sql APPLY_ALL_REMAINING_MIGRATIONS.sql COPY_PASTE_MIGRATION.sql QUICK_MIGRATION_CHECK.sql

# Delete migration backup directories
rm -rf supabase/migrations_backup_*/

# Delete temporary cleanup script (after running if needed)
rm -f CLEANUP_TEMPORARY_FILES.sh
```

### 3. Commit Migration Cleanup
```bash
# Stage deleted migrations
git add -u supabase/migrations/

# Stage updated documentation
git add MIGRATION_SUMMARY.md MIGRATION_COMPLETE.md MIGRATION_CLEANUP_SUMMARY.md

# Commit
git commit -m "Clean up applied migrations: remove 38 applied migration files

- Deleted all applied migrations (018-026, 210, 300-302, 400-421, 500)
- Kept only non-applied migrations (200, 999)
- Updated migration documentation
- All migrations backed up in supabase/migrations_backup_*/"
```

### 4. Clean Up Remote Branches (Optional)
```bash
# List all remote branches
git branch -r

# Delete merged remote branches (be careful!)
# First, check which branches are merged:
git branch -r --merged origin/master

# Delete specific old branches (example):
# git push origin --delete claude/old-branch-name
```

### 5. Push Changes
```bash
git push origin master
```

## Files to Keep in Git
- ✅ `MIGRATION_COMPLETE.md` - Summary of completed migrations
- ✅ `MIGRATION_CLEANUP_SUMMARY.md` - Cleanup documentation
- ✅ `MIGRATION_SUMMARY.md` - Migration status summary
- ✅ `DATABASE_MIGRATION_GUIDE.md` - Reference guide
- ✅ `scripts/delete-applied-migrations.sh` - Useful script for future

## Files to NOT Commit
- ❌ Temporary SQL check files (now in .gitignore)
- ❌ Migration backup directories (now in .gitignore)
- ❌ Large JSON data files (now in .gitignore)
- ❌ Supabase temp files (now in .gitignore)

