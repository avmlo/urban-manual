# Simple Connection String Setup (No Dashboard Access Needed)

If you can't find the connection string in the Supabase dashboard, you can set it up using just your Supabase URL and database password.

## Method 1: Use Password Only (Easiest)

This is the simplest approach - Payload will construct the connection string automatically.

### Step 1: Get Your Supabase URL
You should already have this. It looks like:
```
https://abcdefghijklmnop.supabase.co
```

### Step 2: Get Your Database Password

1. Go to Supabase Dashboard
2. Click **Settings** (gear icon) in left sidebar
3. Click **Database**
4. Scroll to **Database password** section
5. If you don't know it, click **Reset database password**
6. **Copy the password** (you'll only see it once!)

### Step 3: Set Environment Variables in Vercel

Go to Vercel → Your Project → Settings → Environment Variables

Add these two variables:

**Variable 1:**
- Name: `NEXT_PUBLIC_SUPABASE_URL`
- Value: `https://your-project-ref.supabase.co` (your Supabase URL)
- Environment: Production, Preview, Development

**Variable 2:**
- Name: `SUPABASE_DB_PASSWORD`
- Value: `your-database-password-here` (the password from step 2)
- Environment: Production, Preview, Development

**That's it!** Payload will automatically construct the connection string.

## Method 2: Manual Connection String

If you prefer to set the full connection string manually:

### Step 1: Get Your Project Reference

From your Supabase URL:
- If your URL is: `https://abcdefghijklmnop.supabase.co`
- Your project reference is: `abcdefghijklmnop`

### Step 2: Get Your Database Password

Same as Method 1, Step 2 above.

### Step 3: Construct Connection String

Use this template:
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

Replace:
- `[PROJECT-REF]` with your project reference
- `[PASSWORD]` with your database password

**Important:** If your password has special characters, URL-encode them:
- `!` becomes `%21`
- `@` becomes `%40`
- `#` becomes `%23`
- `$` becomes `%24`
- `%` becomes `%25`
- etc.

### Step 4: Set in Vercel

Go to Vercel → Your Project → Settings → Environment Variables

Add:
- Name: `POSTGRES_URL`
- Value: Your constructed connection string
- Environment: Production, Preview, Development

## Which Method to Use?

**Use Method 1 (Password Only)** if:
- ✅ You want the simplest setup
- ✅ You already have `NEXT_PUBLIC_SUPABASE_URL` set
- ✅ You don't want to deal with URL encoding

**Use Method 2 (Manual String)** if:
- ✅ You want full control
- ✅ You prefer to see the full connection string
- ✅ You're comfortable with URL encoding

## Testing

After setting the environment variables:

1. **Redeploy** your Vercel project
2. Visit `/api/cms-health` on your deployed site
3. Check the response - it should show connection status

## Troubleshooting

### "Password encoding error"
- Make sure special characters in password are URL-encoded
- Or use Method 1 (password only) - it handles encoding automatically

### "Connection refused"
- Try using direct connection instead of pooling:
  - Change port from `6543` to `5432`
  - Change host from `aws-0-us-east-1.pooler.supabase.com` to `db.[PROJECT-REF].supabase.co`

### "Authentication failed"
- Double-check your password is correct
- Try resetting the database password in Supabase
- Make sure you're using the database password, not the API key

## Quick Reference

**Your Supabase URL format:**
```
https://[PROJECT-REF].supabase.co
```

**Connection string format (pooling):**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Connection string format (direct):**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

