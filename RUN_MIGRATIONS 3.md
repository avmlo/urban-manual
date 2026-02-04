# Run Supabase Migrations

## Quick Command

From the project root directory (`/Users/alxrhg/urban-manual`), run:

```bash
bash scripts/supabase-migration-workflow-interactive.sh
```

Or:

```bash
./scripts/supabase-migration-workflow-interactive.sh
```

## Make Sure You're in the Right Directory

```bash
cd /Users/alxrhg/urban-manual
```

Then run the script.

## Alternative: Direct CLI Commands

If the script doesn't work, use these commands directly:

```bash
# 1. Login (opens browser)
npx supabase login

# 2. Link project (replace with your project ref)
npx supabase link --project-ref YOUR_PROJECT_REF

# 3. Check status
npx supabase migration list

# 4. Apply migrations
npx supabase db push
```

## Troubleshooting

**"No such file or directory"**
- Make sure you're in the project root: `cd /Users/alxrhg/urban-manual`
- Check the file exists: `ls -la scripts/supabase-migration-workflow-interactive.sh`
- Try: `bash scripts/supabase-migration-workflow-interactive.sh`

**"Permission denied"**
- Make it executable: `chmod +x scripts/supabase-migration-workflow-interactive.sh`

