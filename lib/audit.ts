import { createClient } from '@/lib/supabase/client';

export type AuditAction = 'create' | 'update' | 'delete' | 'publish' | 'unpublish';

interface AuditEntry {
  action: AuditAction;
  slug: string;
  source?: string;
  user_id?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
}

/**
 * Log an action to the content_audit_log table.
 * Non-blocking — errors are logged but do not throw.
 */
export async function logAuditEvent(entry: AuditEntry): Promise<void> {
  try {
    const supabase = createClient({ skipValidation: true });

    // Get current user if not provided
    let userId = entry.user_id;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }

    await supabase.from('content_audit_log').insert({
      action: entry.action,
      slug: entry.slug,
      source: entry.source || 'admin_dashboard',
      user_id: userId,
      changes: entry.changes || null,
      metadata: entry.metadata || null,
    });
  } catch (error) {
    // Non-critical — log but don't throw
    console.error('[Audit] Failed to log event:', error);
  }
}

/**
 * Compute a diff between an old and new object, returning only changed fields.
 */
export function computeChanges(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>
): Record<string, { old: unknown; new: unknown }> | null {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  for (const key of Object.keys(newData)) {
    const oldVal = oldData[key];
    const newVal = newData[key];

    // Skip undefined values (field not being updated)
    if (newVal === undefined) continue;

    // Compare stringified values for deep equality
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = { old: oldVal, new: newVal };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}
