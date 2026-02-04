/**
 * Extended Conversation Memory Service
 * Database-backed conversation storage with context summarization
 */

import { createServiceRoleClient } from '@/lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ConversationMemory {
  sessionId: string;
  userId?: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    intent?: any;
    metadata?: any;
  }>;
  summary?: string;
  context?: {
    city?: string;
    category?: string;
    preferences?: string[];
    constraints?: any;
  };
  createdAt: Date;
  lastUpdated: Date;
}

export class ExtendedConversationMemoryService {
  private supabase;
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      this.supabase = null;
    }

    const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Save conversation message to database
   */
  async saveMessage(
    sessionId: string,
    userId: string | undefined,
    role: 'user' | 'assistant' | 'system',
    content: string,
    intent?: any,
    metadata?: any
  ): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { error } = await this.supabase
        .from('conversation_messages')
        .insert({
          session_id: sessionId,
          user_id: userId,
          role,
          content,
          intent_data: intent,
          metadata: metadata || {},
        });

      if (error) throw error;

      // Update session last_updated
      await this.supabase
        .from('conversation_sessions')
        .update({ last_updated: new Date().toISOString() })
        .eq('id', sessionId);

      return true;
    } catch (error) {
      console.error('Error saving conversation message:', error);
      return false;
    }
  }

  /**
   * Get conversation history with summarization for long conversations
   */
  async getConversationHistory(
    sessionId: string,
    maxMessages: number = 50,
    summarizeIfLong: boolean = true
  ): Promise<ConversationMemory | null> {
    if (!this.supabase) return null;

    try {
      // Get messages
      const { data: messages, error } = await this.supabase
        .from('conversation_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(maxMessages * 2); // Get more to summarize if needed

      if (error) throw error;

      if (!messages || messages.length === 0) {
        return null;
      }

      // If conversation is long, summarize older messages
      let summary: string | undefined;
      let recentMessages = messages;

      if (summarizeIfLong && messages.length > maxMessages && this.genAI) {
        const oldMessages = messages.slice(0, messages.length - maxMessages);
        const recentMessagesList = messages.slice(-maxMessages);

        summary = await this.summarizeConversation(oldMessages);
        recentMessages = recentMessagesList;
      }

      // Get session context
      const { data: session } = await this.supabase
        .from('conversation_sessions')
        .select('context, user_id, created_at, last_updated')
        .eq('id', sessionId)
        .single();

      return {
        sessionId,
        userId: session?.user_id,
        messages: recentMessages.map((m: any) => ({
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at),
          intent: m.intent_data,
          metadata: m.metadata,
        })),
        summary,
        context: session?.context || {},
        createdAt: new Date(session?.created_at || Date.now()),
        lastUpdated: new Date(session?.last_updated || Date.now()),
      };
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return null;
    }
  }

  /**
   * Summarize conversation using AI
   */
  private async summarizeConversation(
    messages: Array<{ role: string; content: string }>
  ): Promise<string> {
    if (!this.genAI || messages.length === 0) {
      return '';
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
      
      const conversationText = messages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

      const prompt = `Summarize this travel conversation concisely, preserving key information:
- User preferences mentioned
- Cities/destinations discussed
- Constraints or requirements
- Decisions made

Conversation:
${conversationText}

Summary:`;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Error summarizing conversation:', error);
      return '';
    }
  }

  /**
   * Get cross-session context (previous conversations)
   */
  async getCrossSessionContext(userId: string, limit: number = 5): Promise<Array<{
    sessionId: string;
    summary: string;
    context: any;
    lastUpdated: Date;
  }>> {
    if (!this.supabase || !userId) return [];

    try {
      const { data: sessions, error } = await this.supabase
        .from('conversation_sessions')
        .select('id, context, last_updated, summary')
        .eq('user_id', userId)
        .order('last_updated', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (sessions || []).map((s: any) => ({
        sessionId: s.id,
        summary: s.summary || '',
        context: s.context || {},
        lastUpdated: new Date(s.last_updated),
      }));
    } catch (error) {
      console.error('Error getting cross-session context:', error);
      return [];
    }
  }

  /**
   * Update conversation context
   */
  async updateContext(
    sessionId: string,
    context: Partial<{
      city?: string;
      category?: string;
      preferences?: string[];
      constraints?: any;
      budget?: number;
    }>
  ): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      // Get current context
      const { data: session } = await this.supabase
        .from('conversation_sessions')
        .select('context')
        .eq('id', sessionId)
        .single();

      const currentContext = session?.context || {};
      const updatedContext = { ...currentContext, ...context };

      const { error } = await this.supabase
        .from('conversation_sessions')
        .update({ context: updatedContext })
        .eq('id', sessionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating context:', error);
      return false;
    }
  }
}

export const extendedConversationMemoryService = new ExtendedConversationMemoryService();

