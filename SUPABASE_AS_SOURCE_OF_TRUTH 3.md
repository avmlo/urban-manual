# Supabase as Source of Truth - Payload CMS Configuration

## Overview

Payload CMS is configured to use **Supabase as the source of truth**. This means:

✅ **Supabase tables are the primary data store**
✅ **Payload reads from and writes to Supabase directly**
✅ **Changes in Payload automatically sync to Supabase**
✅ **No duplicate tables - Payload uses existing Supabase schema**

## How It Works

### 1. **Direct Database Access**
- Payload connects to the same PostgreSQL database as Supabase
- Uses existing `destinations` table (no new tables created)
- Reads and writes directly to Supabase tables

### 2. **Automatic Sync**
- When you create/edit/delete in Payload admin UI
- Changes are automatically synced to Supabase via hooks
- Uses Supabase REST API to ensure consistency

### 3. **Field Mapping**

Payload fields map to Supabase columns:

| Payload Field | Supabase Column | Notes |
|--------------|-----------------|-------|
| `name` | `name` | Direct mapping |
| `slug` | `slug` | Primary key |
| `city` | `city` | Direct mapping |
| `category` | `category` | Direct mapping |
| `description` | `description` | Direct mapping |
| `content` | `content` | Rich text stored as text/JSON |
| `image` | `image` or `main_image` | URL string |
| `latitude` | `latitude` or `lat` | Number |
| `longitude` | `longitude` or `long` | Number |
| `michelin_stars` | `michelin_stars` | 0-3 |
| `crown` | `crown` | Boolean |
| `rating` | `rating` | 0-5 |
| `price_level` | `price_level` | 1-4 |

## Configuration Details

### Payload Config (`payload.config.ts`)

```typescript
{
  slug: 'destinations',
  dbName: 'destinations', // Use existing Supabase table
  hooks: {
    afterChange: [/* Sync to Supabase */],
    afterDelete: [/* Sync deletion to Supabase */],
  },
}
```

### Sync Hooks

Payload automatically syncs changes using hooks:

1. **After Create/Update**: Syncs new/updated data to Supabase
2. **After Delete**: Removes from Supabase when deleted in Payload

## Usage

### Editing Destinations in Payload

1. **Access Admin UI**: Visit `/admin`
2. **Navigate to Destinations**: Click "Destinations" in sidebar
3. **Edit**: Make changes to any destination
4. **Save**: Changes automatically sync to Supabase
5. **Verify**: Check Supabase dashboard to confirm changes

### Importing Existing Data

If you want to import existing Supabase destinations into Payload:

1. **Option A: Manual Import**
   - Use Payload admin UI
   - Create new destinations one by one
   - Data will sync to Supabase automatically

2. **Option B: Bulk Import** (Future)
   - Use `/api/payload/sync-supabase` endpoint
   - Import multiple destinations at once
   - Requires custom script

### Reading Data

Your app continues to read from Supabase as before:

```typescript
// Your existing code still works
const { data } = await supabase
  .from('destinations')
  .select('*')
```

## Benefits

✅ **Single Source of Truth**: Supabase is the authoritative data store
✅ **No Duplication**: No need to sync between two databases
✅ **Existing Code Works**: Your app continues using Supabase
✅ **Easy Editing**: Use Payload's admin UI for content management
✅ **Automatic Sync**: Changes in Payload update Supabase immediately

## Important Notes

⚠️ **Database Schema**
- Payload uses the existing Supabase `destinations` table
- No new `payload_*` tables are created for destinations
- Only `payload_users` and `payload_media` tables are created (for CMS functionality)

⚠️ **Rich Text Content**
- Payload's rich text editor stores content as JSON
- When syncing to Supabase, it's converted to text/JSON string
- Your app can parse it if needed, or use as plain text

⚠️ **Image Handling**
- Images are stored as URLs (strings) in Supabase
- Payload doesn't manage file uploads for destinations
- Use existing image URLs or upload via Supabase Storage

## Troubleshooting

### Changes not syncing to Supabase

1. **Check Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (for write access)

2. **Check Logs**:
   - Look for `[Payload]` messages in Vercel function logs
   - Should see "✅ Synced" messages after edits

3. **Verify Permissions**:
   - Service role key has write access to `destinations` table
   - RLS policies allow service role to write

### Payload shows different data than Supabase

- Payload reads directly from PostgreSQL
- If data differs, check:
  - Are you looking at the same database?
  - Is there a caching issue?
  - Refresh Payload admin UI

### Can't edit in Payload

- Check Payload user permissions
- Verify database connection
- Check that `destinations` table exists in Supabase

## Future Enhancements

Potential improvements:

1. **Bidirectional Sync**: Sync Supabase changes back to Payload
2. **Bulk Import**: Import all Supabase destinations at once
3. **Field Validation**: Ensure Payload fields match Supabase schema
4. **Conflict Resolution**: Handle simultaneous edits
5. **Webhook Integration**: Real-time sync via Supabase webhooks

## Summary

✅ **Supabase = Source of Truth**
✅ **Payload = Content Management Interface**
✅ **Automatic Sync = No Manual Work**

Your existing Supabase setup remains unchanged. Payload just provides a nice admin UI to edit the same data.

