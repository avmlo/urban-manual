'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface ConversationBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
  isTyping?: boolean;
}

export function ConversationBubble({
  role,
  content,
  suggestions = [],
  onSuggestionClick,
  isTyping = false,
}: ConversationBubbleProps) {
  if (role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[75%] bg-black dark:bg-white text-white dark:text-black rounded-2xl px-4 py-2.5 text-sm">
          {content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="max-w-[85%]">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">AI</span>
        </div>

        <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-2xl px-4 py-3 border border-gray-200/50 dark:border-gray-800/50">
          {isTyping ? (
            <TypingIndicator />
          ) : (
            <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {content}
            </div>
          )}

          {suggestions.length > 0 && !isTyping && (
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestions.map((suggestion, idx) => (
                <QuickReplyChip
                  key={idx}
                  text={suggestion}
                  onClick={() => onSuggestionClick?.(suggestion)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"
          animate={{
            y: [0, -8, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
}

interface QuickReplyChipProps {
  text: string;
  onClick?: () => void;
}

function QuickReplyChip({ text, onClick }: QuickReplyChipProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-800"
    >
      {text}
    </motion.button>
  );
}

