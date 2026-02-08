'use client';

import { useState } from 'react';
import { Share2, Calendar, Printer, Copy, Check, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TripQuickActionsProps {
  tripId: string;
  tripTitle: string;
  startDate?: string | null;
  endDate?: string | null;
  destination?: string;
  className?: string;
}

/**
 * TripQuickActions - Floating action buttons for trip sharing and export
 * Share Trip, Export to Calendar, Print Itinerary
 */
export default function TripQuickActions({
  tripId,
  tripTitle,
  startDate,
  endDate,
  destination,
  className = '',
}: TripQuickActionsProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Generate shareable link
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/trips/${tripId}`
    : '';

  // Copy link to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Generate calendar export URL (Google Calendar)
  const handleExportCalendar = () => {
    if (!startDate) return;

    setExporting(true);

    // Format dates for Google Calendar
    const formatDate = (dateStr: string) => {
      return dateStr.replace(/-/g, '');
    };

    const start = formatDate(startDate);
    const end = endDate ? formatDate(endDate) : start;

    const calendarUrl = new URL('https://calendar.google.com/calendar/render');
    calendarUrl.searchParams.set('action', 'TEMPLATE');
    calendarUrl.searchParams.set('text', tripTitle);
    calendarUrl.searchParams.set('dates', `${start}/${end}`);
    calendarUrl.searchParams.set('details', `Trip planned with Urban Manual\n\nView itinerary: ${shareUrl}`);
    if (destination) {
      calendarUrl.searchParams.set('location', destination);
    }

    window.open(calendarUrl.toString(), '_blank');
    setExporting(false);
  };

  // Print itinerary
  const handlePrint = () => {
    window.print();
  };

  // Native share if available
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: tripTitle,
          text: destination ? `Check out my trip to ${destination}!` : 'Check out my trip!',
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or share failed
        setShowShareMenu(true);
      }
    } else {
      setShowShareMenu(true);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Share Button */}
      <div className="relative">
        <button
          onClick={handleNativeShare}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors"
          title="Share trip"
          aria-label="Share trip"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>

        {/* Share Menu Dropdown */}
        <AnimatePresence>
          {showShareMenu && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setShowShareMenu(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                className="absolute right-0 top-full mt-2 w-64 bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-2xl shadow-lg overflow-hidden z-50"
              >
                <div className="flex items-center justify-between px-3 pt-3 pb-2">
                  <p className="text-xs font-medium text-[var(--editorial-text-tertiary)] uppercase tracking-wider">
                    Share Link
                  </p>
                  <button
                    onClick={() => setShowShareMenu(false)}
                    className="p-1 text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] transition-colors"
                    aria-label="Close share menu"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="px-3 pb-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 px-2 py-1.5 text-xs bg-[var(--editorial-bg)] border border-[var(--editorial-border)] rounded-lg text-[var(--editorial-text-secondary)] truncate"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="p-1.5 text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-accent)] transition-colors"
                      title={copied ? 'Copied!' : 'Copy link'}
                      aria-label={copied ? 'Copied!' : 'Copy link'}
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="border-t border-[var(--editorial-border)] p-2">
                  <button
                    onClick={() => {
                      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out my trip${destination ? ` to ${destination}` : ''}!`)}`, '_blank');
                      setShowShareMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--editorial-text-primary)] hover:bg-[var(--editorial-border-subtle)] rounded-lg transition-colors text-left"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Share on X (Twitter)
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Export to Calendar */}
      {startDate && (
        <button
          onClick={handleExportCalendar}
          disabled={exporting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors disabled:opacity-50"
          title="Add to Google Calendar"
          aria-label="Export to Google Calendar"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export</span>
        </button>
      )}

      {/* Print */}
      <button
        onClick={handlePrint}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors print:hidden"
        title="Print itinerary"
        aria-label="Print itinerary"
      >
        <Printer className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Print</span>
      </button>
    </div>
  );
}
