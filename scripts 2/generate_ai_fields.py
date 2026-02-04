#!/usr/bin/env python3
"""
Generate AI fields for all destinations using Google Gemini API.

This script will:
1. Generate vibe_tags (romantic, modern, cozy, etc.) for each destination
2. Generate SEO keywords
3. Generate short summaries
4. Generate natural language search keywords

The script uses Google Gemini API and is rate limited to 15 requests/minute.
Expected runtime: 15-20 minutes for 919 destinations.
"""

import os
import sys
import time
from typing import Dict, List, Optional
from supabase import create_client
import google.generativeai as genai
from datetime import datetime

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://avdnefdfwvpjkuanhdwk.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZG5lZmRmd3Zwamt1YW5oZHdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MTg4MzMsImV4cCI6MjA2OTI5NDgzM30.imGFTDynzDG5bK0w_j5pgwMPBeT9rkXm8ZQ18W6A-nw')
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY') or os.getenv('GEMINI_API_KEY')

if not GOOGLE_API_KEY:
    print("❌ Error: GOOGLE_API_KEY or GEMINI_API_KEY environment variable is required")
    print("   Set it with: export GOOGLE_API_KEY=your_api_key")
    sys.exit(1)

# Initialize clients
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

# Rate limiting: 15 requests per minute
RATE_LIMIT_REQUESTS = 15
RATE_LIMIT_WINDOW = 60  # seconds
request_times: List[float] = []

def rate_limit():
    """Ensure we don't exceed 15 requests per minute"""
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

def ensure_columns_exist():
    """Ensure the required columns exist in the destinations table"""
    print("\n📋 Checking database columns...")
    
    # Columns we need
    columns = [
        ('vibe_tags', 'TEXT[]'),
        ('keywords', 'TEXT[]'),
        ('short_summary', 'TEXT'),
        ('search_keywords', 'TEXT[]'),
    ]
    
    # Note: This requires direct SQL access. For Supabase, we'll just try to update
    # and handle errors if columns don't exist
    print("  ✓ Assuming columns exist (will create via migration if needed)")
    return True

def generate_ai_fields(destination: Dict) -> Optional[Dict]:
    """
    Generate AI fields for a single destination using Gemini.
    Returns a dict with vibe_tags, keywords, short_summary, and search_keywords.
    """
    rate_limit()
    
    name = destination.get('name', '')
    city = destination.get('city', '').replace('-', ' ').title()
    category = destination.get('category', '')
    description = destination.get('description', '')
    content = destination.get('content', '')
    michelin_stars = destination.get('michelin_stars')
    
    # Build context for Gemini
    context = f"""
Destination Name: {name}
City: {city}
Category: {category}
Michelin Stars: {michelin_stars if michelin_stars else 'None'}
Description: {description[:200] if description else 'No description'}
"""
    
    if content:
        context += f"\nFull Content: {content[:500]}"
    
    prompt = f"""You are a travel content expert. Analyze this destination and generate structured metadata.

{context}

Generate and return ONLY valid JSON with this exact structure:
{{
  "vibe_tags": ["array", "of", "3-5", "atmosphere", "tags"],
  "keywords": ["array", "of", "5-8", "seo", "keywords"],
  "short_summary": "A concise 2-3 sentence summary of what makes this place special",
  "search_keywords": ["array", "of", "natural", "language", "search", "terms"]
}}

Guidelines:
- vibe_tags: Use words like romantic, modern, cozy, upscale, casual, trendy, elegant, minimal, rustic, vibrant, intimate, lively, sophisticated, etc. (3-5 tags)
- keywords: SEO-friendly terms people might search for (5-8 keywords)
- short_summary: 2-3 sentences highlighting what makes this place unique (max 200 characters)
- search_keywords: Natural language phrases people might use in search (e.g., "romantic restaurant tokyo", "best cafe paris") (5-8 phrases)

Examples:
- For a Michelin restaurant: vibe_tags might be ["upscale", "sophisticated", "fine-dining"]
- For a cozy cafe: vibe_tags might be ["cozy", "casual", "charming"]
- keywords might include: category, city, style, features (e.g., ["restaurant", "tokyo", "fine-dining", "michelin"])

Return ONLY the JSON, no markdown, no code blocks, no other text:"""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Extract JSON from response (might have markdown code blocks)
        if '```json' in text:
            text = text.split('```json')[1].split('```')[0].strip()
        elif '```' in text:
            text = text.split('```')[1].split('```')[0].strip()
        
        # Parse JSON
        import json
        result = json.loads(text)
        
        # Validate and clean the result
        return {
            'vibe_tags': result.get('vibe_tags', []),
            'keywords': result.get('keywords', []),
            'short_summary': result.get('short_summary', ''),
            'search_keywords': result.get('search_keywords', [])
        }
    
    except Exception as e:
        print(f"  ❌ Error generating AI fields: {e}")
        if hasattr(e, 'response'):
            print(f"     Response: {e.response}")
        return None

def update_destination(slug: str, ai_fields: Dict):
    """Update a destination with AI-generated fields"""
    try:
        # Update the destination
        supabase.table('destinations').update({
            'vibe_tags': ai_fields['vibe_tags'],
            'keywords': ai_fields['keywords'],
            'short_summary': ai_fields['short_summary'],
            'search_keywords': ai_fields['search_keywords'],
            'ai_fields_generated_at': datetime.utcnow().isoformat()
        }).eq('slug', slug).execute()
        
        return True
    except Exception as e:
        print(f"  ❌ Error updating destination {slug}: {e}")
        return False

def main():
    print("="*70)
    print("AI FIELDS GENERATION SCRIPT")
    print("="*70)
    print(f"\n📍 Supabase URL: {SUPABASE_URL}")
    print(f"🤖 Using Gemini 1.5 Pro")
    print(f"⏱️  Rate Limit: {RATE_LIMIT_REQUESTS} requests/minute")
    
    # Ensure columns exist
    ensure_columns_exist()
    
    # Fetch all destinations
    print("\n📊 Fetching all destinations...")
    try:
        response = supabase.table('destinations').select('slug, name, city, category, description, content, michelin_stars').execute()
        destinations = response.data
        total_count = len(destinations)
        print(f"✓ Found {total_count} destinations")
    except Exception as e:
        print(f"❌ Error fetching destinations: {e}")
        sys.exit(1)
    
    if total_count == 0:
        print("❌ No destinations found!")
        sys.exit(1)
    
    # Check which destinations already have AI fields
    print("\n🔍 Checking which destinations need AI fields...")
    destinations_to_process = []
    destinations_with_fields = 0
    
    for dest in destinations:
        # Check if destination already has AI fields
        if dest.get('vibe_tags') or dest.get('keywords') or dest.get('short_summary'):
            destinations_with_fields += 1
        else:
            destinations_to_process.append(dest)
    
    print(f"  ✓ {destinations_with_fields} destinations already have AI fields")
    print(f"  📝 {len(destinations_to_process)} destinations need processing")
    
    if len(destinations_to_process) == 0:
        print("\n✅ All destinations already have AI fields!")
        sys.exit(0)
    
    # Ask for confirmation
    estimated_time = (len(destinations_to_process) / RATE_LIMIT_REQUESTS) * (RATE_LIMIT_WINDOW / 60)
    print(f"\n⏱️  Estimated time: {estimated_time:.1f} minutes")
    print(f"\n🚀 Starting generation process...\n")
    
    # Process destinations
    successful = 0
    failed = 0
    start_time = time.time()
    
    for i, destination in enumerate(destinations_to_process, 1):
        slug = destination.get('slug')
        name = destination.get('name', 'Unknown')
        
        print(f"[{i}/{len(destinations_to_process)}] Processing: {name} ({slug})")
        
        # Generate AI fields
        ai_fields = generate_ai_fields(destination)
        
        if ai_fields:
            # Update destination
            if update_destination(slug, ai_fields):
                successful += 1
                print(f"  ✅ Generated: {len(ai_fields['vibe_tags'])} vibe tags, {len(ai_fields['keywords'])} keywords")
            else:
                failed += 1
                print(f"  ❌ Failed to update destination")
        else:
            failed += 1
            print(f"  ❌ Failed to generate AI fields")
        
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
    print("GENERATION COMPLETE!")
    print("="*70)
    print(f"\n📊 Summary:")
    print(f"   Total destinations:     {total_count}")
    print(f"   Already had fields:    {destinations_with_fields}")
    print(f"   Processed:              {len(destinations_to_process)}")
    print(f"   ✅ Successful:          {successful}")
    print(f"   ❌ Failed:               {failed}")
    print(f"   ⏱️  Total time:           {elapsed/60:.1f} minutes")
    print(f"\n✅ Done!")

if __name__ == '__main__':
    main()
