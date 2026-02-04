#!/usr/bin/env python3
"""
Populate normalized tables with data from existing destinations table.
This script is safe to run multiple times - it will skip existing records.
"""

from supabase import create_client
from collections import defaultdict
from dotenv import load_dotenv
import os
import sys

# Load environment variables
load_dotenv('.env.local')

# Supabase credentials
url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("❌ Error: Supabase credentials not found in .env.local")
    sys.exit(1)

supabase = create_client(url, key)

def slugify(text):
    """Convert text to URL-friendly slug"""
    return text.lower().replace(' ', '-').replace('&', 'and')

print("="*60)
print("POPULATING NORMALIZED TABLES")
print("="*60)

# Step 1: Get all destinations
print("\n📊 Fetching destinations...")
try:
    response = supabase.table('destinations').select('city, country, category').execute()
    destinations = response.data
    print(f"✓ Found {len(destinations)} destinations")
except Exception as e:
    print(f"✗ Error fetching destinations: {e}")
    sys.exit(1)

# Step 2: Extract unique cities
print("\n🌍 Processing cities...")
cities_data = {}
for dest in destinations:
    city = dest.get('city')
    country = dest.get('country')
    if city and country:
        key = (city, country)
        if key not in cities_data:
            cities_data[key] = {
                'name': city.replace('-', ' ').title(),
                'slug': city,
                'country': country
            }

print(f"  Found {len(cities_data)} unique cities")

# Insert cities
cities_created = 0
for city_data in cities_data.values():
    try:
        supabase.table('cities').insert(city_data).execute()
        cities_created += 1
        print(f"  ✓ Created: {city_data['name']}, {city_data['country']}")
    except Exception as e:
        if 'duplicate' in str(e).lower() or 'unique' in str(e).lower():
            print(f"  ℹ Skipped (exists): {city_data['name']}")
        else:
            print(f"  ✗ Error creating {city_data['name']}: {e}")

print(f"\n✓ Cities: {cities_created} created")

# Step 3: Extract unique categories
print("\n📂 Processing categories...")
categories_data = {}
for dest in destinations:
    category = dest.get('category')
    if category:
        if category not in categories_data:
            categories_data[category] = {
                'name': category,
                'slug': slugify(category)
            }

print(f"  Found {len(categories_data)} unique categories")

# Insert categories
categories_created = 0
for cat_data in categories_data.values():
    try:
        supabase.table('categories').insert(cat_data).execute()
        categories_created += 1
        print(f"  ✓ Created: {cat_data['name']}")
    except Exception as e:
        if 'duplicate' in str(e).lower() or 'unique' in str(e).lower():
            print(f"  ℹ Skipped (exists): {cat_data['name']}")
        else:
            print(f"  ✗ Error creating {cat_data['name']}: {e}")

print(f"\n✓ Categories: {categories_created} created")

# Summary
print("\n" + "="*60)
print("MIGRATION COMPLETE!")
print("="*60)
print(f"\nSummary:")
print(f"  Cities created:     {cities_created}")
print(f"  Categories created: {categories_created}")
print(f"\n✅ Your new tables are ready to use!")
print(f"✅ Your existing destinations table is unchanged")
print(f"\nNext step: Run verify_migration.py to check everything")

