# How to Get Your PostgreSQL Connection String from Supabase

## Quick Steps

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Sign in to your account

2. **Select Your Project**
   - Click on your Urban Manual project

3. **Navigate to Database Settings**
   - In the left sidebar, click **Settings** (gear icon at the bottom)
   - In the Settings menu, click **Database** (not "Tables" - that's a different section)

4. **Find Connection String**
   - On the Database settings page, scroll down
   - Look for a section called **Connection string** or **Connection pooling**
   - You should see tabs like: **URI**, **JDBC**, **Connection pooling**
   - Click the **Connection pooling** tab
   - Under **Transaction** mode, you'll see the connection string
   - It will look like: `postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@...`
   - **Important**: You need to replace `[YOUR-PASSWORD]` with your actual database password

5. **Get Your Database Password**
   - If you don't know your password, on the same Database settings page
   - Look for **Database password** section
   - Click **Reset database password** if needed
   - Copy the password (you'll only see it once!)

6. **Construct the Full Connection String**
   - Take the connection string from step 4
   - Replace `[YOUR-PASSWORD]` with your actual password from step 5
   - Make sure to URL-encode the password if it has special characters

## Connection String Format

It should look like this:
```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Important:**
- Replace `[YOUR-PASSWORD]` with your actual database password
- Use **port 6543** (connection pooling) - this is better for Vercel/serverless
- Use **Transaction** mode, not Session mode

## Setting in Vercel

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your project

2. **Open Settings**
   - Click **Settings** tab
   - Click **Environment Variables**

3. **Add POSTGRES_URL**
   - Click **Add New**
   - Name: `POSTGRES_URL`
   - Value: Paste your connection string (with password)
   - Environment: Select **Production**, **Preview**, and **Development**
   - Click **Save**

4. **Redeploy**
   - Go to **Deployments** tab
   - Click the three dots on latest deployment
   - Click **Redeploy**

## Alternative: Use SUPABASE_DB_PASSWORD

If you prefer not to store the full connection string:

1. **Get your database password**
   - In Supabase Dashboard → Settings → Database
   - Under **Database password** section
   - If you don't remember it, click **Reset database password**

2. **Set environment variables in Vercel:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_DB_PASSWORD=your-database-password
   ```

3. **The connection string will be auto-constructed**

## Security Notes

⚠️ **Important:**
- Never commit connection strings to git
- Always use environment variables
- Use connection pooling (port 6543) for serverless
- The password in the connection string should be URL-encoded if it contains special characters

## Testing the Connection

After setting the environment variable, you can test it:

1. Visit `/api/cms-health` on your deployed site
2. It should show `postgres_url: true` if configured correctly

## Troubleshooting

### Connection refused
- Check that you're using port **6543** (pooling), not 5432
- Verify your Supabase project is active
- Check for IP restrictions in Supabase settings

### Authentication failed
- Verify the password is correct
- Make sure the password is URL-encoded if it has special characters
- Try resetting your database password in Supabase

### Connection timeout
- Use connection pooling (port 6543)
- Check Supabase project status
- Verify network connectivity from Vercel

