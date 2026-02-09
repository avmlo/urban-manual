'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/ui/button';
import {
  useNotifications,
  shouldShowNotificationPrompt,
  dismissNotificationPrompt,
} from '@/hooks/useNotifications';
import {
  POPUP_EVENTS,
  POPUP_DELAY_AFTER_PREVIOUS,
  isCookieConsentResolved,
} from '@/lib/popup-queue';

interface NotificationPromptProps {
  /** Delay before showing the prompt after cookie consent is resolved (in ms) */
  delay?: number;
}

/**
 * A non-intrusive prompt to request notification permissions
 * Shows after cookie consent is resolved (progressive disclosure pattern)
 * to prevent multiple popups appearing simultaneously
 */
export function NotificationPrompt({ delay = POPUP_DELAY_AFTER_PREVIOUS }: NotificationPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [cookieConsentResolved, setCookieConsentResolved] = useState(false);
  const { isSupported, permission, isRequesting, requestPermission } = useNotifications();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for cookie consent resolution
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already resolved
    if (isCookieConsentResolved()) {
      setCookieConsentResolved(true);
      return;
    }

    // Listen for the event
    const handleCookieConsentResolved = () => {
      setCookieConsentResolved(true);
    };

    window.addEventListener(POPUP_EVENTS.COOKIE_CONSENT_RESOLVED, handleCookieConsentResolved);

    return () => {
      window.removeEventListener(POPUP_EVENTS.COOKIE_CONSENT_RESOLVED, handleCookieConsentResolved);
    };
  }, []);

  // Show notification prompt only after cookie consent is resolved
  useEffect(() => {
    // Only show on client side
    if (typeof window === 'undefined') return;

    // Wait for cookie consent to be resolved first (progressive disclosure)
    if (!cookieConsentResolved) return;

    // Don't show if not supported or already decided
    if (!isSupported || permission !== 'default') return;

    // Check if should show based on dismiss state
    if (!shouldShowNotificationPrompt()) return;

    // Show after delay (gives user time to process after cookie consent)
    timerRef.current = setTimeout(() => {
      setIsAnimating(true);
      setTimeout(() => setIsVisible(true), 50);
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isSupported, permission, delay, cookieConsentResolved]);

  const handleEnable = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      // Show a welcome notification
      setTimeout(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Notifications enabled!', {
            body: "You'll receive updates about your saved places and trips.",
            icon: '/icon-192.png',
          });
        }
      }, 500);
    }
    handleClose();
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleDismiss = (permanent = false) => {
    dismissNotificationPrompt(permanent);
    handleClose();
  };

  if (!isAnimating) return null;

  return (
    <div
      className={`
        fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50
        bg-[var(--editorial-bg)] rounded-2xl border border-[var(--editorial-border)]
        shadow-sm transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      `}
      role="dialog"
      aria-labelledby="notification-prompt-title"
    >
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-[var(--editorial-accent)]/10 rounded-full flex items-center justify-center">
            <Bell className="w-5 h-5 text-[var(--editorial-accent)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              id="notification-prompt-title"
              className="text-sm font-semibold text-[var(--editorial-text-primary)]"
            >
              Stay updated
            </h3>
            <p className="mt-1 text-sm text-[var(--editorial-text-secondary)]">
              Get notified about new destinations, trip updates, and personalized recommendations.
            </p>
          </div>
          <button
            onClick={() => handleDismiss(false)}
            className="flex-shrink-0 p-1 rounded-full hover:bg-[var(--editorial-border-subtle)] transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={handleEnable}
            disabled={isRequesting}
            size="sm"
            className="flex-1 rounded-full"
          >
            {isRequesting ? 'Enabling...' : 'Enable notifications'}
          </Button>
          <Button
            onClick={() => handleDismiss(true)}
            variant="ghost"
            size="sm"
            className="rounded-full text-[var(--editorial-text-secondary)]"
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
