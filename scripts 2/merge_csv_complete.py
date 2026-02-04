#!/usr/bin/env python3
"""
Complete CSV Merge Script - Option B
This script will:
1. Update existing records with CSV data (matching by name + city)
2. Add genuinely new destinations
3. Generate a report for manual review
"""

import csv
import json
from supabase import create_client
from dotenv import load_dotenv
import os
from difflib import SequenceMatcher

load_dotenv('.env.local')

# Supabase setup
url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

def normalize_name(name):
    """Normalize name for comparison"""
    if not name:
        return ""
    name = name.lower().strip()
    name = name.replace('the ', '').replace(' hotel', '').replace(' restaurant', '')
    name = name.replace('&', 'and').replace('-', ' ')
    return name

def similarity(a, b):
    """Calculate similarity ratio between two strings"""
    if not a or not b:
        return 0
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

print("="*80)
print("COMPLETE CSV MERGE - OPTION B")
print("="*80)
print("\nThis script will:")
print("  1. Update 63 existing records with CSV data")
print("  2. Add ~10 new destinations")
print("  3. Generate manual review list\n")

# Load existing destinations
print("📊 Loading existing destinations from Supabase...")
response = supabase.table('destinations').select('*').execute()
existing_destinations = {dest['id']: dest for dest in response.data}
print(f"   Found {len(existing_destinations)} destinations\n")

# Load CSV data
print("📊 Loading CSV data...")
csv_path = '/home/ubuntu/upload/TheSpaceManual-Spaces.csv'
csv_destinations = []

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        csv_destinations.append(row)

print(f"   Found {len(csv_destinations)} destinations in CSV\n")

# Statistics
updated_count = 0
added_count = 0
skipped_count = 0
manual_review = []

print("="*80)
print("PHASE 1: UPDATING EXISTING RECORDS")
print("="*80)

for csv_dest in csv_destinations:
    csv_title = csv_dest.get('Title', '').strip()
    csv_slug = csv_dest.get('Slug', '').strip()
    csv_city = csv_dest.get('City', '').strip()
    
    if not csv_title or not csv_city:
        continue
    
    # Look for matching destination by name + city
    matched_dest = None
    best_match_score = 0
    
    for db_id, db_dest in existing_destinations.items():
        db_name = db_dest.get('name', '')
        db_city = db_dest.get('city', '')
        
        # Check if same city
        if csv_city == db_city:
            # Calculate name similarity
            name_sim = similarity(normalize_name(csv_title), normalize_name(db_name))
            
            # High confidence match (>90%)
            if name_sim > 0.9 and name_sim > best_match_score:
                matched_dest = db_dest
                best_match_score = name_sim
    
    if matched_dest and best_match_score > 0.9:
        # Update existing record
        update_payload = {}
        
        # Add architect if present
        architect = csv_dest.get('Architect / Interior', '').strip()
        if architect:
            update_payload['architect'] = architect
        
        # Add brand if present
        brand = csv_dest.get('Brand', '').strip()
        if brand:
            update_payload['brand'] = brand
        
        # Add year_opened if present
        year_opened = csv_dest.get('Year of Opening', '').strip()
        if year_opened:
            try:
                update_payload['year_opened'] = int(year_opened)
            except ValueError:
                pass
        
        # Add michelin_stars if present
        michelin = csv_dest.get('Michelin Stars', '').strip()
        if michelin:
            try:
                update_payload['michelin_stars'] = int(michelin)
            except ValueError:
                pass
        
        # Add neighborhood if present
        neighborhood = csv_dest.get('Location', '').strip()
        if neighborhood:
            update_payload['neighborhood'] = neighborhood
        
        # Add gallery if present
        gallery = csv_dest.get('Gallery', '').strip()
        if gallery:
            gallery_images = [img.strip() for img in gallery.split(';') if img.strip()]
            if gallery_images:
                update_payload['gallery'] = gallery_images
        
        # Only update if we have new data
        if update_payload:
            try:
                supabase.table('destinations').update(update_payload).eq('id', matched_dest['id']).execute()
                print(f"  ✅ Updated: {csv_title} (matched to: {matched_dest['name']})")
                updated_count += 1
            except Exception as e:
                print(f"  🔥 Failed to update {csv_title}: {e}")
        else:
            print(f"  ⚠️  No new data for: {csv_title}")
            skipped_count += 1

print(f"\n✅ Phase 1 Complete: {updated_count} records updated\n")

print("="*80)
print("PHASE 2: ADDING NEW DESTINATIONS")
print("="*80)

# Now find destinations that don't match anything (genuinely new)
for csv_dest in csv_destinations:
    csv_title = csv_dest.get('Title', '').strip()
    csv_slug = csv_dest.get('Slug', '').strip()
    csv_city = csv_dest.get('City', '').strip()
    csv_type = csv_dest.get('Type', '').strip()
    
    if not csv_title or not csv_city:
        continue
    
    # Check if this destination matches any existing one
    found_match = False
    best_match_score = 0
    
    for db_id, db_dest in existing_destinations.items():
        db_name = db_dest.get('name', '')
        db_city = db_dest.get('city', '')
        
        if csv_city == db_city:
            name_sim = similarity(normalize_name(csv_title), normalize_name(db_name))
            if name_sim > 0.9:
                found_match = True
                break
            elif name_sim > best_match_score:
                best_match_score = name_sim
    
    # If no high-confidence match found
    if not found_match:
        # Check if it's a low-confidence match (70-90%)
        if best_match_score >= 0.7:
            manual_review.append({
                'csv_title': csv_title,
                'csv_slug': csv_slug,
                'csv_city': csv_city,
                'csv_type': csv_type,
                'similarity': best_match_score,
                'action': 'MANUAL_REVIEW_NEEDED'
            })
            print(f"  ⚠️  Manual review needed: {csv_title} ({best_match_score*100:.1f}% match)")
        else:
            # Genuinely new destination - add it
            insert_payload = {
                'name': csv_title,
                'slug': csv_slug,
                'city': csv_city,
                'category': csv_type or 'Others',
                'country': 'Unknown',  # Will need to be filled in manually
                'description': '',
                'content': '',
            }
            
            # Add optional fields
            architect = csv_dest.get('Architect / Interior', '').strip()
            if architect:
                insert_payload['architect'] = architect
            
            brand = csv_dest.get('Brand', '').strip()
            if brand:
                insert_payload['brand'] = brand
            
            year_opened = csv_dest.get('Year of Opening', '').strip()
            if year_opened:
                try:
                    insert_payload['year_opened'] = int(year_opened)
                except ValueError:
                    pass
            
            michelin = csv_dest.get('Michelin Stars', '').strip()
            if michelin:
                try:
                    insert_payload['michelin_stars'] = int(michelin)
                except ValueError:
                    pass
            
            neighborhood = csv_dest.get('Location', '').strip()
            if neighborhood:
                insert_payload['neighborhood'] = neighborhood
            
            main_image = csv_dest.get('Main Image', '').strip()
            if main_image:
                insert_payload['image'] = main_image
            
            gallery = csv_dest.get('Gallery', '').strip()
            if gallery:
                gallery_images = [img.strip() for img in gallery.split(';') if img.strip()]
                if gallery_images:
                    insert_payload['gallery'] = gallery_images
            
            try:
                result = supabase.table('destinations').insert(insert_payload).execute()
                print(f"  ✅ Added new: {csv_title}")
                added_count += 1
            except Exception as e:
                print(f"  🔥 Failed to add {csv_title}: {e}")

print(f"\n✅ Phase 2 Complete: {added_count} new destinations added\n")

# Save manual review list
if manual_review:
    with open('/home/ubuntu/urban-manual/manual_review_needed.json', 'w') as f:
        json.dump(manual_review, f, indent=2)
    print(f"⚠️  {len(manual_review)} destinations need manual review")
    print(f"   Saved to: /home/ubuntu/urban-manual/manual_review_needed.json\n")

# Final summary
print("="*80)
print("MIGRATION COMPLETE!")
print("="*80)
print(f"\n📊 Summary:")
print(f"  ✅ Updated existing records: {updated_count}")
print(f"  ✅ Added new destinations: {added_count}")
print(f"  ⚠️  Manual review needed: {len(manual_review)}")
print(f"  ⏭️  Skipped (no new data): {skipped_count}")
print(f"\n{'='*80}\n")

