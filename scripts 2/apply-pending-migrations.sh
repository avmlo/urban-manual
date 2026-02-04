#!/bin/bash
# Script to apply pending Supabase migrations

echo "🚀 Applying Pending Supabase Migrations..."
echo ""

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
    echo "❌ Project not linked. Please link first:"
    echo "   npx supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi

echo "📋 Checking migration status..."
npx supabase migration list

echo ""
echo "📤 Pushing migrations to remote database..."
npx supabase db push

echo ""
echo "✅ Done!"
