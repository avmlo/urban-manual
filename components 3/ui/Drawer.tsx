'use client';

import { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
  mobileFullScreen?: boolean;
  desktopWidth?: string;
  zIndex?: number;
  showBackdrop?: boolean;
  backdropOpacity?: string;
}

/**
 * Universal Drawer Component
 * 
 * A reusable drawer component that handles:
 * - Mobile: Full-screen bottom sheet or slideover
 * - Desktop: Slideover from right
 * - Backdrop with click-to-close
 * - Body scroll lock
 * - Escape key handling
 * - Smooth animations
 */
export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  headerContent,
  footerContent,
  mobileFullScreen = true,
  desktopWidth = '440px',
  zIndex = 50,
  showBackdrop = true,
  backdropOpacity = '50',
}: DrawerProps) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      {showBackdrop && (
        <div
          className={`fixed inset-0 transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            backgroundColor: `rgba(0, 0, 0, ${parseInt(backdropOpacity) / 100})`,
            zIndex: zIndex - 10,
          }}
          onClick={onClose}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`md:hidden fixed inset-x-0 ${
          mobileFullScreen ? 'bottom-0 top-0' : 'bottom-0'
        } transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        } flex flex-col bg-white dark:bg-gray-950 shadow-2xl`}
        style={{ zIndex }}
      >
        {/* Header */}
        {(title || headerContent) && (
          <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm">
            {headerContent || (
              <>
                {title && (
                  <h2 className="text-sm font-bold uppercase tracking-wide text-gray-900 dark:text-white">
                    {title}
                  </h2>
                )}
                <button
                  onClick={onClose}
                  className="p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 touch-manipulation"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-gray-900 dark:text-gray-100" />
                </button>
              </>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footerContent && (
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            {footerContent}
          </div>
        )}
      </div>

      {/* Desktop Slideover */}
      <div
        className={`hidden md:flex fixed right-4 top-4 bottom-4 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-950 shadow-2xl ring-1 ring-black/5 rounded-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'
        } overflow-hidden flex-col`}
        style={{ width: desktopWidth, zIndex }}
      >
        {/* Header */}
        {(title || headerContent) && (
          <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm">
            {headerContent || (
              <>
                {title && (
                  <h2 className="text-sm font-bold uppercase tracking-wide text-gray-900 dark:text-white">
                    {title}
                  </h2>
                )}
                <button
                  onClick={onClose}
                  className="p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 touch-manipulation"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-gray-900 dark:text-gray-100" />
                </button>
              </>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footerContent && (
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            {footerContent}
          </div>
        )}
      </div>
    </>
  );
}

