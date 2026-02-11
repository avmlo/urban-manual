'use client';

import { Paperclip, Users } from 'lucide-react';

interface LogisticalIndicatorsProps {
  /** Whether the item has attached documents/confirmations */
  hasAttachments?: boolean;
  /** Booking status indicator */
  bookingStatus?: 'need-to-book' | 'booked' | 'waitlist' | 'walk-in';
  /** Party size for group indicators */
  partySize?: number;
  /** Compact: render inline without wrapping container */
  className?: string;
}

/**
 * LogisticalIndicators - High-contrast micro-badges for non-AI logistical data.
 * Renders only the indicators that have data, staying compact and unobtrusive.
 */
export default function LogisticalIndicators({
  hasAttachments,
  bookingStatus,
  partySize,
  className = '',
}: LogisticalIndicatorsProps) {
  const hasAny = hasAttachments || (partySize && partySize > 1) || (bookingStatus && bookingStatus !== 'booked');
  if (!hasAny) return null;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Attachment indicator */}
      {hasAttachments && (
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded bg-stone-200/80 dark:bg-gray-700/80 text-stone-500 dark:text-gray-400"
          title="Has attachments"
        >
          <Paperclip className="w-3 h-3" />
        </span>
      )}

      {/* Group / party size */}
      {partySize != null && partySize > 1 && (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 h-5 rounded bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-medium"
          title={`Party of ${partySize}`}
        >
          <Users className="w-2.5 h-2.5" />
          {partySize}
        </span>
      )}

      {/* Booking status dot */}
      {bookingStatus && bookingStatus !== 'booked' && (
        <span
          className={`inline-flex items-center gap-0.5 px-1.5 h-5 rounded text-[10px] font-medium ${
            bookingStatus === 'need-to-book'
              ? 'bg-amber-100/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
              : bookingStatus === 'waitlist'
                ? 'bg-orange-100/80 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                : 'bg-stone-100/80 dark:bg-gray-700/60 text-stone-500 dark:text-gray-400'
          }`}
          title={bookingStatus.replace('-', ' ')}
        >
          {bookingStatus === 'need-to-book' ? 'Book' : bookingStatus === 'waitlist' ? 'Waitlist' : 'Walk-in'}
        </span>
      )}
    </div>
  );
}
