'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Brain } from 'lucide-react';
import { ConversationBubble } from '@/app/components/chat/ConversationBubble';
import { useAuth } from '@/contexts/AuthContext';
import { Drawer } from '@/ui/Drawer';
import { DrawerHeader } from '@/ui/DrawerHeader';
import { DrawerSection } from '@/ui/DrawerSection';
import { ensureConversationSessionToken, persistConversationSessionToken } from '@/lib/chat/sessionToken';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
}

export function ChatDrawer({ isOpen, onClose }: ChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [guestSessionToken, setGuestSessionToken] = useState<string | null>(null);
  const [hasMemory, setHasMemory] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!user) {
      const token = ensureConversationSessionToken();
      if (token) setGuestSessionToken(token);
    } else {
      setGuestSessionToken(null);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && (user?.id || guestSessionToken)) {
      loadConversationHistory();
    }
  }, [isOpen, user?.id, guestSessionToken]);

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
        if (data.memory_enabled !== undefined) setMemoryEnabled(data.memory_enabled);
        if (data.has_memory_context !== undefined) setHasMemory(data.has_memory_context);
        if (isGuest && data.session_token) {
          persistConversationSessionToken(data.session_token);
          setGuestSessionToken(data.session_token);
        }
      }

      // Check memory status for authenticated users
      if (user?.id) {
        fetchMemoryStatus();
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  }

  const fetchMemoryStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/memory/profile');
      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          setHasMemory(data.profile.memoryCount > 0);
          setMemoryEnabled(true);
        }
      }
    } catch {
      // Memory status is optional
    }
  }, []);

  async function handleSubmitStreaming(userMessage: string) {
    setIsStreaming(true);
    setStreamingContent('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    try {
      const isGuest = !user?.id;
      let resolvedToken = isGuest ? guestSessionToken : undefined;
      if (isGuest && !resolvedToken) {
        resolvedToken = ensureConversationSessionToken();
        if (resolvedToken) setGuestSessionToken(resolvedToken);
      }
      const userId = user?.id || 'guest';
      const response = await fetch(`/api/conversation-stream/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, session_token: resolvedToken }),
      });

      if (!response.ok) throw new Error('Streaming failed');

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
              if (data.type === 'chunk') {
                fullResponse += data.content;
                setStreamingContent(fullResponse);
              } else if (data.type === 'memory_status') {
                setHasMemory(data.has_memory || false);
                setMemoryEnabled(data.memory_enabled || false);
              } else if (data.type === 'complete') {
                setSessionId(data.session_id || sessionId);
                lastSuggestions = data.suggestions || [];
                if (data.has_memory !== undefined) setHasMemory(data.has_memory);
                if (data.memory_enabled !== undefined) setMemoryEnabled(data.memory_enabled);
              }
            } catch {}
          }
        }
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: fullResponse, suggestions: lastSuggestions }]);
      if (isGuest && resolvedToken) persistConversationSessionToken(resolvedToken);
    } catch (error) {
      console.error('Streaming error:', error);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
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

  function handleSuggestionClick(suggestion: string) {
    setInput(suggestion);
    inputRef.current?.focus();
    setTimeout(() => {
      const form = inputRef.current?.form;
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }, 100);
  }

  const statusBadge = (
    <div className="flex items-center gap-3">
      {user && hasMemory && (
        <div className="flex items-center gap-1" title="Memory active - I remember your preferences">
          <Brain className="h-3.5 w-3.5 text-violet-500" />
          <span className="text-xs text-violet-500">Memory</span>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-xs text-gray-500">Online</span>
      </div>
    </div>
  );

  return (
    <Drawer isOpen={isOpen} onClose={onClose} desktopWidth="500px">
      <DrawerHeader title="Travel Chat" rightAccessory={statusBadge} />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.length === 0 && !isStreaming && (
          <DrawerSection>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
              {user && hasMemory
                ? 'Welcome back! I remember your preferences. Ask me anything.'
                : 'Ask about destinations, restaurants, or travel tips.'}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Best restaurants in Tokyo', 'Hotels in Paris', 'Romantic dinner spots'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </DrawerSection>
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
        {isStreaming && (
          <ConversationBubble role="assistant" content={streamingContent} isTyping={!streamingContent} />
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about restaurants, hotels..."
            className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors"
            disabled={isLoading || isStreaming}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isStreaming}
            className="px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </Drawer>
  );
}
