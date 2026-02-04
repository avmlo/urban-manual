#!/usr/bin/env python3
"""
Fetch missing Google Places data for all destinations.
Focus on: price_level, opening_hours, phone_number, and any other missing fields.
"""

import requests
import time
import json
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv('.env.local')

# Configuration
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY") or os.environ.get("NEXT_PUBLIC_GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is required")
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# All fields we want from Google Places API
FIELDS = [
    'place_id',
    'name',
    'rating',
    'user_ratings_total',
    'price_level',
    'formatted_address',
    'formatted_phone_number',
    'international_phone_number',
    'website',
    'opening_hours',
    'geometry',
    'photos',
    'reviews',
    'types',
    'plus_code',
    'editorial_summary'
]

def fetch_place_details(place_id):
    """Fetch comprehensive place details from Google Places API"""
    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        'place_id': place_id,
        'fields': ','.join(FIELDS),
        'key': GOOGLE_API_KEY
    }
    
    try:
        response = requests.get(url, params=params)
        data = response.json()
        
        if data.get('status') == 'OK':
            return data.get('result', {})
        else:
            return None
    except Exception as e:
        print(f"  ❌ Exception: {e}")
        return None

def extract_data_for_update(result):
    """Extract and format data for Supabase update"""
    if not result:
        return None
    
    update_data = {}
    
    # Basic fields
    if 'rating' in result:
        update_data['rating'] = result['rating']
    
    if 'user_ratings_total' in result:
        update_data['user_ratings_total'] = result['user_ratings_total']
    
    if 'price_level' in result:
        update_data['price_level'] = result['price_level']
    
    if 'formatted_address' in result:
        update_data['formatted_address'] = result['formatted_address']
    
    if 'formatted_phone_number' in result:
        update_data['phone_number'] = result['formatted_phone_number']
    
    if 'international_phone_number' in result:
        update_data['international_phone_number'] = result['international_phone_number']
    
    if 'website' in result:
        update_data['website'] = result['website']
    
    # Opening hours
    if 'opening_hours' in result:
        update_data['opening_hours_json'] = result['opening_hours']
    
    # Geometry
    if 'geometry' in result and 'location' in result['geometry']:
        update_data['latitude'] = result['geometry']['location']['lat']
        update_data['longitude'] = result['geometry']['location']['lng']
    
    # Plus code
    if 'plus_code' in result:
        update_data['plus_code'] = result['plus_code'].get('global_code')
    
    # Types
    if 'types' in result:
        update_data['tags'] = result['types']
    
    # Reviews (limit to top 5)
    if 'reviews' in result:
        update_data['reviews_json'] = result['reviews'][:5]
    
    # Editorial summary (Google's AI description)
    if 'editorial_summary' in result and 'overview' in result['editorial_summary']:
        update_data['ai_summary'] = result['editorial_summary']['overview']
    
    return update_data if update_data else None

print("="*80)
print("FETCHING MISSING GOOGLE PLACES DATA")
print("="*80)

# Fetch all destinations with google_place_id
print("\n📊 Fetching destinations from Supabase...")
response = supabase.table('destinations').select('id, name, google_place_id, price_level, opening_hours_json, phone_number').execute()
destinations = response.data

print(f"✅ Total destinations: {len(destinations)}\n")

# Identify which destinations need updates
needs_price_level = [d for d in destinations if d.get('google_place_id') and not d.get('price_level')]
needs_opening_hours = [d for d in destinations if d.get('google_place_id') and not d.get('opening_hours_json')]
needs_phone = [d for d in destinations if d.get('google_place_id') and not d.get('phone_number')]
no_place_id = [d for d in destinations if not d.get('google_place_id')]

print("Missing Data Summary:")
print("-"*80)
print(f"  Missing price_level: {len(needs_price_level)}")
print(f"  Missing opening_hours: {len(needs_opening_hours)}")
print(f"  Missing phone_number: {len(needs_phone)}")
print(f"  No Google Place ID: {len(no_place_id)}")
print()

# Get all destinations with place_id (we'll fetch fresh data for all)
destinations_to_update = [d for d in destinations if d.get('google_place_id')]

print(f"🔄 Fetching fresh data for {len(destinations_to_update)} destinations...")
print("   (This will take about 15-20 minutes...)\n")

updated_count = 0
failed_count = 0
price_level_added = 0
opening_hours_added = 0
phone_added = 0

for i, dest in enumerate(destinations_to_update, 1):
    dest_id = dest['id']
    dest_name = dest['name']
    place_id = dest['google_place_id']
    
    # Progress indicator
    if i % 50 == 0:
        print(f"  Progress: {i}/{len(destinations_to_update)} ({i/len(destinations_to_update)*100:.1f}%)")
        print(f"    Added: price_level={price_level_added}, hours={opening_hours_added}, phone={phone_added}")
    
    # Fetch comprehensive data
    result = fetch_place_details(place_id)
    
    if result:
        # Extract data for update
        update_data = extract_data_for_update(result)
        
        if update_data:
            try:
                # Update destination
                supabase.table('destinations').update(update_data).eq('id', dest_id).execute()
                updated_count += 1
                
                # Track what was added
                if 'price_level' in update_data and not dest.get('price_level'):
                    price_level_added += 1
                if 'opening_hours_json' in update_data and not dest.get('opening_hours_json'):
                    opening_hours_added += 1
                if 'phone_number' in update_data and not dest.get('phone_number'):
                    phone_added += 1
                
                if i % 100 == 0:
                    print(f"  ✅ {dest_name[:40]}: Updated {len(update_data)} fields")
            except Exception as e:
                print(f"  ❌ Failed to update {dest_name}: {e}")
                failed_count += 1
        else:
            if i % 100 == 0:
                print(f"  ⏭️  {dest_name[:40]}: No new data")
    else:
        failed_count += 1
        if i % 100 == 0:
            print(f"  ❌ {dest_name[:40]}: API error")
    
    # Rate limiting - Google allows 10 requests per second
    time.sleep(0.11)  # ~9 requests per second to be safe

print(f"\n{'='*80}")
print("FETCH COMPLETE!")
print("="*80)
print(f"\n✅ Successfully updated: {updated_count}")
print(f"❌ Failed: {failed_count}")
print(f"\nData Added:")
print(f"  📊 price_level: {price_level_added}")
print(f"  🕐 opening_hours: {opening_hours_added}")
print(f"  📞 phone_number: {phone_added}")

# Verify final coverage
print(f"\n{'='*80}")
print("FINAL DATA COVERAGE")
print("="*80)

fields_to_check = [
    'price_level',
    'opening_hours_json',
    'phone_number',
    'rating',
    'user_ratings_total',
    'formatted_address',
    'international_phone_number',
    'website',
    'latitude',
    'longitude',
    'tags'
]

for field in fields_to_check:
    count_response = supabase.table('destinations').select('id', count='exact').not_.is_(field, 'null').execute()
    total_response = supabase.table('destinations').select('id', count='exact').execute()
    
    count = count_response.count
    total = total_response.count
    percentage = (count / total * 100) if total > 0 else 0
    
    print(f"  {field:30} - {count:4}/{total} ({percentage:5.1f}%)")

# Save results
results = {
    'total_destinations': len(destinations),
    'updated': updated_count,
    'failed': failed_count,
    'price_level_added': price_level_added,
    'opening_hours_added': opening_hours_added,
    'phone_added': phone_added
}

with open('/home/ubuntu/urban-manual/missing_data_fetch_results.json', 'w') as f:
    json.dump(results, f, indent=2)

print(f"\n{'='*80}")
print(f"✅ Results saved to: /home/ubuntu/urban-manual/missing_data_fetch_results.json")
print("="*80)

