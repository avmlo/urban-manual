#!/bin/bash
# Complete Supabase Migration Workflow using CLI
# This script helps you check status and apply pending migrations

set -e

echo "🚀 Supabase Migration Workflow"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check if logged in
echo "📋 Step 1: Checking authentication..."
if npx supabase projects list &>/dev/null; then
    echo -e "${GREEN}✅ Already authenticated${NC}"
else
    echo -e "${YELLOW}⚠️  Not authenticated${NC}"
    echo ""
    echo "Please run: npx supabase login"
    echo "This will open a browser for authentication."
    echo ""
    read -p "Press Enter after you've logged in, or Ctrl+C to cancel..."
fi

# Step 2: Check if project is linked
echo ""
echo "📋 Step 2: Checking project link..."
if [ -f ".supabase/config.toml" ]; then
    echo -e "${GREEN}✅ Project is linked${NC}"
    PROJECT_REF=$(grep -A 5 "\[project\]" .supabase/config.toml 2>/dev/null | grep "id" | cut -d'"' -f2 || echo "")
    if [ -n "$PROJECT_REF" ]; then
        echo "   Project ID: $PROJECT_REF"
    fi
else
    echo -e "${YELLOW}⚠️  Project not linked${NC}"
    echo ""
    echo "To link your project, you need your project reference ID."
    echo "You can find it in:"
    echo "  - Supabase Dashboard > Project Settings > General > Reference ID"
    echo ""
    read -p "Enter your project reference ID (or press Enter to skip): " PROJECT_REF
    
    if [ -n "$PROJECT_REF" ]; then
        echo ""
        echo "Linking project..."
        npx supabase link --project-ref "$PROJECT_REF"
        echo -e "${GREEN}✅ Project linked${NC}"
    else
        echo -e "${RED}❌ Cannot proceed without project link${NC}"
        exit 1
    fi
fi

# Step 3: Check migration status
echo ""
echo "📋 Step 3: Checking migration status..."
echo ""
npx supabase migration list

# Step 4: Show pending migrations
echo ""
echo "📋 Step 4: Migration files in supabase/migrations/:"
echo ""
ls -1t supabase/migrations/*.sql | head -10 | while read file; do
    echo "  - $(basename "$file")"
done

# Step 5: Ask if user wants to apply
echo ""
echo "📋 Step 5: Apply pending migrations?"
echo ""
read -p "Do you want to push pending migrations to remote database? (y/N): " APPLY

if [[ "$APPLY" =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 Pushing migrations..."
    npx supabase db push
    echo ""
    echo -e "${GREEN}✅ Migrations applied!${NC}"
else
    echo ""
    echo "Skipped. You can apply migrations later with:"
    echo "  npx supabase db push"
fi

echo ""
echo "✅ Workflow complete!"
echo ""
echo "To check status again:"
echo "  npx supabase migration list"
echo ""
echo "To apply migrations:"
echo "  npx supabase db push"

