/**
 * Streaming Conversation API with Server-Sent Events (SSE)
 * Provides real-time streaming responses for better UX
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { openai, OPENAI_MODEL } from '@/lib/openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { URBAN_MANUAL_EDITOR_SYSTEM_PROMPT } from '@/lib/ai/systemPrompts';
import { formatFewShots } from '@/lib/ai/fewShots';
import {
  getOrCreateSession,
  getConversationMessages,
  saveMessage,
  updateContext,
  getContextSuggestions,
  type ConversationContext,
} from '../../conversation/utils/contextHandler';
import { extractIntent } from '@/app/api/intent/schema';
import { logConversationMetrics } from '@/lib/metrics/conversationMetrics';
import {
  conversationRatelimit,
  memoryConversationRatelimit,
  getIdentifier,
  isUpstashConfigured,
} from '@/lib/rate-limit';
import { getDiscoveryEngineService } from '@/services/search/discovery-engine';
import { unifiedSearch } from '@/lib/discovery-engine/integration';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const genAI = GOOGLE_API_KEY ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';
const CONVERSATION_MODEL = process.env.OPENAI_CONVERSATION_MODEL || OPENAI_MODEL;

// Simple, conversational system prompt for Gemini
const CHAT_SYSTEM_PROMPT = `You are a friendly and knowledgeable travel assistant for Urban Manual. You help users discover amazing restaurants, hotels, cafes, and destinations from our curated collection.

Guidelines:
- Be conversational, warm, and helpful - like talking to a knowledgeable friend
- Only recommend places from our knowledge base (I'll provide search results)
- If you don't have information about a place, say so honestly
- Feel free to have natural conversations about travel, food, and destinations
- Keep responses concise but engaging (2-4 sentences typically)
- Ask follow-up questions when helpful
- Be enthusiastic about great places but honest about limitations`;

// Helper to create SSE-formatted message
function createSSEMessage(data: any): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function normalizeUserId(userId?: string | null) {
  if (!userId) return undefined;
  return ['anonymous', 'guest'].includes(userId) ? undefined : userId;
}

export async function POST(
  request: NextRequest,
  context: any
) {
  const encoder = new TextEncoder();

  try {
    // Get user context first for rate limiting
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const paramsValue = context?.params && typeof context.params.then === 'function'
      ? await context.params
      : context?.params;
    const { user_id } = paramsValue || {};
    const userId = normalizeUserId(user?.id || user_id || undefined);

    // Rate limiting: 5 requests per 10 seconds for conversation
    const identifier = getIdentifier(request, userId);
    const ratelimit = isUpstashConfigured() ? conversationRatelimit : memoryConversationRatelimit;
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

    if (!success) {
      return new Response(
        encoder.encode(createSSEMessage({
          type: 'error',
          error: 'Too many conversation requests. Please wait a moment.',
          limit,
          remaining,
          reset
        })),
        {
          status: 429,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    const { message, session_token } = await request.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(
        encoder.encode(createSSEMessage({ type: 'error', error: 'Message is required' })),
        {
          status: 400,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial status
          controller.enqueue(encoder.encode(createSSEMessage({ type: 'status', status: 'processing' })));

          // Get or create session
          const session = await getOrCreateSession(userId, session_token);
          if (!session) {
            controller.enqueue(encoder.encode(createSSEMessage({ type: 'error', error: 'Failed to initialize session' })));
            controller.close();
            return;
          }

          // Get conversation history
          let messages = await getConversationMessages(session.sessionId, 20);

          // Extract intent from new message
          let userContext: any = {};
          if (userId && supabase) {
            try {
              const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('favorite_cities, favorite_categories, travel_style')
                .eq('user_id', userId)
                .maybeSingle();
              if (!profileError && profile) {
                userContext = {
                  favoriteCities: profile.favorite_cities,
                  favoriteCategories: profile.favorite_categories,
                  travelStyle: profile.travel_style,
                };
              }
            } catch (error) {
              console.debug('User profile fetch failed (optional):', error);
            }
          }

          const intent = await extractIntent(message, messages, userContext);

          // Save user message
          await saveMessage(session.sessionId, {
            role: 'user',
            content: message,
            intent_data: intent,
          });

          // Update context from intent
          const contextUpdates: Partial<ConversationContext> = {};
          if (intent.city) contextUpdates.city = intent.city;
          if (intent.category) contextUpdates.category = intent.category;
          if (intent.temporalContext?.timeframe === 'now') {
            const hour = new Date().getHours();
            if (hour >= 6 && hour < 12) contextUpdates.meal = 'breakfast';
            else if (hour >= 12 && hour < 17) contextUpdates.meal = 'lunch';
            else if (hour >= 17 && hour < 22) contextUpdates.meal = 'dinner';
          }
          if (intent.constraints?.preferences?.length) {
            const prefs = intent.constraints.preferences;
            if (prefs.some((p: string) => p.toLowerCase().includes('romantic'))) contextUpdates.mood = 'romantic';
            if (prefs.some((p: string) => p.toLowerCase().includes('cozy'))) contextUpdates.mood = 'cozy';
            if (prefs.some((p: string) => p.toLowerCase().includes('buzzy'))) contextUpdates.mood = 'buzzy';
          }

          await updateContext(session.sessionId, contextUpdates);

          // Send context update
          controller.enqueue(encoder.encode(createSSEMessage({
            type: 'context',
            context: { ...session.context, ...contextUpdates }
          })));

          // Build messages for Gemini (simpler format)
          const contextInfo = Object.keys({ ...session.context, ...contextUpdates }).length > 0
            ? `\n\nContext: ${JSON.stringify({ ...session.context, ...contextUpdates })}`
            : '';

          const recentMessages = messages.slice(-10);
          const conversationHistory = recentMessages.map((msg) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
          }));

          // Generate streaming response - PRIORITIZE DISCOVERY ENGINE
          let assistantResponse = '';
          let usedModel = 'unknown';
          let discoveryResults: any[] = [];

          // PRIMARY: Try Discovery Engine first (unless it breaks, no fallback)
          try {
            const discoveryEngine = getDiscoveryEngineService();
            
            if (discoveryEngine.isAvailable()) {
              // Build enhanced query with conversation context for follow-ups
              const isConversational = messages.length > 0;
              let searchQuery = message;
              
              if (isConversational && messages.length > 0) {
                const recentQueries = messages.slice(-3).map((m: any) => m.content).join(' ');
                searchQuery = `${message} (context: ${recentQueries})`;
              }

              // Use Discovery Engine search
              const discoveryResult = await unifiedSearch({
                query: searchQuery,
                userId: userId,
                city: intent.city ?? undefined,
                category: intent.category ?? undefined,
                priceLevel: (intent as any).filters?.priceLevel ?? undefined,
                minRating: (intent as any).filters?.rating ?? undefined,
                pageSize: 20,
                useCache: true,
              });

              if (discoveryResult && discoveryResult.source === 'discovery_engine' && discoveryResult.results.length > 0) {
                discoveryResults = discoveryResult.results.map((result: any) => ({
                  name: result.name,
                  description: result.description,
                  city: result.city,
                  category: result.category,
                  rating: result.rating || 0,
                  price_level: result.priceLevel || result.price_level || 0,
                  slug: result.slug || result.id,
                }));

                // Track search event for personalization
                if (userId) {
                  try {
                    await discoveryEngine.trackEvent({
                      userId: userId,
                      eventType: 'search',
                      searchQuery: message,
                    });
                  } catch (trackError) {
                    console.warn('Failed to track search event:', trackError);
                  }
                }

                // Format Discovery Engine results for Gemini
                const resultsText = discoveryResults.slice(0, 5).map((r: any, idx: number) => 
                  `${idx + 1}. ${r.name} (${r.city}) - ${r.description || r.category}`
                ).join('\n');

                // Use Gemini to format the Discovery Engine results into a conversational response
                if (genAI) {
                  try {
                    const model = genAI.getGenerativeModel({ 
                      model: GEMINI_MODEL,
                      generationConfig: {
                        temperature: 0.8,
                        maxOutputTokens: 500,
                      },
                      systemInstruction: CHAT_SYSTEM_PROMPT,
                    });

                    // Build conversation history for chat
                    const history = recentMessages.slice(-5).map((msg: any) => ({
                      role: msg.role === 'user' ? 'user' : 'model',
                      parts: [{ text: msg.content }],
                    }));

                    // Build the current prompt with search results
                    const currentPrompt = `${contextInfo ? `Context: ${JSON.stringify({ ...session.context, ...contextUpdates })}\n\n` : ''}Here are search results from our knowledge base:\n\n${resultsText}\n\nUser asked: "${message}"\n\nProvide a helpful, conversational response mentioning 2-3 specific places that match their request.`;

                    // Start chat with history if available
                    let result;
                    if (history.length > 0) {
                      const chat = model.startChat({ history });
                      result = await chat.sendMessageStream(currentPrompt);
                    } else {
                      result = await model.generateContentStream(currentPrompt);
                    }

                    for await (const chunk of result.stream) {
                      const content = chunk.text();
                      if (content) {
                        assistantResponse += content;
                        controller.enqueue(encoder.encode(createSSEMessage({
                          type: 'chunk',
                          content
                        })));
                      }
                    }

                    usedModel = `discovery-engine+${GEMINI_MODEL}`;
                  } catch (error: any) {
                    console.error('Gemini formatting error:', error);
                    // If formatting fails, use simple text response
                    assistantResponse = `I found ${discoveryResults.length} places that match your search. Here are some top recommendations:\n\n${discoveryResults.slice(0, 3).map((r: any) => `• ${r.name} in ${r.city}`).join('\n')}`;
                    controller.enqueue(encoder.encode(createSSEMessage({
                      type: 'chunk',
                      content: assistantResponse
                    })));
                    usedModel = 'discovery-engine';
                  }
                } else {
                  // No LLM available, use simple text response
                  assistantResponse = `I found ${discoveryResults.length} places that match your search. Here are some top recommendations:\n\n${discoveryResults.slice(0, 3).map((r: any) => `• ${r.name} in ${r.city}`).join('\n')}`;
                  controller.enqueue(encoder.encode(createSSEMessage({
                    type: 'chunk',
                    content: assistantResponse
                  })));
                  usedModel = 'discovery-engine';
                }
              }
            }
          } catch (discoveryError: any) {
            console.error('Discovery Engine error:', discoveryError);
            // Only fallback if Discovery Engine breaks - don't use fallback if it just returns no results
            if (discoveryResults.length === 0) {
              // Discovery Engine failed or returned no results - use Gemini for general conversation
              if (genAI) {
                try {
                  const model = genAI.getGenerativeModel({ 
                    model: GEMINI_MODEL,
                    generationConfig: {
                      temperature: 0.9,
                      maxOutputTokens: 600,
                    },
                    systemInstruction: CHAT_SYSTEM_PROMPT,
                  });

                  // Build conversation history for chat
                  const history = recentMessages.slice(-5).map((msg: any) => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }],
                  }));

                  // Build the current prompt
                  const currentPrompt = `${contextInfo ? `Context: ${JSON.stringify({ ...session.context, ...contextUpdates })}\n\n` : ''}User: ${message}`;

                  // Start chat with history if available
                  let result;
                  if (history.length > 0) {
                    const chat = model.startChat({ history });
                    result = await chat.sendMessageStream(currentPrompt);
                  } else {
                    result = await model.generateContentStream(currentPrompt);
                  }

                  for await (const chunk of result.stream) {
                    const content = chunk.text();
                    if (content) {
                      assistantResponse += content;
                      controller.enqueue(encoder.encode(createSSEMessage({
                        type: 'chunk',
                        content
                      })));
                    }
                  }

                  usedModel = GEMINI_MODEL;
                } catch (error: any) {
                  console.error('Gemini fallback error:', error);
                }
              } else if (openai && openai.chat && CONVERSATION_MODEL.startsWith('gpt')) {
                // Fallback to OpenAI only if Gemini is not available
                try {
                  const openaiMessages = [
                    { role: 'system' as const, content: `${CHAT_SYSTEM_PROMPT}${contextInfo}` },
                    ...recentMessages.map((msg: any) => ({
                      role: (msg.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
                      content: msg.content,
                    })),
                    { role: 'user' as const, content: message },
                  ];

                  const stream = await openai.chat.completions.create({
                    model: CONVERSATION_MODEL,
                    messages: openaiMessages,
                    temperature: 0.9,
                    max_tokens: 600,
                    stream: true,
                  });

                  for await (const chunk of stream) {
                    const content = chunk.choices?.[0]?.delta?.content || '';
                    if (content) {
                      assistantResponse += content;
                      controller.enqueue(encoder.encode(createSSEMessage({
                        type: 'chunk',
                        content
                      })));
                    }
                  }

                  usedModel = CONVERSATION_MODEL;
                } catch (error: any) {
                  console.error('OpenAI fallback error:', error);
                }
              }
            }
          }

          // Only use final fallback if Discovery Engine broke AND LLM fallbacks failed
          if (!assistantResponse) {
            try {
              const fallbackSuggestions = await getContextSuggestions({ ...session.context, ...contextUpdates });
              assistantResponse = fallbackSuggestions.length > 0 && fallbackSuggestions[0]
                ? fallbackSuggestions[0]
                : "I'm here to help you discover amazing destinations! What are you looking for today?";

              controller.enqueue(encoder.encode(createSSEMessage({
                type: 'chunk',
                content: assistantResponse
              })));
            } catch (error: any) {
              console.error('Final fallback error:', error);
              assistantResponse = "I'm here to help you discover amazing destinations! What are you looking for today?";
              controller.enqueue(encoder.encode(createSSEMessage({
                type: 'chunk',
                content: assistantResponse
              })));
            }
          }

          // Save assistant message
          await saveMessage(session.sessionId, {
            role: 'assistant',
            content: assistantResponse,
          });

          // Log metrics
          await logConversationMetrics({
            userId: userId || session.sessionToken || session_token || 'anonymous',
            messageCount: messages.length + 2,
            intentType: intent.primaryIntent,
            modelUsed: usedModel,
            hasContext: Object.keys(session.context).length > 0,
          });

          // Get suggestions for next turn
          const suggestions = await getContextSuggestions({ ...session.context, ...contextUpdates });

          // Send completion message
          controller.enqueue(encoder.encode(createSSEMessage({
            type: 'complete',
            intent,
            suggestions: suggestions.slice(0, 3),
            session_id: session.sessionId,
            session_token: session.sessionToken,
            model: usedModel,
          })));

          controller.close();
        } catch (error: any) {
          console.error('Streaming conversation error:', error);
          controller.enqueue(encoder.encode(createSSEMessage({
            type: 'error',
            error: 'Failed to process conversation',
            details: error.message
          })));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Conversation streaming API error:', error);
    return new Response(
      encoder.encode(createSSEMessage({
        type: 'error',
        error: 'Failed to initialize conversation stream',
        details: error.message
      })),
      {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
  }
}
