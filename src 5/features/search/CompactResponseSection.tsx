'use client';

import { useState, useRef, useEffect } from 'react';

export interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface CompactResponseSectionProps {
  query: string;
  messages: Message[];
  suggestions?: Array<{ label: string; refinement: string }>;
  onChipClick: (refinement: string) => void;
  onFollowUp?: (message: string) => Promise<string>;
  className?: string;
}

export function CompactResponseSection({
  query,
  messages,
  suggestions = [],
  onChipClick,
  onFollowUp,
  className = '',
}: CompactResponseSectionProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !onFollowUp || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      await onFollowUp(userMessage);
    } catch (error) {
      console.error('Follow-up error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`relative mb-8 ${className}`}>
      {/* Query (uppercase) */}
      {query && (
        <h2 className="text-xs font-medium tracking-widest uppercase text-neutral-500 mb-4">
          {query.toUpperCase()}
        </h2>
      )}

      {/* Scrollable conversation area (200px max) */}
      <div
        ref={scrollRef}
        className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-transparent mb-4"
      >
        <div className="space-y-3 pr-2">
          {/* Contextual response messages */}
          {messages.length === 0 ? (
            <p className="text-sm leading-relaxed text-neutral-400">
              Start a conversation to refine your search...
            </p>
          ) : (
            messages.map((message, i) => (
              <div key={i} className="flex flex-col gap-1">
                {message.role === 'assistant' ? (
                  <p className="text-sm leading-relaxed text-neutral-700">
                    {message.content}
                  </p>
                ) : (
                  <p className="text-sm leading-relaxed text-neutral-500 italic">
                    → {message.content}
                  </p>
                )}
              </div>
            ))
          )}

          {/* Loading indicator */}
          {isLoading && (
            <p className="text-sm text-neutral-400 italic">
              with our in-house travel intelligence…
            </p>
          )}
        </div>
      </div>

      {/* Clickable refinement chips */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => onChipClick(suggestion.refinement)}
              className="px-3 py-1.5 text-xs font-medium border border-neutral-300 rounded-full hover:border-neutral-900 hover:bg-gray-900 hover:text-white transition-all duration-200 active:scale-95"
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      )}

      {/* Optional follow-up input */}
      {onFollowUp && (
        <form onSubmit={handleSubmit} className="mt-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow-up..."
            disabled={isLoading}
            className="w-full px-0 py-2 text-sm border-b border-neutral-200 dark:border-neutral-700 focus:border-neutral-900 dark:focus:border-neutral-100 focus:outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500 bg-transparent text-neutral-900 dark:text-neutral-100 disabled:opacity-50 transition-colors duration-200"
          />
        </form>
      )}
    </div>
  );
}
