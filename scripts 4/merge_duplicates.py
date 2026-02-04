#!/usr/bin/env python3
"""
Merge Duplicate Destinations Script
This script will:
1. Fetch both entries for each duplicate pair
2. Merge all information (keeping best data from each)
3. Update the "keep" entry with merged data
4. Delete the duplicate entry
"""

import json
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv('.env.local')

# Supabase setup
url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

# Define the merges to perform
MERGES = [
    {
        'name': 'The Mark (New York)',
        'keep_slug': 'the-mark',
        'delete_slug': 'the-mark-hotel'
    },
    {
        'name': 'Park Hyatt Milano (Milan)',
        'keep_slug': 'park-hyatt-milano',
        'delete_slug': 'park-hyatt-milan'
    },
    {
        'name': 'Hotel Higashiyama by Kyoto Tokyu (Kyoto)',
        'keep_slug': 'hotel-higashiyama-by-kyoto-tokyu',
        'delete_slug': 'the-hotel-higashiyama-kyoto-tokyu'
    },
    {
        'name': 'La Samaritaine (Paris)',
        'keep_slug': 'la-samaritaine',
        'delete_slug': 'samaritaine'
    },
    {
        'name': 'Experimental Marais (Paris)',
        'keep_slug': 'experimental-marais',
        'delete_slug': 'hotel-experimental-marais'
    }
]

def merge_field(keep_value, delete_value, field_name):
    """
    Merge two field values, keeping the best data.
    Priority: non-null > longer text > keep_value
    """
    # If delete_value is null/empty, keep the keep_value
    if delete_value is None or delete_value == '' or delete_value == []:
        return keep_value
    
    # If keep_value is null/empty, use delete_value
    if keep_value is None or keep_value == '' or keep_value == []:
        return delete_value
    
    # For text fields, prefer longer content
    if isinstance(keep_value, str) and isinstance(delete_value, str):
        if len(delete_value) > len(keep_value):
            return delete_value
        return keep_value
    
    # For arrays (like gallery), combine them
    if isinstance(keep_value, list) and isinstance(delete_value, list):
        # Combine and deduplicate
        combined = list(set(keep_value + delete_value))
        return combined if combined else keep_value
    
    # For numbers, prefer non-zero
    if isinstance(keep_value, (int, float)) and isinstance(delete_value, (int, float)):
        if delete_value != 0 and keep_value == 0:
            return delete_value
        return keep_value
    
    # Default: keep the keep_value
    return keep_value

def merge_destinations(keep_slug, delete_slug):
    """
    Merge two destination entries.
    Returns the merged data and both original entries.
    """
    # Fetch both entries
    keep_response = supabase.table('destinations').select('*').eq('slug', keep_slug).execute()
    delete_response = supabase.table('destinations').select('*').eq('slug', delete_slug).execute()
    
    if not keep_response.data or not delete_response.data:
        return None, None, None
    
    keep_entry = keep_response.data[0]
    delete_entry = delete_response.data[0]
    
    # Fields to merge
    fields_to_merge = [
        'name', 'description', 'content', 'image', 'gallery',
        'architect', 'brand', 'year_opened', 'michelin_stars',
        'neighborhood', 'category', 'country', 'city'
    ]
    
    # Create merged data
    merged_data = {}
    changes_made = []
    
    for field in fields_to_merge:
        keep_value = keep_entry.get(field)
        delete_value = delete_entry.get(field)
        
        merged_value = merge_field(keep_value, delete_value, field)
        
        # Only include if different from current keep_value
        if merged_value != keep_value:
            merged_data[field] = merged_value
            changes_made.append({
                'field': field,
                'old': keep_value,
                'new': merged_value,
                'source': 'merged from duplicate'
            })
    
    return merged_data, keep_entry, delete_entry, changes_made

print("="*80)
print("DUPLICATE MERGE SCRIPT")
print("="*80)
print(f"\nMerging {len(MERGES)} duplicate pairs...\n")

merge_results = []

for merge_config in MERGES:
    print(f"{'='*80}")
    print(f"Processing: {merge_config['name']}")
    print(f"{'='*80}")
    print(f"  Keep:   {merge_config['keep_slug']}")
    print(f"  Delete: {merge_config['delete_slug']}\n")
    
    # Perform the merge
    merged_data, keep_entry, delete_entry, changes = merge_destinations(
        merge_config['keep_slug'],
        merge_config['delete_slug']
    )
    
    if not keep_entry or not delete_entry:
        print(f"  ❌ ERROR: Could not find one or both entries!")
        print(f"     Keep slug found: {keep_entry is not None}")
        print(f"     Delete slug found: {delete_entry is not None}\n")
        merge_results.append({
            'name': merge_config['name'],
            'status': 'error',
            'message': 'Entry not found'
        })
        continue
    
    # Show what will be merged
    if changes:
        print(f"  📝 Changes to be made ({len(changes)} fields):")
        for change in changes:
            print(f"     • {change['field']}:")
            print(f"       Old: {str(change['old'])[:60]}...")
            print(f"       New: {str(change['new'])[:60]}...")
    else:
        print(f"  ℹ️  No data to merge (keep entry already has all best data)")
    
    # Show what will be preserved from delete entry
    print(f"\n  🗑️  Entry to be deleted (ID: {delete_entry['id']}):")
    print(f"     Name: {delete_entry.get('name')}")
    print(f"     Slug: {delete_entry.get('slug')}")
    
    # Update the keep entry if there are changes
    if merged_data:
        try:
            update_response = supabase.table('destinations').update(merged_data).eq('id', keep_entry['id']).execute()
            print(f"\n  ✅ Updated keep entry (ID: {keep_entry['id']}) with merged data")
        except Exception as e:
            print(f"\n  ❌ ERROR updating keep entry: {e}")
            merge_results.append({
                'name': merge_config['name'],
                'status': 'error',
                'message': f'Update failed: {e}'
            })
            continue
    else:
        print(f"\n  ℹ️  No update needed for keep entry")
    
    # Delete the duplicate entry
    try:
        delete_response = supabase.table('destinations').delete().eq('id', delete_entry['id']).execute()
        print(f"  ✅ Deleted duplicate entry (ID: {delete_entry['id']})")
        
        merge_results.append({
            'name': merge_config['name'],
            'keep_id': keep_entry['id'],
            'keep_slug': keep_entry['slug'],
            'deleted_id': delete_entry['id'],
            'deleted_slug': delete_entry['slug'],
            'fields_merged': len(changes),
            'status': 'success'
        })
    except Exception as e:
        print(f"  ❌ ERROR deleting duplicate: {e}")
        merge_results.append({
            'name': merge_config['name'],
            'status': 'error',
            'message': f'Delete failed: {e}'
        })
    
    print()

# Final summary
print("="*80)
print("MERGE COMPLETE!")
print("="*80)

successful = [r for r in merge_results if r.get('status') == 'success']
failed = [r for r in merge_results if r.get('status') == 'error']

print(f"\n✅ Successfully merged: {len(successful)}")
print(f"❌ Failed: {len(failed)}\n")

if successful:
    print("Successful merges:")
    for result in successful:
        print(f"  • {result['name']}")
        print(f"    Kept: {result['keep_slug']} (ID: {result['keep_id']})")
        print(f"    Deleted: {result['deleted_slug']} (ID: {result['deleted_id']})")
        print(f"    Fields merged: {result['fields_merged']}")
        print()

if failed:
    print("Failed merges:")
    for result in failed:
        print(f"  • {result['name']}: {result['message']}")
    print()

# Save results
with open('/home/ubuntu/urban-manual/merge_results.json', 'w') as f:
    json.dump(merge_results, f, indent=2)

print(f"📁 Results saved to: /home/ubuntu/urban-manual/merge_results.json")
print("="*80)

# Verify final count
final_count = supabase.table('destinations').select('id', count='exact').execute()
print(f"\n📊 Total destinations after merge: {final_count.count}")
print(f"   (Should be {924 - len(successful)} if all merges succeeded)")
print()

