#!/usr/bin/env python3
"""
Verify that the database migrations were successful.
"""

from supabase import create_client
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv('.env.local')

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(url, key)

print("="*70)
print("DATABASE MIGRATION VERIFICATION")
print("="*70)

# Check new columns in destinations table
print("\n1️⃣  CHECKING NEW COLUMNS IN DESTINATIONS TABLE")
print("-"*70)

try:
    # Get a sample destination with new fields
    response = supabase.table('destinations').select(
        'name, architect, brand, year_opened, michelin_stars, neighborhood, gallery'
    ).not_.is_('architect', 'null').limit(5).execute()
    
    if response.data:
        print(f"✅ Found {len(response.data)} destinations with architect data")
        print("\nSample destinations:")
        for dest in response.data:
            print(f"\n  📍 {dest['name']}")
            if dest.get('architect'):
                print(f"     Architect: {dest['architect']}")
            if dest.get('brand'):
                print(f"     Brand: {dest['brand']}")
            if dest.get('year_opened'):
                print(f"     Opened: {dest['year_opened']}")
            if dest.get('michelin_stars'):
                print(f"     Michelin: {'⭐' * dest['michelin_stars']}")
            if dest.get('neighborhood'):
                print(f"     Neighborhood: {dest['neighborhood']}")
            if dest.get('gallery'):
                print(f"     Gallery: {len(dest['gallery'])} images")
    else:
        print("⚠️  No destinations with architect data found")
        
except Exception as e:
    print(f"❌ Error checking destinations: {e}")

# Check cities table
print("\n\n2️⃣  CHECKING CITIES TABLE")
print("-"*70)

try:
    response = supabase.table('cities').select('*').execute()
    cities = response.data
    print(f"✅ Found {len(cities)} cities")
    for city in cities[:10]:
        print(f"  • {city['name']}, {city['country']} (slug: {city['slug']})")
    if len(cities) > 10:
        print(f"  ... and {len(cities) - 10} more")
except Exception as e:
    print(f"❌ Error checking cities: {e}")

# Check categories table
print("\n\n3️⃣  CHECKING CATEGORIES TABLE")
print("-"*70)

try:
    response = supabase.table('categories').select('*').execute()
    categories = response.data
    print(f"✅ Found {len(categories)} categories")
    for cat in categories:
        print(f"  • {cat['name']} (slug: {cat['slug']})")
except Exception as e:
    print(f"❌ Error checking categories: {e}")

# Check profiles table
print("\n\n4️⃣  CHECKING PROFILES TABLE")
print("-"*70)

try:
    response = supabase.table('profiles').select('*').execute()
    profiles = response.data
    print(f"✅ Profiles table exists ({len(profiles)} profiles)")
except Exception as e:
    print(f"❌ Error checking profiles: {e}")

# Check list_destinations table
print("\n\n5️⃣  CHECKING LIST_DESTINATIONS TABLE")
print("-"*70)

try:
    response = supabase.table('list_destinations').select('*').execute()
    list_dests = response.data
    print(f"✅ List destinations table exists ({len(list_dests)} entries)")
except Exception as e:
    print(f"❌ Error checking list_destinations: {e}")

# Statistics
print("\n\n📊 STATISTICS")
print("-"*70)

try:
    # Count destinations with new data
    total_dests = supabase.table('destinations').select('id', count='exact').execute()
    with_architect = supabase.table('destinations').select('id', count='exact').not_.is_('architect', 'null').execute()
    with_brand = supabase.table('destinations').select('id', count='exact').not_.is_('brand', 'null').execute()
    with_michelin = supabase.table('destinations').select('id', count='exact').not_.is_('michelin_stars', 'null').execute()
    
    print(f"Total destinations: {total_dests.count}")
    print(f"With architect data: {with_architect.count} ({with_architect.count/total_dests.count*100:.1f}%)")
    print(f"With brand data: {with_brand.count} ({with_brand.count/total_dests.count*100:.1f}%)")
    print(f"With Michelin stars: {with_michelin.count} ({with_michelin.count/total_dests.count*100:.1f}%)")
    
except Exception as e:
    print(f"❌ Error getting statistics: {e}")

print("\n" + "="*70)
print("✅ MIGRATION VERIFICATION COMPLETE!")
print("="*70)
