#!/bin/bash
# Script to check Supabase migration status using CLI

echo "🔍 Checking Supabase Migration Status..."
echo ""

# Check if supabase CLI is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found"
    exit 1
fi

# Try to get migration status
echo "📋 Attempting to list migrations..."
echo ""

# Check if project is linked
if [ -f ".supabase/config.toml" ]; then
    echo "✅ Project is linked"
    echo ""
    echo "📊 Migration Status:"
    npx supabase migration list 2>&1
else
    echo "⚠️  Project not linked"
    echo ""
    echo "To link your project, run:"
    echo "  npx supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    echo "Or check migrations manually in Supabase Dashboard > Database > Migrations"
fi

echo ""
echo "📁 Migration Files Found:"
echo ""
echo "supabase/migrations/:"
ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l | xargs echo "  Total:"
ls -1 supabase/migrations/*.sql 2>/dev/null | tail -5 | sed 's/^/  - /'

echo ""
echo "migrations/ (old folder):"
ls -1 migrations/*.sql 2>/dev/null | wc -l | xargs echo "  Total:"

echo ""
echo "💡 To apply pending migrations:"
echo "  1. Link project: npx supabase link --project-ref YOUR_PROJECT_REF"
echo "  2. Push migrations: npx supabase db push"
echo "  OR"
echo "  3. Apply manually via Supabase Dashboard > SQL Editor"

