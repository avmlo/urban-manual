/**
 * OpenAI Assistants API integration
 * Provides persistent conversation threads and tool integration
 */

import { getOpenAI } from '../openai';
import { createServerClient } from '@/lib/supabase-server';

const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || null;
const ASSISTANT_NAME = 'Travel Planning Assistant';

export interface AssistantPreferences {
  assistant_name?: string;
  assistant_personality?: 'friendly' | 'professional' | 'casual' | 'enthusiastic';
  response_style?: 'concise' | 'detailed' | 'balanced';
  use_emoji?: boolean;
  enable_function_calling?: boolean;
  enable_vision?: boolean;
  enable_tts?: boolean;
  preferred_model?: 'auto' | 'gpt-4o-mini' | 'gpt-4.1' | 'gpt-4o';
  use_complex_model_threshold?: number;
  conversation_memory_days?: number;
  include_user_profile?: boolean;
  include_travel_history?: boolean;
  custom_instructions?: string;
}

/**
 * Create or get travel planning assistant
 */
export async function getOrCreateAssistant() {
  const openai = getOpenAI();
  if (!openai?.beta) {
    console.warn('[Assistants] OpenAI client not available');
    return null;
  }

  try {
    // If assistant ID is set, use it
    if (ASSISTANT_ID) {
      try {
        const assistant = await openai.beta.assistants.retrieve(ASSISTANT_ID);
        return assistant;
      } catch (error) {
        console.warn('[Assistants] Assistant ID not found, creating new one');
      }
    }

    // Create new assistant
    const assistant = await openai.beta.assistants.create({
      name: ASSISTANT_NAME,
      instructions: `You are a helpful travel planning assistant for Urban Manual, a curated guide to the world's best hotels, restaurants, and travel destinations.

Your role:
- Help users discover amazing destinations, restaurants, and hotels
- Provide personalized recommendations based on their preferences
- Answer questions about destinations, cuisine, culture, and travel
- Help plan trips and itineraries
- Remember user preferences and past conversations

Guidelines:
- Be friendly, knowledgeable, and helpful
- Provide specific, actionable recommendations
- Ask clarifying questions when needed
- Remember context from previous messages
- Use the available tools to search for destinations and perform actions`,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      tools: [
        {
          type: 'function',
          function: {
            name: 'search_destinations',
            description: 'Search for destinations (restaurants, hotels, attractions) by city, category, and filters',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query or keywords'
                },
                city: {
                  type: 'string',
                  description: 'City name (e.g., "tokyo", "paris", "new-york")'
                },
                category: {
                  type: 'string',
                  description: 'Category (e.g., "Restaurant", "Hotel", "Culture", "Bar")'
                },
                priceLevel: {
                  type: 'number',
                  description: 'Price level (1-4, where 1 is budget and 4 is luxury)',
                  minimum: 1,
                  maximum: 4
                },
                minRating: {
                  type: 'number',
                  description: 'Minimum rating (0-5)',
                  minimum: 0,
                  maximum: 5
                }
              },
              required: ['query']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'save_destination',
            description: 'Save a destination to user\'s saved places',
            parameters: {
              type: 'object',
              properties: {
                destinationSlug: {
                  type: 'string',
                  description: 'Destination slug or ID'
                }
              },
              required: ['destinationSlug']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'mark_visited',
            description: 'Mark a destination as visited',
            parameters: {
              type: 'object',
              properties: {
                destinationSlug: {
                  type: 'string',
                  description: 'Destination slug or ID'
                }
              },
              required: ['destinationSlug']
            }
          }
        }
      ]
    });

    console.log('[Assistants] Created assistant:', assistant.id);
    return assistant;
  } catch (error: any) {
    console.error('[Assistants] Error creating assistant:', error);
    return null;
  }
}

/**
 * Get or create thread for a user (with database persistence)
 */
export async function getOrCreateThread(userId: string): Promise<string | null> {
  const openai = getOpenAI();
  if (!openai?.beta) {
    return null;
  }

  try {
    const supabase = createServerClient();
    
    // Try to get existing active thread from database
    const { data: existingThread, error: fetchError } = await (supabase as any)
      .from('assistant_threads')
      .select('thread_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('is_archived', false)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingThread && existingThread.thread_id) {
      // Verify thread still exists in OpenAI
      try {
        await openai.beta.threads.retrieve(existingThread.thread_id);
        console.log('[Assistants] Using existing thread:', existingThread.thread_id);
        return existingThread.thread_id;
      } catch (error) {
        // Thread doesn't exist in OpenAI, create new one
        console.warn('[Assistants] Thread not found in OpenAI, creating new one');
      }
    }

    // Create new thread in OpenAI
    const thread = await openai.beta.threads.create({
      metadata: {
        userId: userId
      }
    });

    // Store in database
    const { error: insertError } = await (supabase as any)
      .from('assistant_threads')
      .insert({
        user_id: userId,
        thread_id: thread.id,
        assistant_id: (await getOrCreateAssistant())?.id || null,
        is_active: true,
        message_count: 0
      });

    if (insertError) {
      console.error('[Assistants] Error storing thread in database:', insertError);
      // Continue anyway - thread is created in OpenAI
    } else {
      console.log('[Assistants] Created and stored new thread:', thread.id);
    }

    return thread.id;
  } catch (error: any) {
    console.error('[Assistants] Error creating thread:', error);
    return null;
  }
}

/**
 * Update thread metadata after message
 */
export async function updateThreadMetadata(
  threadId: string,
  userId: string,
  messageCount?: number
): Promise<void> {
  try {
    const supabase = createServerClient();
    
    const updateData: any = {
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (messageCount !== undefined) {
      updateData.message_count = messageCount;
    }

    await (supabase as any)
      .from('assistant_threads')
      .update(updateData)
      .eq('thread_id', threadId)
      .eq('user_id', userId);
  } catch (error) {
    console.error('[Assistants] Error updating thread metadata:', error);
    // Non-critical, continue
  }
}

/**
 * Get user's assistant preferences
 */
export async function getAssistantPreferences(userId: string): Promise<AssistantPreferences | null> {
  try {
    const supabase = createServerClient();
    
    const { data, error } = await (supabase as any)
      .from('assistant_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('[Assistants] Error fetching preferences:', error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error('[Assistants] Error fetching preferences:', error);
    return null;
  }
}

/**
 * Update user's assistant preferences
 */
export async function updateAssistantPreferences(
  userId: string,
  preferences: Partial<AssistantPreferences>
): Promise<boolean> {
  try {
    const supabase = createServerClient();
    
    const { error } = await (supabase as any)
      .from('assistant_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('[Assistants] Error updating preferences:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Assistants] Error updating preferences:', error);
    return false;
  }
}

/**
 * Get or create assistant with user preferences
 */
export async function getOrCreateUserAssistant(userId: string) {
  const preferences = await getAssistantPreferences(userId);
  const assistantName = preferences?.assistant_name || ASSISTANT_NAME;
  
  // For now, use shared assistant. In future, create per-user assistants if needed
  return await getOrCreateAssistant();
}

/**
 * Add message to thread and get response (with preferences support)
 */
export async function chatWithAssistant(
  threadId: string,
  message: string,
  userId?: string
): Promise<{ response: string; toolCalls?: any[] } | null> {
  const openai = getOpenAI();
  if (!openai?.beta) {
    return null;
  }

  try {
    // Get user preferences if userId provided
    let preferences: AssistantPreferences | null = null;
    if (userId) {
      preferences = await getAssistantPreferences(userId);
    }

    // Add user message
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message
    });

    // Get assistant (with user preferences if available)
    const assistant = userId 
      ? await getOrCreateUserAssistant(userId)
      : await getOrCreateAssistant();

    if (!assistant) {
      return null;
    }

    // Run assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistant.id || '',
    });

    // Wait for completion
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    let attempts = 0;
    const maxAttempts = 60; // 30 seconds max

    while ((runStatus.status === 'queued' || runStatus.status === 'in_progress') && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      attempts++;
    }

    if (runStatus.status === 'completed') {
      // Get messages
      const messages = await openai.beta.threads.messages.list(threadId);
      const assistantMessage = messages.data.find((m: any) => m.role === 'assistant');
      
      if (assistantMessage) {
        const content = assistantMessage.content[0];
        if (content.type === 'text') {
          // Update thread metadata
          if (userId) {
            const messageCount = messages.data.length;
            await updateThreadMetadata(threadId, userId, messageCount);
          }

          return {
            response: content.text.value,
            toolCalls: runStatus.required_action?.submit_tool_outputs?.tool_calls || []
          };
        }
      }
    } else if (runStatus.status === 'requires_action') {
      // Handle tool calls
      return {
        response: '',
        toolCalls: runStatus.required_action?.submit_tool_outputs?.tool_calls || []
      };
    }

    return null;
  } catch (error: any) {
    console.error('[Assistants] Error chatting with assistant:', error);
    return null;
  }
}

