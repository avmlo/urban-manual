#!/bin/bash
# Quick enrichment runner script
# Run this from your terminal: bash scripts/run-enrichment.sh

cd "$(dirname "$0")/.."

echo "🚀 Starting destination enrichment..."
echo ""

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not found. Please ensure Node.js is installed and in your PATH."
    echo ""
    echo "To install Node.js:"
    echo "  - macOS: brew install node"
    echo "  - Or download from: https://nodejs.org/"
    exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  Warning: .env.local not found"
    echo "   Make sure you have:"
    echo "   - NEXT_PUBLIC_SUPABASE_URL"
    echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "   - GOOGLE_API_KEY"
    echo "   - GEMINI_API_KEY"
    echo ""
fi

# Run enrichment with limit 10
echo "📊 Enriching first 10 destinations..."
npm run enrich -- --limit 10

echo ""
echo "✅ Done! Check the output above for results."

