// Type definitions for admin CMS features

// Version History (Migration 601)
export interface DestinationVersion {
  id: number;
  destination_id: number;
  version_number: number;
  data: Record<string, unknown>;
  changed_fields?: string[];
  changed_by?: string;
  changed_by_email?: string;
  changed_at: string;
  change_type: 'create' | 'update' | 'publish' | 'unpublish' | 'archive' | 'restore';
  change_summary?: string;
  ip_address?: string;
  user_agent?: string;
}

// RBAC System (Migration 602)
export interface Role {
  id: string;
  name: string;
  description?: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
  created_at: string;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
  granted_at: string;
  granted_by?: string;
}

export interface UserRole {
  user_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by?: string;
  expires_at?: string;
  role?: Role; // Populated by joins
}

// Comments & Collaboration (Migration 604)
export interface DestinationComment {
  id: string;
  destination_id: number;
  user_id: string;
  user_email: string;
  user_name?: string;
  comment_text: string;
  is_internal: boolean;
  mentioned_users?: string[];
  parent_comment_id?: string;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  replies?: DestinationComment[]; // For nested display
  reply_count?: number;
}

export interface DestinationAssignment {
  id: string;
  destination_id: number;
  assigned_to: string;
  assigned_by: string;
  assignment_type: 'edit' | 'review' | 'publish' | 'research';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: string;
  notes?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  // Populated by joins
  assigned_to_email?: string;
  assigned_by_email?: string;
  destination_name?: string;
}

export interface DestinationActivity {
  id: string;
  destination_id: number;
  user_id?: string;
  user_email?: string;
  activity_type: string;
  activity_data?: Record<string, unknown>;
  created_at: string;
}

// Notifications (Migration 605)
export type NotificationType =
  | 'mention'
  | 'assignment'
  | 'comment_reply'
  | 'status_change'
  | 'review_request'
  | 'publish_success'
  | 'publish_scheduled'
  | 'system_alert';

export interface Notification {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  link_url?: string;
  link_text?: string;
  related_destination_id?: number;
  related_comment_id?: string;
  related_assignment_id?: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  read_at?: string;
  sent_email: boolean;
  email_sent_at?: string;
  created_at: string;
  expires_at?: string;
}

export interface NotificationPreferences {
  user_id: string;
  email_mentions: boolean;
  email_assignments: boolean;
  email_comments: boolean;
  email_status_changes: boolean;
  email_review_requests: boolean;
  email_digest_frequency: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never';
  in_app_mentions: boolean;
  in_app_assignments: boolean;
  in_app_comments: boolean;
  in_app_status_changes: boolean;
  in_app_review_requests: boolean;
  updated_at: string;
}

// Custom Fields (Migration 606)
export type CustomFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multi_select'
  | 'url'
  | 'email'
  | 'phone'
  | 'color'
  | 'json';

export interface CustomFieldDefinition {
  id: string;
  entity_type: string;
  field_name: string;
  field_label: string;
  field_type: CustomFieldType;
  field_options?: Record<string, unknown>;
  default_value?: string;
  placeholder?: string;
  help_text?: string;
  required: boolean;
  validation_rules?: Record<string, unknown>;
  display_order: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Validation types
export interface ValidationRule {
  field: string;
  rule: 'required' | 'min_length' | 'max_length' | 'url' | 'unique' | 'email' | 'pattern';
  severity: 'error' | 'warning';
  message: string;
  value?: unknown; // For rules that need a value (min_length, max_length, etc.)
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationRule[];
  warnings: ValidationRule[];
}

// Filter presets
export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: Record<string, unknown>;
  user_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// Import/Export types
export interface ImportResult {
  success: boolean;
  total_rows: number;
  imported: number;
  failed: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  fields: string[];
  filters?: Record<string, unknown>;
  include_metadata?: boolean;
}

// Analytics types
export interface ContentPerformance {
  destination_id: number;
  destination_name: string;
  views: number;
  saves: number;
  clicks: number;
  shares: number;
  avg_time_on_page: number;
  bounce_rate: number;
  conversion_rate: number;
  trend_direction: 'up' | 'down' | 'stable';
  trend_percentage: number;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface AnalyticsDateRange {
  start: string;
  end: string;
  label: string;
}
