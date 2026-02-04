# Troubleshooting Supabase Connection Issues

## Error: Connection Timeout

If you're seeing:
```
failed to connect to postgres: failed to connect to `host=aws-0-us-east-1.pooler.supabase.com ...`: timeout
```

## Possible Causes & Solutions

### 1. Project Might Be Paused

Supabase free tier projects pause after inactivity. Check in dashboard:
- Go to https://supabase.com/dashboard
- Check if your project shows "Paused" status
- If paused, click "Restore" to wake it up
- Wait 1-2 minutes for the project to fully restore

### 2. Network/Firewall Issues

Try these:
```bash
# Test basic connectivity
ping aws-0-us-east-1.pooler.supabase.com

# Check if port 5432 is accessible
nc -zv aws-0-us-east-1.pooler.supabase.com 5432
```

### 3. Use Direct Connection Instead of Pooler

The CLI might be trying to use a pooler connection. Try:

```bash
# Check your project connection settings
npx supabase projects list

# Try linking with explicit connection string
# Get connection string from: Supabase Dashboard > Settings > Database > Connection String
```

### 4. Apply Migrations via Dashboard Instead

If CLI connection fails, use the Supabase Dashboard:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Copy the contents of pending migration files from `supabase/migrations/`
5. Paste and run them one by one

### 5. Check Project Status via API

```bash
# Check if project is active
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  https://api.supabase.com/v1/projects/YOUR_PROJECT_REF
```

## Alternative: Manual Migration Application

Since CLI connection is timing out, here's how to apply migrations manually:

### Step 1: Check Which Migrations Are Applied

In Supabase Dashboard > Database > Migrations, see which ones are already applied.

### Step 2: Apply Pending Migrations

For each pending migration (like `421_ensure_michelin_is_dining.sql`):

1. Open the file: `supabase/migrations/421_ensure_michelin_is_dining.sql`
2. Copy all SQL content
3. Go to Supabase Dashboard > SQL Editor
4. Paste and run
5. Verify it executed successfully

### Step 3: Mark as Applied (Optional)

The migrations table should auto-update, but you can verify:
```sql
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC 
LIMIT 10;
```

## Recommended Approach Right Now

Given the connection timeout:

1. ✅ **Use Supabase Dashboard** to apply migrations manually
2. ✅ **Check project status** - make sure it's not paused
3. ✅ **Wait a few minutes** if you just restored a paused project
4. ✅ **Try CLI again later** once the project is fully active

## Most Important Migration to Apply

**421_ensure_michelin_is_dining.sql** - This ensures Michelin-starred destinations are categorized as Dining.

You can apply this manually via the dashboard right now.

