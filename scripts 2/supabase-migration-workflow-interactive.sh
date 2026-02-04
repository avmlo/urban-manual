#!/bin/bash
# Interactive Supabase Migration Workflow
# Run this in your terminal (not through automation)

set -e

echo "🚀 Supabase Migration Workflow"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📋 Step 1: Authentication${NC}"
echo "Please run this command in your terminal:"
echo -e "${YELLOW}  npx supabase login${NC}"
echo ""
echo "This will open a browser for you to authenticate."
echo ""
read -p "Press Enter after you've completed the login..."

# Step 2: Check if project is linked
echo ""
echo -e "${BLUE}📋 Step 2: Project Link${NC}"
if [ -f ".supabase/config.toml" ]; then
    echo -e "${GREEN}✅ Project is already linked${NC}"
    PROJECT_REF=$(grep -A 5 "\[project\]" .supabase/config.toml 2>/dev/null | grep "id" | cut -d'"' -f2 || echo "")
    if [ -n "$PROJECT_REF" ]; then
        echo "   Project ID: $PROJECT_REF"
    fi
else
    echo -e "${YELLOW}⚠️  Project not linked${NC}"
    echo ""
    echo "To find your project reference ID:"
    echo "  1. Go to https://supabase.com/dashboard"
    echo "  2. Select your project"
    echo "  3. Go to Settings > General"
    echo "  4. Copy the 'Reference ID'"
    echo ""
    read -p "Enter your project reference ID: " PROJECT_REF
    
    if [ -n "$PROJECT_REF" ]; then
        echo ""
        echo "Linking project..."
        npx supabase link --project-ref "$PROJECT_REF"
        echo -e "${GREEN}✅ Project linked${NC}"
    else
        echo -e "${YELLOW}⚠️  Skipping link. You can link later with:${NC}"
        echo "  npx supabase link --project-ref YOUR_PROJECT_REF"
    fi
fi

# Step 3: Check migration status
echo ""
echo -e "${BLUE}📋 Step 3: Migration Status${NC}"
echo ""
if [ -f ".supabase/config.toml" ]; then
    echo "Checking migration status..."
    npx supabase migration list
else
    echo -e "${YELLOW}⚠️  Cannot check status without project link${NC}"
fi

# Step 4: Show migration files
echo ""
echo -e "${BLUE}📋 Step 4: Migration Files${NC}"
echo ""
echo "Latest migrations in supabase/migrations/:"
ls -1t supabase/migrations/*.sql | head -10 | while read file; do
    echo "  - $(basename "$file")"
done

# Step 5: Apply migrations
echo ""
echo -e "${BLUE}📋 Step 5: Apply Migrations${NC}"
if [ -f ".supabase/config.toml" ]; then
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
else
    echo -e "${YELLOW}⚠️  Cannot apply migrations without project link${NC}"
fi

echo ""
echo -e "${GREEN}✅ Workflow complete!${NC}"
echo ""
echo "Useful commands:"
echo "  npx supabase migration list  # Check status"
echo "  npx supabase db push         # Apply migrations"

