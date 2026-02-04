/**
 * Conversation Metrics Logging
 * Tracks conversation quality, clarifying questions, and suggestion acceptance
 */

import { createServiceRoleClient } from '@/lib/supabase-server';

export interface ConversationMetric {
  userId?: string;
  sessionId?: string;
  messageCount: number;
  intentType: string;
  modelUsed: string;
  hasContext: boolean;
  clarifyingQuestionsAsked?: number;
  suggestionsShown?: number;
  suggestionsAccepted?: number;
  timestamp?: Date;
}

/**
 * Log conversation metrics
 */
export async function logConversationMetrics(metric: ConversationMetric): Promise<boolean> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    console.warn('Conversation metrics: Supabase not available');
    return false;
  }

  try {
    // Check if conversation_metrics table exists (may not in early stages)
    const { error } = await supabase.from('conversation_metrics').insert({
      user_id: metric.userId || null,
      session_id: metric.sessionId || null,
      message_count: metric.messageCount,
      intent_type: metric.intentType,
      model_used: metric.modelUsed,
      has_context: metric.hasContext,
      clarifying_questions_asked: metric.clarifyingQuestionsAsked || 0,
      suggestions_shown: metric.suggestionsShown || 0,
      suggestions_accepted: metric.suggestionsAccepted || 0,
      created_at: metric.timestamp?.toISOString() || new Date().toISOString(),
    });

    if (error) {
      // Table might not exist yet; log to console instead
      console.log('[Conversation Metrics]', metric);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error logging conversation metrics:', error);
    return false;
  }
}

/**
 * Track suggestion acceptance (called when user clicks a suggestion)
 */
export async function trackSuggestionAcceptance(
  sessionId: string,
  suggestionText: string,
  userId?: string
): Promise<boolean> {
  return logConversationMetrics({
    userId,
    sessionId,
    messageCount: 0,
    intentType: 'suggestion_accepted',
    modelUsed: 'tracking',
    hasContext: true,
    suggestionsAccepted: 1,
  });
}

/**
 * Track clarifying question asked
 */
export async function trackClarifyingQuestion(
  sessionId: string,
  questionText: string,
  userId?: string
): Promise<boolean> {
  return logConversationMetrics({
    userId,
    sessionId,
    messageCount: 0,
    intentType: 'clarifying_question',
    modelUsed: 'tracking',
    hasContext: false,
    clarifyingQuestionsAsked: 1,
  });
}

/**
 * Get weekly conversation summary
 */
export async function getWeeklySummary(userId?: string): Promise<any> {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  try {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    let query = supabase
      .from('conversation_metrics')
      .select('*')
      .gte('created_at', since.toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching weekly summary:', error);
      return null;
    }

    const totalMessages = data?.reduce((sum, m) => sum + (m.message_count || 0), 0) || 0;
    const avgSuggestionsAccepted = data?.reduce((sum, m) => sum + (m.suggestions_accepted || 0), 0) / (data?.length || 1) || 0;

    return {
      totalConversations: data?.length || 0,
      totalMessages,
      avgSuggestionsAccepted,
      topIntentTypes: data?.reduce((acc: any, m) => {
        const type = m.intent_type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
    };
  } catch (error) {
    console.error('Error in getWeeklySummary:', error);
    return null;
  }
}

