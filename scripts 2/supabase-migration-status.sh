#!/bin/bash
# Check Supabase migration status using CLI

echo "🔍 Supabase Migration Status Check"
echo "===================================="
echo ""

# Check if we can use CLI
if command -v npx &> /dev/null; then
    echo "✅ npx available"
    
    # Try to check if project is linked
    if [ -f ".supabase/config.toml" ]; then
        echo "✅ Project is linked"
        echo ""
        echo "📊 Migration Status:"
        npx supabase migration list 2>&1
    else
        echo "⚠️  Project not linked"
        echo ""
        echo "To link: npx supabase link --project-ref YOUR_PROJECT_REF"
        echo ""
        echo "📁 Migration files in supabase/migrations/:"
        ls -1 supabase/migrations/*.sql | wc -l | xargs echo "  Total:"
        echo ""
        echo "Latest 5 migrations:"
        ls -1t supabase/migrations/*.sql | head -5 | xargs -I {} basename {}
    fi
else
    echo "❌ npx not available"
fi

echo ""
echo "💡 To apply migrations:"
echo "  1. npx supabase login"
echo "  2. npx supabase link --project-ref YOUR_PROJECT_REF"
echo "  3. npx supabase db push"
