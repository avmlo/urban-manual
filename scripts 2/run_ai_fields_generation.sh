#!/bin/bash
# Setup and run script for generating AI fields on server
# Usage: bash scripts/run_ai_fields_generation.sh

set -e

echo "🚀 AI Fields Generation Setup & Run Script"
echo "=========================================="
echo ""

# Check if we're on the right server
if [ ! -d "/home/ubuntu/urban-manual" ]; then
    echo "⚠️  Warning: /home/ubuntu/urban-manual not found"
    echo "   Current directory: $(pwd)"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Change to project directory
cd /home/ubuntu/urban-manual || cd "$(dirname "$0")/.." || exit 1
echo "📁 Working directory: $(pwd)"
echo ""

# Check Python version
echo "🐍 Checking Python..."
if command -v python3.11 &> /dev/null; then
    PYTHON_CMD=python3.11
    echo "   ✓ Found python3.11"
elif command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
    echo "   ✓ Found python3"
else
    echo "   ❌ Python 3 not found!"
    exit 1
fi

$PYTHON_CMD --version
echo ""

# Check if required packages are installed
echo "📦 Checking dependencies..."
if ! $PYTHON_CMD -c "import supabase" 2>/dev/null; then
    echo "   ⚠️  supabase not found. Installing..."
    pip3 install supabase
fi

if ! $PYTHON_CMD -c "import google.generativeai" 2>/dev/null; then
    echo "   ⚠️  google-generativeai not found. Installing..."
    pip3 install google-generativeai
fi

echo "   ✓ Dependencies installed"
echo ""

# Check for API keys
echo "🔑 Checking environment variables..."
if [ -z "$GOOGLE_API_KEY" ]; then
    echo "   ⚠️  GOOGLE_API_KEY not set"
    echo "   Please set it with: export GOOGLE_API_KEY=your_key"
    read -p "   Enter GOOGLE_API_KEY now (or press Enter to use .env): " GOOGLE_API_KEY_INPUT
    if [ ! -z "$GOOGLE_API_KEY_INPUT" ]; then
        export GOOGLE_API_KEY="$GOOGLE_API_KEY_INPUT"
    elif [ -f .env ]; then
        echo "   Loading from .env file..."
        export $(cat .env | grep GOOGLE_API_KEY | xargs)
    else
        echo "   ❌ GOOGLE_API_KEY required!"
        exit 1
    fi
fi

if [ -z "$GOOGLE_API_KEY" ]; then
    echo "   ❌ GOOGLE_API_KEY still not set!"
    exit 1
fi

echo "   ✓ GOOGLE_API_KEY is set"
echo ""

# Check if migration has been run
echo "🗄️  Checking database schema..."
echo "   Note: Make sure you've run migrations/2025_01_04_add_ai_fields_columns.sql"
echo "   in Supabase SQL Editor before proceeding."
read -p "   Have you run the SQL migration? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "   ⚠️  Please run the migration first!"
    echo "   File: migrations/2025_01_04_add_ai_fields_columns.sql"
    exit 1
fi

echo ""

# Run the script
echo "🎬 Starting AI fields generation..."
echo "=========================================="
echo ""

$PYTHON_CMD scripts/generate_ai_fields.py

echo ""
echo "✅ Done!"
