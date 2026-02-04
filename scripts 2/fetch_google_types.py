#!/usr/bin/env python3
"""
Fetch Google Place types for all destinations and update the tags field.
"""

import requests
import time
from supabase import create_client
from dotenv import load_dotenv
import os
from collections import Counter

load_dotenv('.env.local')

# Configuration
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY") or os.environ.get("NEXT_PUBLIC_GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is required")
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_place_types(place_id):
    """Fetch place types from Google Places API"""
    url = f"https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        'place_id': place_id,
        'fields': 'types',
        'key': GOOGLE_API_KEY
    }
    
    try:
        response = requests.get(url, params=params)
        data = response.json()
        
        if data.get('status') == 'OK':
            return data.get('result', {}).get('types', [])
        else:
            print(f"  ⚠️  API Error: {data.get('status')} - {data.get('error_message', 'Unknown error')}")
            return None
    except Exception as e:
        print(f"  ❌ Exception: {e}")
        return None

print("="*80)
print("FETCHING GOOGLE PLACE TYPES FOR ALL DESTINATIONS")
print("="*80)

# Fetch all destinations with google_place_id
print("\n📊 Fetching destinations from Supabase...")
response = supabase.table('destinations').select('id, name, google_place_id, category').execute()
destinations = response.data

destinations_with_place_id = [d for d in destinations if d.get('google_place_id')]
destinations_without_place_id = [d for d in destinations if not d.get('google_place_id')]

print(f"✅ Total destinations: {len(destinations)}")
print(f"   With Google Place ID: {len(destinations_with_place_id)}")
print(f"   Without Google Place ID: {len(destinations_without_place_id)}\n")

if destinations_without_place_id:
    print(f"⚠️  {len(destinations_without_place_id)} destinations don't have a Google Place ID")
    print("   These will be skipped.\n")

# Fetch types for each destination
print("🔄 Fetching place types from Google Places API...")
print("   (This will take a few minutes...)\n")

updated_count = 0
failed_count = 0
skipped_count = 0
all_types = Counter()

for i, dest in enumerate(destinations_with_place_id, 1):
    dest_id = dest['id']
    dest_name = dest['name']
    place_id = dest['google_place_id']
    
    # Progress indicator
    if i % 50 == 0:
        print(f"  Progress: {i}/{len(destinations_with_place_id)} ({i/len(destinations_with_place_id)*100:.1f}%)")
    
    # Fetch types
    types = fetch_place_types(place_id)
    
    if types:
        # Update destination with types
        try:
            supabase.table('destinations').update({'tags': types}).eq('id', dest_id).execute()
            updated_count += 1
            
            # Track type frequency
            for t in types:
                all_types[t] += 1
            
            if i % 100 == 0:
                print(f"  ✅ {dest_name[:40]}: {len(types)} types")
        except Exception as e:
            print(f"  ❌ Failed to update {dest_name}: {e}")
            failed_count += 1
    else:
        failed_count += 1
    
    # Rate limiting - Google allows 10 requests per second
    time.sleep(0.11)  # ~9 requests per second to be safe

print(f"\n{'='*80}")
print("FETCH COMPLETE!")
print("="*80)
print(f"\n✅ Successfully updated: {updated_count}")
print(f"❌ Failed: {failed_count}")
print(f"⏭️  Skipped (no place_id): {len(destinations_without_place_id)}")

# Show top types
print(f"\n\n{'='*80}")
print("TOP 30 GOOGLE PLACE TYPES FOUND")
print("="*80)

for i, (place_type, count) in enumerate(all_types.most_common(30), 1):
    percentage = count / updated_count * 100
    print(f"{i:2}. {place_type:30} - {count:4} destinations ({percentage:5.1f}%)")

# Save results
import json
results = {
    'total_destinations': len(destinations),
    'updated': updated_count,
    'failed': failed_count,
    'skipped': len(destinations_without_place_id),
    'type_frequency': dict(all_types.most_common())
}

with open('/home/ubuntu/urban-manual/google_fetch_results.json', 'w') as f:
    json.dump(results, f, indent=2)

print(f"\n\n{'='*80}")
print(f"✅ Results saved to: /home/ubuntu/urban-manual/google_fetch_results.json")
print("="*80)

