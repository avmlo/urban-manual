# Running AI Fields Generation on Server

## Quick Start

Run this single command on your Ubuntu server:

```bash
cd /home/ubuntu/urban-manual && bash scripts/run_ai_fields_generation.sh
```

## Manual Setup (if helper script doesn't work)

### 1. First: Run SQL Migration

In Supabase SQL Editor, run:
```sql
-- File: migrations/2025_01_04_add_ai_fields_columns.sql
```

### 2. Install Dependencies

```bash
cd /home/ubuntu/urban-manual
pip3 install supabase google-generativeai
```

### 3. Set Environment Variables

```bash
export GOOGLE_API_KEY=your_google_api_key_here
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 4. Run the Script

```bash
python3.11 scripts/generate_ai_fields.py
```

## Expected Output

The script will:
- Process all 919 destinations
- Generate vibe_tags, keywords, short_summary, and search_keywords
- Show progress every 10 destinations
- Take approximately 15-20 minutes
- Skip destinations that already have AI fields

## Monitoring Progress

You can monitor in real-time - the script shows:
- Current destination being processed
- Progress percentage
- Estimated time remaining
- Success/failure count

## Troubleshooting

**Error: GOOGLE_API_KEY not set**
- Make sure you've exported the environment variable
- Check: `echo $GOOGLE_API_KEY`

**Error: Module not found**
- Install dependencies: `pip3 install -r scripts/requirements.txt`

**Error: Column does not exist**
- Make sure you ran the SQL migration first

**Rate limit errors**
- The script automatically handles rate limiting (15 req/min)
- If you see errors, the script will wait and retry
