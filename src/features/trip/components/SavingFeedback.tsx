'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import type { SavingStatus } from '@/lib/hooks/useTripEditor';

interface SavingFeedbackProps {
  status: SavingStatus;
  className?: string;
}

/**
 * SavingFeedback - Subtle visual indicator for save operations
 * Shows a minimal toast at the bottom of the screen when saving/saved/error
 */
export function SavingFeedback({ status, className = '' }: SavingFeedbackProps) {
  const isVisible = status !== 'idle';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 ${className}`}
        >
          <div
            className={`
              glass-control flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg
              text-sm font-medium
              ${status === 'saving' ? 'text-[var(--editorial-text-primary)]' : ''}
              ${status === 'saved' ? 'text-green-600 dark:text-green-400' : ''}
              ${status === 'error' ? 'text-red-600 dark:text-red-400' : ''}
            `}
          >
            {status === 'saving' && (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            )}
            {status === 'saved' && (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 400 }}
                >
                  <Check className="w-3.5 h-3.5" />
                </motion.div>
                <span>Saved</span>
              </>
            )}
            {status === 'error' && (
              <>
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Failed to save</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * CSS class for glow animation on newly saved items
 * Use with: className={lastSavedItemId === item.id ? 'animate-save-glow' : ''}
 */
export const saveGlowStyles = `
  @keyframes save-glow {
    0% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
    }
  }

  .animate-save-glow {
    animation: save-glow 0.8s ease-out;
  }
`;

export default SavingFeedback;
