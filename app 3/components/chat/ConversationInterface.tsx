'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConversationBubble } from './ConversationBubble';
import { useAuth } from '@/contexts/AuthContext';
import { trackSuggestionAcceptance } from '@/lib/metrics/conversationMetrics';
import { ensureConversationSessionToken, persistConversationSessionToken } from '@/lib/chat/sessionToken';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  timestamp?: Date;
}

interface ConversationInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  sessionToken?: string;
}

export function ConversationInterface({
  isOpen,
  onClose,
  sessionToken,
}: ConversationInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [guestSessionToken, setGuestSessionToken] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

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
    if (isOpen && (user?.id || sessionToken || guestSessionToken)) {
      loadConversationHistory();
    }
  }, [isOpen, user?.id, sessionToken, guestSessionToken]);

  async function loadConversationHistory() {
    try {
      const isGuest = !user?.id;
      const resolvedToken = isGuest ? (sessionToken || guestSessionToken) : sessionToken;
      if (isGuest && !resolvedToken) return;
      const userId = user?.id || 'guest';
      const tokenQuery = resolvedToken ? `?session_token=${resolvedToken}` : '';
      const response = await fetch(
        `/api/conversation/${userId}${tokenQuery}`
      );
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const isGuest = !user?.id;
      let resolvedToken = isGuest ? (sessionToken || guestSessionToken) : sessionToken;
      if (isGuest && !resolvedToken) {
        resolvedToken = ensureConversationSessionToken();
        if (resolvedToken) {
          setGuestSessionToken(resolvedToken);
        }
      }
      const userId = user?.id || 'guest';
      const response = await fetch(`/api/conversation/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          session_token: resolvedToken,
        }),
      });

      if (!response.ok) throw new Error('Conversation failed');

      const data = await response.json();
      
      setSessionId(data.session_id || sessionId);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message,
          suggestions: data.suggestions,
        },
      ]);
      if (isGuest && resolvedToken) {
        persistConversationSessionToken(resolvedToken);
      }
    } catch (error) {
      console.error('Conversation error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSuggestionClick(suggestion: string) {
    await trackSuggestionAcceptance(sessionId || '', suggestion, user?.id);
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

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center pointer-events-none"
    >
      <div className="w-full max-w-3xl mb-4 px-4 pointer-events-auto">
        {/* Chat Container */}
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 dark:border-white/10">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-800/50">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Travel Intelligence
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-dark-blue-700 rounded-2xl transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {/* Messages */}
          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
            <AnimatePresence>
              {messages.map((message, idx) => (
                <ConversationBubble
                  key={idx}
                  role={message.role}
                  content={message.content}
                  suggestions={message.suggestions}
                  onSuggestionClick={handleSuggestionClick}
                />
              ))}
              {isLoading && (
                <ConversationBubble
                  role="assistant"
                  content=""
                  isTyping={true}
                />
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200/50 dark:border-gray-800/50">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about restaurants, hotels, cities..."
                className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 text-gray-900 dark:text-gray-100"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}

