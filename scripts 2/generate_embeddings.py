#!/usr/bin/env python3
"""
Generate vector embeddings for all destinations using Google's text-embedding-004 model.

This script will:
1. Fetch all destinations from Supabase
2. Generate embeddings for each destination using text-embedding-004
3. Update the destinations with their embeddings

Rate limited to avoid API quotas.
Expected runtime: ~15-20 minutes for 919 destinations.
"""

import os
import sys
import time
import json
from typing import Dict, List, Optional
from supabase import create_client

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://avdnefdfwvpjkuanhdwk.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZG5lZmRmd3Zwamt1YW5oZHdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MTg4MzMsImV4cCI6MjA2OTI5NDgzM30.imGFTDynzDG5bK0w_j5pgwMPBeT9rkXm8ZQ18W6A-nw')
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY') or os.getenv('GEMINI_API_KEY')

if not GOOGLE_API_KEY:
    print("❌ Error: GOOGLE_API_KEY or GEMINI_API_KEY environment variable is required")
    print("   Set it with: export GOOGLE_API_KEY=your_api_key")
    sys.exit(1)

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Rate limiting: 100 requests per minute (conservative)
RATE_LIMIT_REQUESTS = 100
RATE_LIMIT_WINDOW = 60  # seconds
request_times: List[float] = []

def rate_limit():
    """Ensure we don't exceed API rate limits"""
    global request_times
    now = time.time()
    
    # Remove requests older than 1 minute
    request_times = [t for t in request_times if now - t < RATE_LIMIT_WINDOW]
    
    # If we're at the limit, wait
    if len(request_times) >= RATE_LIMIT_REQUESTS:
        sleep_time = RATE_LIMIT_WINDOW - (now - request_times[0]) + 1
        print(f"⏳ Rate limit reached. Waiting {sleep_time:.1f} seconds...")
        time.sleep(sleep_time)
        request_times = []
    
    request_times.append(time.time())

def generate_embedding(text: str) -> Optional[List[float]]:
    """Generate embedding for text using Google's text-embedding-004 model"""
    rate_limit()
    
    try:
        response = requests.post(
            f'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={GOOGLE_API_KEY}',
            headers={'Content-Type': 'application/json'},
            json={
                'model': 'models/text-embedding-004',
                'content': {'parts': [{'text': text}]}
            },
            timeout=30
        )
        
        if not response.ok:
            print(f"  ❌ API error: {response.status_code} - {response.text}")
            return None
        
        data = response.json()
        
        if data.get('embedding', {}).get('values'):
            return data['embedding']['values']
        else:
            print(f"  ❌ Unexpected response format: {data}")
            return None
    
    except Exception as e:
        print(f"  ❌ Error generating embedding: {e}")
        return None

def build_search_text(destination: Dict) -> str:
    """Build search_text from destination fields"""
    parts = []
    
    if destination.get('name'):
        parts.append(destination['name'])
    if destination.get('description'):
        parts.append(destination['description'])
    if destination.get('content'):
        parts.append(destination['content'])
    if destination.get('city'):
        parts.append(destination['city'])
    if destination.get('category'):
        parts.append(destination['category'])
    if destination.get('country'):
        parts.append(destination['country'])
    
    # AI-generated fields
    if destination.get('vibe_tags'):
        parts.extend(destination['vibe_tags'])
    if destination.get('keywords'):
        parts.extend(destination['keywords'])
    if destination.get('search_keywords'):
        parts.extend(destination['search_keywords'])
    if destination.get('short_summary'):
        parts.append(destination['short_summary'])
    if destination.get('editorial_summary'):
        parts.append(destination['editorial_summary'])
    
    return ' '.join(str(p) for p in parts if p)

def update_destination_embedding(slug: str, embedding: List[float], search_text: str):
    """Update destination with embedding and search_text"""
    try:
        # Convert embedding list to PostgreSQL vector format string
        # PostgreSQL vector format: [1.0,2.0,3.0,...]
        embedding_str = '[' + ','.join(str(v) for v in embedding) + ']'
        
        # Use RPC function to update vector column (handles vector type correctly)
        result = supabase.rpc('update_destination_embedding', {
            'p_slug': slug,
            'p_embedding': embedding_str,
            'p_search_text': search_text
        }).execute()
        
        return True
    except Exception as e:
        print(f"  ❌ Error updating destination {slug}: {e}")
        # Try updating just search_text as fallback
        try:
            supabase.table('destinations').update({
                'search_text': search_text
            }).eq('slug', slug).execute()
            print(f"  ⚠️  Search text updated, but embedding failed. You may need to update embedding manually.")
            return False
        except Exception as update_error:
            print(f"  ❌ Error updating search_text: {update_error}")
            return False

def main():
    print("="*70)
    print("VECTOR EMBEDDINGS GENERATION SCRIPT")
    print("="*70)
    print(f"\n📍 Supabase URL: {SUPABASE_URL}")
    print(f"🤖 Using text-embedding-004 (768 dimensions)")
    print(f"⏱️  Rate Limit: {RATE_LIMIT_REQUESTS} requests/minute")
    
    # Fetch all destinations
    print("\n📊 Fetching all destinations...")
    try:
        response = supabase.table('destinations').select(
            'slug, name, city, category, country, description, content, '
            'vibe_tags, keywords, search_keywords, short_summary, editorial_summary'
        ).execute()
        destinations = response.data
        total_count = len(destinations)
        print(f"✓ Found {total_count} destinations")
    except Exception as e:
        print(f"❌ Error fetching destinations: {e}")
        sys.exit(1)
    
    if total_count == 0:
        print("❌ No destinations found!")
        sys.exit(1)
    
    # Check which destinations need embeddings
    print("\n🔍 Checking which destinations need embeddings...")
    destinations_to_process = []
    destinations_with_embeddings = 0
    
    for dest in destinations:
        # Check if destination already has embedding (we'll query this separately)
        # For now, process all and let the update handle duplicates
        destinations_to_process.append(dest)
    
    # Actually check which have embeddings
    try:
        response = supabase.table('destinations').select('slug').not_.is_('embedding', 'null').execute()
        existing_embeddings = set(d['slug'] for d in response.data)
        destinations_to_process = [d for d in destinations_to_process if d['slug'] not in existing_embeddings]
        destinations_with_embeddings = len(existing_embeddings)
        print(f"  ✓ {destinations_with_embeddings} destinations already have embeddings")
        print(f"  📝 {len(destinations_to_process)} destinations need embeddings")
    except Exception as e:
        print(f"  ⚠️  Could not check existing embeddings: {e}")
        print(f"  📝 Will process all {len(destinations_to_process)} destinations")
    
    if len(destinations_to_process) == 0:
        print("\n✅ All destinations already have embeddings!")
        sys.exit(0)
    
    # Ask for confirmation
    estimated_time = (len(destinations_to_process) / RATE_LIMIT_REQUESTS) * (RATE_LIMIT_WINDOW / 60)
    print(f"\n⏱️  Estimated time: {estimated_time:.1f} minutes")
    print(f"\n🚀 Starting embedding generation process...\n")
    
    # Process destinations
    successful = 0
    failed = 0
    start_time = time.time()
    
    for i, destination in enumerate(destinations_to_process, 1):
        slug = destination.get('slug')
        name = destination.get('name', 'Unknown')
        
        print(f"[{i}/{len(destinations_to_process)}] Processing: {name} ({slug})")
        
        # Build search text
        search_text = build_search_text(destination)
        if not search_text:
            print(f"  ⚠️  No searchable text found, skipping")
            failed += 1
            continue
        
        # Generate embedding
        embedding = generate_embedding(search_text)
        
        if embedding:
            # Update destination
            if update_destination_embedding(slug, embedding, search_text):
                successful += 1
                print(f"  ✅ Generated {len(embedding)}-dimensional embedding")
            else:
                failed += 1
                print(f"  ❌ Failed to update destination")
        else:
            failed += 1
            print(f"  ❌ Failed to generate embedding")
        
        # Progress update every 10 destinations
        if i % 10 == 0:
            elapsed = time.time() - start_time
            rate = i / elapsed
            remaining = (len(destinations_to_process) - i) / rate if rate > 0 else 0
            print(f"\n📊 Progress: {i}/{len(destinations_to_process)} ({i/len(destinations_to_process)*100:.1f}%)")
            print(f"   ⏱️  Elapsed: {elapsed/60:.1f} minutes, Remaining: {remaining/60:.1f} minutes\n")
    
    # Final summary
    elapsed = time.time() - start_time
    print("\n" + "="*70)
    print("EMBEDDING GENERATION COMPLETE!")
    print("="*70)
    print(f"\n📊 Summary:")
    print(f"   Total destinations:     {total_count}")
    print(f"   Already had embeddings: {destinations_with_embeddings}")
    print(f"   Processed:              {len(destinations_to_process)}")
    print(f"   ✅ Successful:          {successful}")
    print(f"   ❌ Failed:               {failed}")
    print(f"   ⏱️  Total time:           {elapsed/60:.1f} minutes")
    print(f"\n✅ Done!")

if __name__ == '__main__':
    main()
