#!/bin/bash

# Schema Reconciliation Migration Runner
# This script applies all migrations in order

set -e

echo "🔍 Starting Schema Reconciliation..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're linked to a project
if [ ! -f .supabase/config.toml ]; then
    echo "❌ Not linked to a Supabase project."
    echo "   Run: supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi

echo "📋 Step 1: Running audit migration..."
supabase db push --dry-run supabase/migrations/019_audit_current_state.sql
supabase db push supabase/migrations/019_audit_current_state.sql
echo "✅ Audit complete"
echo ""

read -p "📋 Review the audit output above. Continue with consolidation? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration cancelled"
    exit 1
fi

echo "📋 Step 2: Running consolidation migration..."
supabase db push --dry-run supabase/migrations/020_consolidate_schema.sql
supabase db push supabase/migrations/020_consolidate_schema.sql
echo "✅ Schema consolidated"
echo ""

echo "📋 Step 3: Adding helper functions..."
supabase db push supabase/migrations/021_add_helper_functions.sql
echo "✅ Helper functions added"
echo ""

echo "🎉 Schema reconciliation complete!"
echo ""
echo "Next steps:"
echo "1. Update your code to use the new helper functions"
echo "2. Test saved/visited places functionality"
echo "3. Consider dropping old *_destinations tables if migration succeeded"

