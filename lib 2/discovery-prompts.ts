/**
 * Dynamic Discovery Prompts Service
 * Powers time-sensitive travel recommendations based on current date and location
 */

import { createClient } from '@supabase/supabase-js';
import { DiscoveryPrompt, DiscoveryPromptResponse } from '@/types/discovery';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
// Support both new (publishable/secret) and legacy (anon/service_role) key naming
const SUPABASE_KEY = 
  process.env.SUPABASE_SECRET_KEY || 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = (SUPABASE_URL && SUPABASE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

export class DiscoveryPromptService {
  /**
   * Get active prompts for a city
   * Handles both one-time and recurring events
   */
  static async getPromptsForCity(
    city: string,
    date: Date = new Date()
  ): Promise<DiscoveryPrompt[]> {
    if (!supabase) {
      console.warn('Supabase not configured, returning empty prompts');
      return [];
    }

    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

    const { data, error } = await supabase.rpc('get_active_prompts_for_city', {
      p_city: city.toLowerCase(),
      p_date: dateStr,
    });

    if (error) {
      console.error('Error fetching city prompts:', error);
      throw error;
    }

    return (data || []).map(this.transformPrompt);
  }

  /**
   * Get active prompts for a specific destination
   */
  static async getPromptsForDestination(
    destinationSlug: string,
    date: Date = new Date()
  ): Promise<DiscoveryPrompt[]> {
    if (!supabase) {
      console.warn('Supabase not configured, returning empty prompts');
      return [];
    }

    const dateStr = date.toISOString().split('T')[0];

    const { data, error } = await supabase.rpc('get_active_prompts_for_destination', {
      p_destination_slug: destinationSlug,
      p_date: dateStr,
    });

    if (error) {
      console.error('Error fetching destination prompts:', error);
      throw error;
    }

    return (data || []).map(this.transformPrompt);
  }

  /**
   * Get all active prompts for a city (including destination-specific)
   */
  static async getAllPromptsForCity(
    city: string,
    destinationSlug?: string,
    date: Date = new Date()
  ): Promise<DiscoveryPromptResponse> {
    const [cityPrompts, destinationPrompts] = await Promise.all([
      this.getPromptsForCity(city, date),
      destinationSlug ? this.getPromptsForDestination(destinationSlug, date) : [],
    ]);

    // Combine and deduplicate by ID
    const allPrompts = [...cityPrompts, ...destinationPrompts];
    const uniquePrompts = Array.from(
      new Map(allPrompts.map(p => [p.id, p])).values()
    );

    // Sort by priority (highest first)
    uniquePrompts.sort((a, b) => b.priority - a.priority);

    return {
      prompts: uniquePrompts,
      city,
      destination_slug: destinationSlug,
      current_date: date.toISOString().split('T')[0],
    };
  }

  /**
   * Get upcoming prompts (within next 30 days)
   */
  static async getUpcomingPrompts(
    city: string,
    days: number = 30
  ): Promise<DiscoveryPrompt[]> {
    if (!supabase) {
      console.warn('Supabase not configured, returning empty prompts');
      return [];
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const { data, error } = await supabase
      .from('discovery_prompts')
      .select('*')
      .eq('city', city.toLowerCase())
      .eq('is_active', true)
      .lte('start_date', endDate.toISOString().split('T')[0])
      .gte('end_date', new Date().toISOString().split('T')[0])
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error fetching upcoming prompts:', error);
      throw error;
    }

    return (data || []).map(this.transformPrompt);
  }

  /**
   * Transform database row to DiscoveryPrompt
   */
  private static transformPrompt(row: any): DiscoveryPrompt {
    return {
      id: row.id,
      destination_slug: row.destination_slug,
      city: row.city,
      country: row.country,
      title: row.title,
      prompt_text: row.prompt_text,
      short_prompt: row.short_prompt,
      prompt_type: row.prompt_type,
      start_date: row.start_date,
      end_date: row.end_date,
      priority: row.priority || 5,
      is_recurring: row.is_recurring || false,
      recurrence_pattern: row.recurrence_pattern,
      recurrence_start_month: row.recurrence_start_month,
      recurrence_start_day: row.recurrence_start_day,
      recurrence_end_month: row.recurrence_end_month,
      recurrence_end_day: row.recurrence_end_day,
      action_text: row.action_text,
      booking_url: row.booking_url,
      related_links: row.related_links,
      created_by: row.created_by,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Generate a formatted prompt string with date range
   */
  static formatPrompt(prompt: DiscoveryPrompt): string {
    if (prompt.short_prompt) {
      return prompt.short_prompt;
    }

    // Add date range if it's a seasonal/event prompt
    if (['seasonal', 'event'].includes(prompt.prompt_type)) {
      const startDate = new Date(prompt.start_date);
      const endDate = new Date(prompt.end_date);
      const startMonth = startDate.toLocaleString('en-US', { month: 'short' });
      const endMonth = endDate.toLocaleString('en-US', { month: 'short' });

      if (startMonth === endMonth) {
        return `${prompt.title} — ${startMonth} ${startDate.getDate()}–${endDate.getDate()}. ${prompt.action_text || ''}`;
      } else {
        return `${prompt.title} — ${startMonth} ${startDate.getDate()}–${endMonth} ${endDate.getDate()}. ${prompt.action_text || ''}`;
      }
    }

    return prompt.prompt_text;
  }
}

