'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { ConversationBubble } from '@/app/components/chat/ConversationBubble';
import { useAuth } from '@/contexts/AuthContext';
import { ensureConversationSessionToken, persistConversationSessionToken } from '@/lib/chat/sessionToken';
// Analytics tracking via API
async function trackPageView(page: string, userId?: string) {
  fetch('/api/analytics/feature-usage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventType: 'page_view',
      userId,
      payload: { page },
    }),
  }).catch(() => {
    // Ignore errors
  });
}

async function trackChatMessage(userId: string | undefined, payload: { messageLength: number }) {
  fetch('/api/analytics/feature-usage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventType: 'chat_message',
      userId,
      payload,
    }),
  }).catch(() => {
    // Ignore errors
  });
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  timestamp?: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [guestSessionToken, setGuestSessionToken] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    trackPageView('chat', user?.id);
  }, [user?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, streamingContent]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Load conversation history
  useEffect(() => {
    if (!user) {
      const token = ensureConversationSessionToken();
      if (token) {
        setGuestSessionToken(token);
      }
    } else {
      setGuestSessionToken(null);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id || guestSessionToken) {
      loadConversationHistory();
    }
  }, [user?.id, guestSessionToken]);

  async function loadConversationHistory() {
    try {
      const isGuest = !user?.id;
      const resolvedToken = isGuest ? guestSessionToken : undefined;
      if (isGuest && !resolvedToken) return;
      const userId = user?.id || 'guest';
      const tokenQuery = resolvedToken ? `?session_token=${resolvedToken}` : '';
      const response = await fetch(`/api/conversation/${userId}${tokenQuery}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setSessionId(data.session_id || null);
        if (isGuest && data.session_token) {
          persistConversationSessionToken(data.session_token);
          setGuestSessionToken(data.session_token);
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  }

  async function handleSubmitStreaming(userMessage: string) {
    setIsStreaming(true);
    setStreamingContent('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    trackChatMessage(user?.id, { messageLength: userMessage.length });

    try {
      const isGuest = !user?.id;
      let resolvedToken = isGuest ? guestSessionToken : undefined;
      if (isGuest && !resolvedToken) {
        resolvedToken = ensureConversationSessionToken();
        if (resolvedToken) {
          setGuestSessionToken(resolvedToken);
        }
      }
      const userId = user?.id || 'guest';
      const response = await fetch(`/api/conversation-stream/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          session_token: resolvedToken,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Streaming conversation failed');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader available');

      let fullResponse = '';
      let lastSuggestions: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'chunk':
                  fullResponse += data.content;
                  setStreamingContent(fullResponse);
                  break;

                case 'complete':
                  setSessionId(data.session_id || sessionId);
                  lastSuggestions = data.suggestions || [];
                  break;

                case 'error':
                  console.error('Streaming error:', data.error, data.details);
                  fullResponse = data.error || "Sorry, I encountered an error. Please try again.";
                  setStreamingContent(fullResponse);
                  setIsStreaming(false);
                  break;
              }
            } catch (e) {
              // Ignore parsing errors for partial chunks
            }
          }
        }
      }

      // Add the complete message to history
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: fullResponse,
          suggestions: lastSuggestions,
        },
      ]);
      if (isGuest && resolvedToken) {
        persistConversationSessionToken(resolvedToken);
      }
    } catch (error) {
      console.error('Streaming conversation error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading || isStreaming) return;

    const userMessage = input.trim();
    setInput('');
    await handleSubmitStreaming(userMessage);
  }

  async function handleSuggestionClick(suggestion: string) {
    // Track suggestion acceptance (fire and forget)
    if (sessionId) {
      fetch('/api/analytics/feature-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'suggestion_accepted',
          userId: user?.id,
          payload: { sessionId, suggestion },
        }),
      }).catch(() => {
        // Ignore errors
      });
    }
    setInput(suggestion);
    inputRef.current?.focus();
    // Auto-submit after a brief delay
    setTimeout(() => {
      const form = inputRef.current?.form;
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
    }, 100);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full px-6 md:px-10 lg:px-12 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Travel Chat
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Ask me anything about restaurants, hotels, cities, and travel destinations.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Travel Intelligence ⚡ Streaming
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && !isLoading && !isStreaming && (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Start a conversation by asking about destinations, restaurants, or travel recommendations.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {['Best restaurants in Tokyo', 'Hotels in Paris', 'Cafes with good WiFi', 'Romantic dinner spots'].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-dark-blue-700 rounded-lg transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((message, idx) => (
                <ConversationBubble
                  key={idx}
                  role={message.role}
                  content={message.content}
                  suggestions={message.suggestions}
                  onSuggestionClick={handleSuggestionClick}
                />
              ))}
              {(isLoading || isStreaming) && (
                <ConversationBubble
                  role="assistant"
                  content={streamingContent}
                  isTyping={isLoading && !isStreaming}
                />
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-800">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about restaurants, hotels, cities..."
                  className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 text-gray-900 dark:text-gray-100"
                  disabled={isLoading || isStreaming}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading || isStreaming}
                  className="px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
  );
}

