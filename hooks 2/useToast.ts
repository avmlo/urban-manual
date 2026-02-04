/**
 * Toast Hook
 * Easy-to-use hook for showing toast notifications
 */
'use client';

import { useCallback } from 'react';
import { ToastType } from '@/components/Toast';

export function useToast() {
  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    // Use the global showToast function from ToastContainer
    if (typeof window !== 'undefined' && window.showToast) {
      window.showToast(message, type, duration);
    } else {
      console.warn('ToastContainer not mounted. Add <ToastContainer /> to your layout.');
    }
  }, []);

  const success = useCallback((message: string, duration?: number) => {
    showToast(message, 'success', duration);
  }, [showToast]);

  const error = useCallback((message: string, duration?: number) => {
    showToast(message, 'error', duration);
  }, [showToast]);

  const warning = useCallback((message: string, duration?: number) => {
    showToast(message, 'warning', duration);
  }, [showToast]);

  const info = useCallback((message: string, duration?: number) => {
    showToast(message, 'info', duration);
  }, [showToast]);

  return {
    showToast,
    success,
    error,
    warning,
    info,
  };
}
