# CMS Upgrade Guide - Professional Features

This document describes the comprehensive CMS upgrade that adds professional-grade content management features to Urban Manual.

## 🎯 Overview

The upgrade transforms the admin CMS from a basic content editor into a full-featured, professional-grade CMS with:

- **Publishing Workflow**: Draft/Published/Archived/Scheduled states
- **Version History**: Complete audit trail with restore capability
- **RBAC**: Role-based access control with granular permissions
- **SEO Management**: Meta tags, structured data, and preview tools
- **Collaboration**: Comments, mentions, and task assignments
- **Notifications**: Real-time in-app and email notifications
- **Custom Fields**: Extensible field system
- **Content Validation**: Real-time validation with warnings and errors
- **Auto-save**: Automatic draft saving with conflict detection

---

## 📦 Database Migrations

The migrations are located in `supabase/migrations/` (gitignored). Apply them in order:

### Migration 600: Publishing Workflow
**File**: `600_add_publishing_workflow.sql`

Adds publishing states and workflow metadata:

```sql
-- New columns added to destinations table:
- status: 'draft' | 'published' | 'archived' | 'scheduled'
- published_at: timestamp
- scheduled_publish_at: timestamp (for future publishing)
- last_published_by: user reference
- created_by: user reference
- updated_by: user reference
- created_at: timestamp
- updated_at: timestamp (auto-updated via trigger)
```

**Features**:
- Auto-publish scheduled content via `auto_publish_scheduled_destinations()` function
- Automatic `updated_at` timestamp via trigger
- Indexes for efficient status queries

**To apply**:
```bash
psql -h your-db-host -d your-db-name -f supabase/migrations/600_add_publishing_workflow.sql
```

---

### Migration 601: Version History & Audit Trail
**File**: `601_create_destination_versions.sql`

Creates comprehensive version tracking:

```sql
CREATE TABLE destination_versions (
  id: bigserial primary key
  destination_id: bigint
  version_number: integer
  data: jsonb (full snapshot)
  changed_fields: text[] (list of modified fields)
  changed_by: user reference
  changed_at: timestamp
  change_type: 'create' | 'update' | 'publish' | 'unpublish' | 'archive' | 'restore'
)
```

**Features**:
- Automatic versioning on every insert/update via trigger
- Detects which fields changed
- `restore_destination_version(destination_id, version_number)` function
- Row-level security for admin-only access

---

### Migration 602: RBAC System
**File**: `602_create_rbac_system.sql`

Implements role-based access control:

**New Tables**:
- `roles`: Predefined roles (super_admin, editor, reviewer, contributor, analyst, viewer)
- `permissions`: Granular permissions (destinations.create, destinations.publish, analytics.view, etc.)
- `role_permissions`: Maps permissions to roles
- `user_roles`: Maps roles to users (supports expiration dates)

**Built-in Roles**:
1. **Super Admin**: Full access to everything
2. **Editor**: Can create and edit content
3. **Reviewer**: Can review and publish content
4. **Contributor**: Can create drafts only
5. **Analyst**: Read-only access to analytics
6. **Viewer**: Read-only access to content

**Helper Functions**:
- `user_has_permission(user_id, permission_id)`: Check if user has specific permission
- `get_user_permissions(user_id)`: Get all permissions for a user

---

### Migration 603: SEO Fields
**File**: `603_add_seo_fields.sql`

Adds comprehensive SEO management:

```sql
-- New columns added to destinations:
- meta_title: string (SEO title)
- meta_description: string (SEO description)
- og_image: string (Open Graph image URL)
- og_title: string (can differ from meta_title)
- og_description: string (can differ from meta_description)
- canonical_url: string
- noindex: boolean (prevent indexing)
- nofollow: boolean
- structured_data: jsonb (Schema.org markup)
- seo_keywords: text[]
- seo_score: integer 0-100 (auto-calculated)
- last_seo_audit_at: timestamp
```

**Features**:
- `calculate_seo_score(destination)`: Auto-scores based on best practices
- `generate_seo_defaults(destination)`: Auto-generates meta tags from content
- Automatic SEO score update via trigger
- Full-text search index on meta_title

---

### Migration 604: Comments & Collaboration
**File**: `604_create_comments_collaboration.sql`

Enables team collaboration:

**Tables**:
```sql
destination_comments:
  - Threaded comments with @mentions
  - Marked as internal (admin notes) or public
  - Can be resolved (for tracking issues)
  - Soft delete support

destination_assignments:
  - Assign destinations to team members
  - Assignment types: edit, review, publish, research
  - Status tracking: pending, in_progress, completed, cancelled
  - Due dates

destination_activity:
  - Activity feed (who did what when)
  - Flexible JSONB data storage
```

**Features**:
- `get_comment_thread(comment_id)`: Retrieves comment + all replies recursively
- Automatic activity logging via trigger
- Mention notifications via trigger

---

### Migration 605: Notifications System
**File**: `605_create_notifications.sql`

Real-time notification system:

**Tables**:
```sql
notifications:
  - Notification types: mention, assignment, comment_reply, status_change, review_request, etc.
  - Links to related content (destination, comment, assignment)
  - Read/unread tracking
  - Email delivery tracking

notification_preferences:
  - Per-user settings for each notification type
  - Email digest frequency: immediate, hourly, daily, weekly, never
  - Separate in-app vs email preferences
```

**Functions**:
- `create_notification(...)`: Creates notification respecting user preferences
- `mark_notification_read(notification_id)`: Marks as read
- `mark_all_notifications_read()`: Bulk mark
- `get_unread_notification_count(user_id)`: Count badge
- `cleanup_old_notifications()`: Deletes read notifications older than 90 days

**Triggers**:
- Auto-notify on @mentions
- Auto-notify on task assignments

---

### Migration 606: Custom Fields
**File**: `606_create_custom_fields.sql`

Extensible field system:

**Table**:
```sql
custom_field_definitions:
  - field_type: text, textarea, number, boolean, date, select, multi_select, url, email, etc.
  - validation_rules: jsonb (min, max, pattern, etc.)
  - field_options: jsonb (for dropdowns)
  - display_order: integer
```

**Adds to destinations**:
- `custom_fields: jsonb` (stores values)

**Features**:
- `validate_custom_field_value(field_def, value)`: Validates against rules
- Automatic validation via trigger
- `get_destination_custom_fields(destination_id)`: Returns fields with values

**Pre-populated Fields** (examples):
- Dress code (select)
- Best time to visit (text)
- Accessibility notes (textarea)
- Average visit duration (select)
- Kid friendly (boolean)
- Pet friendly (boolean)
- WiFi available (boolean)
- Outdoor seating (boolean)

---

## 🚀 How to Apply Migrations

### Option 1: Using Supabase CLI (Recommended)

```bash
# Navigate to project root
cd /path/to/urban-manual-co

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations (they'll run in order)
supabase db push
```

### Option 2: Manual SQL Execution

```bash
# Connect to your database
psql postgresql://your-connection-string

# Run each migration in order
\i supabase/migrations/600_add_publishing_workflow.sql
\i supabase/migrations/601_create_destination_versions.sql
\i supabase/migrations/602_create_rbac_system.sql
\i supabase/migrations/603_add_seo_fields.sql
\i supabase/migrations/604_create_comments_collaboration.sql
\i supabase/migrations/605_create_notifications.sql
\i supabase/migrations/606_create_custom_fields.sql
```

### Option 3: Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project
3. Navigate to SQL Editor
4. Copy-paste each migration file
5. Execute in order (600 → 601 → 602 → 603 → 604 → 605 → 606)

---

## 🔧 Post-Migration Setup

### 1. Assign Admin Roles

After applying migrations, assign roles to your admin users:

```sql
-- Assign super_admin role to yourself
INSERT INTO user_roles (user_id, role_id, assigned_by)
VALUES (
  'your-user-id-uuid',
  'super_admin',
  'your-user-id-uuid'
);

-- Or query by email
INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT id, 'super_admin', id
FROM auth.users
WHERE email = 'your@email.com';
```

### 2. Generate SEO Defaults (Optional)

Populate SEO fields for existing destinations:

```sql
UPDATE destinations d
SET
  meta_title = g.meta_title,
  meta_description = g.meta_description,
  structured_data = g.structured_data
FROM generate_seo_defaults(d.*) g
WHERE d.meta_title IS NULL
  AND d.status = 'published';
```

### 3. Set Default Status

Update existing destinations to have a status:

```sql
UPDATE destinations
SET status = 'published'
WHERE status IS NULL;
```

---

## 📝 Components & Features

### New React Components

Located in `components/admin/`:

1. **RichTextEditor.tsx**
   - Tiptap-based WYSIWYG editor
   - Bold, italic, headings, lists, links
   - Character count, placeholder support
   - Keyboard shortcuts

2. **ValidationPanel.tsx**
   - Shows validation errors and warnings
   - SEO score display with progress bar
   - Expandable/collapsible
   - Color-coded severity

3. **SEOPreview.tsx**
   - Google search result preview
   - Social media card preview
   - Character count indicators
   - Real-time updates

4. **VersionHistory.tsx**
   - Timeline view of all changes
   - Side-by-side diff viewer
   - Restore to previous version
   - Change metadata (who, when, what changed)

5. **NotificationBell.tsx**
   - Unread count badge
   - Dropdown with recent notifications
   - Mark as read/all as read
   - Real-time updates via Supabase subscriptions

### Hooks

Located in `hooks/`:

1. **useAutoSave.ts**
   - Auto-save every 30 seconds (configurable)
   - LocalStorage backup
   - Unsaved changes warning
   - Manual save function

### Utilities

Located in `lib/`:

1. **validation.ts**
   - `validateDestination(destination)`: Full validation
   - `validateField(field, value)`: Single field
   - `calculateSEOScore(destination)`: 0-100 score
   - `generateSEODefaults(destination)`: Auto-fill meta tags
   - `generateSlug(name)`: URL-safe slug

---

## 🎨 Usage Examples

### Using RichTextEditor

```tsx
import { RichTextEditor } from '@/components/admin/RichTextEditor';

<RichTextEditor
  content={formData.description}
  onChange={(html) => setFormData({ ...formData, description: html })}
  placeholder="Enter destination description..."
  maxLength={1000}
  showCharCount
/>
```

### Using ValidationPanel

```tsx
import { ValidationPanel } from '@/components/admin/ValidationPanel';
import { validateDestination, calculateSEOScore } from '@/lib/validation';

const validation = validateDestination(formData);
const seoScore = calculateSEOScore(formData);

<ValidationPanel validation={validation} seoScore={seoScore} />
```

### Using Auto-save

```tsx
import { useAutoSave } from '@/hooks/useAutoSave';

const { isSaving, lastSaved, saveNow, hasUnsavedChanges } = useAutoSave({
  data: formData,
  onSave: async (data) => {
    await saveToDatabase(data);
  },
  interval: 30000, // 30 seconds
  localStorageKey: 'destination-draft-123',
  enabled: true,
});

// Show saving indicator
{isSaving && <span>Saving...</span>}
{lastSaved && <span>Last saved: {formatDistanceToNow(lastSaved)}</span>}
```

### Using Notifications

```tsx
import { NotificationBell } from '@/components/admin/NotificationBell';

// In your admin header
<NotificationBell />
```

---

## 🔒 Security Considerations

1. **RLS Policies**: All new tables have Row Level Security enabled
2. **Admin-only Access**: Most tables restricted to users with admin metadata
3. **User Isolation**: Notifications, preferences filtered by user_id
4. **Audit Trail**: All changes tracked with user ID and timestamp
5. **Input Validation**: Client and server-side validation required

---

## 🧪 Testing Checklist

- [ ] Apply all migrations successfully
- [ ] Create a test destination in draft mode
- [ ] Publish the destination (check published_at timestamp)
- [ ] Edit the destination (verify version created)
- [ ] View version history and restore old version
- [ ] Add a comment with @mention
- [ ] Verify notification appears
- [ ] Test auto-save by waiting 30 seconds
- [ ] Check SEO preview updates in real-time
- [ ] Verify validation errors appear for invalid data
- [ ] Test role permissions (create a viewer role user)

---

## 📚 Additional Resources

- **Tiptap Documentation**: https://tiptap.dev/
- **React Hook Form**: https://react-hook-form.com/
- **Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security
- **Schema.org**: https://schema.org/

---

## 🐛 Troubleshooting

### Migrations fail with "column already exists"

Some columns might already exist. Modify migration to use `ADD COLUMN IF NOT EXISTS`.

### Version trigger not creating versions

Check trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'destination_version_trigger';
```

Recreate if needed:
```sql
DROP TRIGGER IF EXISTS destination_version_trigger ON destinations;
CREATE TRIGGER destination_version_trigger
  AFTER INSERT OR UPDATE ON destinations
  FOR EACH ROW
  EXECUTE FUNCTION create_destination_version();
```

### Notifications not appearing

1. Check RLS policies allow your user to SELECT from notifications table
2. Verify trigger is firing: `SELECT * FROM pg_trigger WHERE tgname LIKE '%notify%';`
3. Check notification_preferences exist for your user

### SEO score always 0

Verify trigger is installed:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'update_destination_seo_score';
```

---

## 📧 Support

For issues or questions, please refer to the main project documentation or create an issue in the repository.

---

**Version**: 1.0.0
**Last Updated**: 2026-01-24
**Migration Files**: 600-606
