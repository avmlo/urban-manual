export interface DiscoveryPrompt {
  id: string;
  destination_slug?: string | null;
  city: string;
  country?: string | null;
  
  // Content
  title: string;
  prompt_text: string;
  short_prompt?: string | null;
  
  // Time sensitivity
  prompt_type: 'seasonal' | 'event' | 'optimal_dates' | 'weather' | 'custom';
  start_date: string; // ISO date
  end_date: string; // ISO date
  priority: number; // 1-10
  
  // Recurring support
  is_recurring: boolean;
  recurrence_pattern?: 'yearly' | 'monthly' | 'weekly' | null;
  recurrence_start_month?: number | null; // 1-12
  recurrence_start_day?: number | null; // 1-31
  recurrence_end_month?: number | null; // 1-12
  recurrence_end_day?: number | null; // 1-31
  
  // Actionable
  action_text?: string | null;
  booking_url?: string | null;
  related_links?: Array<{
    title: string;
    url: string;
    type?: string;
  }> | null;
  
  // Metadata
  created_by?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDiscoveryPromptInput {
  destination_slug?: string;
  city: string;
  country?: string;
  title: string;
  prompt_text: string;
  short_prompt?: string;
  prompt_type: 'seasonal' | 'event' | 'optimal_dates' | 'weather' | 'custom';
  start_date: string;
  end_date: string;
  priority?: number;
  is_recurring?: boolean;
  recurrence_pattern?: 'yearly' | 'monthly' | 'weekly';
  recurrence_start_month?: number;
  recurrence_start_day?: number;
  recurrence_end_month?: number;
  recurrence_end_day?: number;
  action_text?: string;
  booking_url?: string;
  related_links?: Array<{
    title: string;
    url: string;
    type?: string;
  }>;
  is_active?: boolean;
}

export interface DiscoveryPromptResponse {
  prompts: DiscoveryPrompt[];
  city?: string;
  destination_slug?: string;
  current_date: string;
}

