# How to Find Your PostgreSQL Connection String in Supabase

## Step-by-Step Visual Guide

### Step 1: Open Settings
- In the Supabase dashboard, look at the **left sidebar**
- Scroll down to find **Settings** (gear icon ⚙️)
- Click on **Settings**

### Step 2: Go to Database Settings
- In the Settings page, you'll see multiple sections
- Click on **Database** (NOT "Tables" - that's in a different section)
- The Database settings page will open

### Step 3: Find Connection String Section
On the Database settings page, scroll down to find:

**Option A: Connection String Section**
- Look for a section titled **"Connection string"** or **"Connection info"**
- You'll see multiple tabs: **URI**, **JDBC**, **Connection pooling**

**Option B: Connection Pooling (Recommended)**
- Click the **"Connection pooling"** tab
- You'll see different modes: **Session**, **Transaction**, **Statement**
- Select **Transaction** mode (best for serverless/Vercel)
- Copy the connection string shown

### Step 4: Get Your Database Password
- On the same Database settings page
- Look for **"Database password"** section
- If you see `[YOUR-PASSWORD]` in the connection string, you need to:
  1. Find your actual database password
  2. Or click **"Reset database password"** to create a new one
  3. **Save the password** - you'll only see it once!

### Step 5: Construct Full Connection String
The connection string will look like:
```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

Replace `[YOUR-PASSWORD]` with your actual password.

## Alternative: Direct Connection String

If you can't find the connection pooling option:

1. Still on **Settings → Database**
2. Look for **"Connection string"** or **"URI"** tab
3. You'll see something like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
4. **Important**: Change the port from `5432` to `6543` for connection pooling
5. Change `db.[PROJECT-REF].supabase.co` to `aws-0-us-east-1.pooler.supabase.com`

## Quick Alternative: Use Environment Variables

If you can't find the connection string, you can construct it manually:

1. **Get your project reference**:
   - It's in your Supabase URL: `https://[PROJECT-REF].supabase.co`
   - Or in Settings → General → Reference ID

2. **Get your database password**:
   - Settings → Database → Database password
   - Reset if needed

3. **Construct the connection string**:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

   Replace:
   - `[PROJECT-REF]` with your project reference
   - `[PASSWORD]` with your database password (URL-encode if needed)

## Example

If your:
- Project URL: `https://abcdefghijklmnop.supabase.co`
- Project Reference: `abcdefghijklmnop`
- Password: `MySecurePassword123!`

Your connection string would be:
```
postgresql://postgres.abcdefghijklmnop:MySecurePassword123%21@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

Note: Special characters in password need URL encoding (`!` becomes `%21`)

## Still Can't Find It?

If you're still having trouble:

1. **Check you're in the right place**:
   - Settings → Database (NOT Database → Tables)
   - The connection string is in Settings, not in the Database section

2. **Try the API approach**:
   - You can also get it via Supabase CLI or API
   - But the dashboard is usually easiest

3. **Contact Support**:
   - Supabase support can help you locate it
   - Or check Supabase documentation

## What to Do With It

Once you have the connection string:

1. Copy it
2. Go to Vercel → Your Project → Settings → Environment Variables
3. Add new variable:
   - Name: `POSTGRES_URL`
   - Value: Paste your connection string
   - Environment: Production, Preview, Development
4. Save and redeploy

