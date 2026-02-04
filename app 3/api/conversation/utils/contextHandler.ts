/**
 * Conversation Context Handler
 * Manages session memory, context summarization, and refinement
 */

import { randomUUID } from 'crypto';

import { createServiceRoleClient } from '@/lib/supabase-server';
import { generateJSON } from '@/lib/llm';
import { SUMMARISER_SYSTEM_PROMPT } from '@/lib/ai/systemPrompts';

export interface ConversationContext {
  city?: string | null;
  category?: string | null;
  meal?: string | null;
  cuisine?: string | null;
  mood?: string | null;
  price_level?: string | null;
  timezone?: string;
  language?: string;
  archetype_seed?: string;
  ip_hint?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  intent_data?: any;
  destinations?: any[];
}

/**
 * Get or create conversation session
 */
export async function getOrCreateSession(
  userId?: string,
  sessionToken?: string
): Promise<{
  sessionId: string;
  sessionToken: string | null;
  context: ConversationContext;
  lastActivity?: string | null;
  contextSummary?: any;
} | null> {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  try {
    const normalizedUserId = userId && !['anonymous', 'guest', ''].includes(userId) ? userId : undefined;
    const normalizedSessionToken = sessionToken?.trim() || undefined;

    // Try to get existing session
    let query = supabase
      .from('conversation_sessions')
      .select('id, context, context_summary, session_token, last_activity');

    if (normalizedUserId) {
      query = query.eq('user_id', normalizedUserId);
    } else if (normalizedSessionToken) {
      query = query.eq('session_token', normalizedSessionToken);
    } else {
      return null;
    }

    const { data: existing } = await query
      .order('last_activity', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      // Update last activity
      await supabase
        .from('conversation_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', existing.id);

      return {
        sessionId: existing.id,
        sessionToken: (existing.session_token as string) || normalizedSessionToken || null,
        context: (existing.context as ConversationContext) || {},
        lastActivity: existing.last_activity as string | null,
        contextSummary: existing.context_summary,
      };
    }

    // Create new session
    const generatedToken = normalizedSessionToken || randomUUID();
    const { data: newSession, error } = await supabase
      .from('conversation_sessions')
      .insert({
        user_id: normalizedUserId || null,
        session_token: generatedToken,
        context: {},
        last_activity: new Date().toISOString(),
      })
      .select('id, context, context_summary, session_token, last_activity')
      .single();

    if (error || !newSession) {
      console.error('Error creating session:', error);
      return null;
    }

    return {
      sessionId: newSession.id,
      sessionToken: (newSession.session_token as string) || generatedToken,
      context: (newSession.context as ConversationContext) || {},
      lastActivity: newSession.last_activity as string | null,
      contextSummary: newSession.context_summary,
    };
  } catch (error) {
    console.error('Error in getOrCreateSession:', error);
    return null;
  }
}

/**
 * Get conversation messages (last N messages)
 */
export async function getConversationMessages(
  sessionId: string,
  limit: number = 10
): Promise<ConversationMessage[]> {
  const supabase = createServiceRoleClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('conversation_messages')
      .select('role, content, intent_data, destinations')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return (data || []).reverse().map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      intent_data: msg.intent_data,
      destinations: msg.destinations,
    }));
  } catch (error) {
    console.error('Error in getConversationMessages:', error);
    return [];
  }
}

/**
 * Save message to conversation history
 */
export async function saveMessage(
  sessionId: string,
  message: ConversationMessage
): Promise<boolean> {
  const supabase = createServiceRoleClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('conversation_messages').insert({
      session_id: sessionId,
      role: message.role,
      content: message.content,
      intent_data: message.intent_data || null,
      destinations: message.destinations || null,
    });

    if (error) {
      console.error('Error saving message:', error);
      return false;
    }

    // Update session last_activity
    await supabase
      .from('conversation_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', sessionId);

    return true;
  } catch (error) {
    console.error('Error in saveMessage:', error);
    return false;
  }
}

/**
 * Update conversation context
 */
export async function updateContext(
  sessionId: string,
  updates: Partial<ConversationContext>
): Promise<boolean> {
  const supabase = createServiceRoleClient();
  if (!supabase) return false;

  try {
    // Get current context
    const { data: session } = await supabase
      .from('conversation_sessions')
      .select('context')
      .eq('id', sessionId)
      .single();

    if (!session) return false;

    const currentContext = (session.context as ConversationContext) || {};
    const newContext = { ...currentContext, ...updates };

    const { error } = await supabase
      .from('conversation_sessions')
      .update({
        context: newContext,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating context:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateContext:', error);
    return false;
  }
}

/**
 * Summarize conversation context when it gets too long (e.g., >20 messages)
 */
export async function summarizeContext(
  sessionId: string,
  messages: ConversationMessage[]
): Promise<string | null> {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  try {
    if (messages.length < 10) return null; // Only summarize if needed

    const conversationText = messages
      .slice(-20) // Last 20 messages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const summary = await generateJSON(
      SUMMARISER_SYSTEM_PROMPT,
      `Summarize this conversation into a compact context JSON:\n\n${conversationText}\n\nReturn JSON with: city, category, meal, cuisine, mood, price_level, notable_preferences`
    );

    if (summary) {
      const summaryText = JSON.stringify(summary);
      
      // Update session with summary
      await supabase
        .from('conversation_sessions')
        .update({
          context_summary: summaryText,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      return summaryText;
    }

    return null;
  } catch (error) {
    console.error('Error in summarizeContext:', error);
    return null;
  }
}

/**
 * Get refined context suggestions for user
 */
export async function getContextSuggestions(
  context: ConversationContext
): Promise<string[]> {
  const suggestions: string[] = [];

  if (!context.city) {
    suggestions.push('Which city are you exploring?');
  }

  if (context.city && !context.category) {
    suggestions.push(`What are you looking for in ${context.city}? (restaurant, cafe, hotel, etc.)`);
  }

  if (context.category === 'restaurant' && !context.meal) {
    suggestions.push('Lunch or dinner?');
  }

  if (context.category === 'restaurant' && !context.cuisine) {
    suggestions.push('Any cuisine preference?');
  }

  if (!context.mood) {
    suggestions.push('What vibe? (cozy, modern, romantic, buzzy)');
  }

  return suggestions.slice(0, 3); // Max 3 suggestions
}

