'use client';

import { useState, useRef, useEffect } from 'react';
import {
  MoreHorizontal,
  ListChecks,
  Package,
  Share2,
  Printer,
  StickyNote,
  Pencil,
  Trash2,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TripQuickActionsProps {
  tripId: string;
  tripTitle: string;
  startDate?: string | null;
  endDate?: string | null;
  destination?: string;
  className?: string;
  onScrollToChecklist?: () => void;
  onScrollToPackingList?: () => void;
  onOpenNotes?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * TripQuickActions - "..." menu button with structured dropdown
 * Organized into sections: Lists, Collaboration, Trip
 */
export default function TripQuickActions({
  tripId,
  tripTitle,
  startDate,
  endDate,
  destination,
  className = '',
  onScrollToChecklist,
  onScrollToPackingList,
  onOpenNotes,
  onEdit,
  onDelete,
}: TripQuickActionsProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Share: generate token-based share link
  const handleShare = async () => {
    setSharing(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/share`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const url = data.shareUrl || `${window.location.origin}/trips/shared/${data.shareToken}`;
        setShareUrl(url);
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback: copy current URL
      const fallback = `${window.location.origin}/trips/${tripId}`;
      await navigator.clipboard.writeText(fallback);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } finally {
      setSharing(false);
    }
  };

  // Download iCal
  const handleDownloadIcal = () => {
    window.open(`/api/trips/${tripId}/export/ical`, '_blank');
    setOpen(false);
  };

  // Print
  const handlePrint = () => {
    setOpen(false);
    setTimeout(() => window.print(), 100);
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      {/* Trigger: "..." button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--editorial-border-subtle)] text-[var(--editorial-text-secondary)] transition-colors"
        title="Trip menu"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 w-52 bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-xl shadow-lg overflow-hidden z-50"
          >
            {/* Lists section */}
            <div className="px-3 pt-2.5 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-500">Lists</p>
            </div>
            {onScrollToChecklist && (
              <MenuButton
                icon={<ListChecks className="w-4 h-4" />}
                label="Checklist"
                onClick={() => { onScrollToChecklist(); setOpen(false); }}
              />
            )}
            {onScrollToPackingList && (
              <MenuButton
                icon={<Package className="w-4 h-4" />}
                label="Packing list"
                onClick={() => { onScrollToPackingList(); setOpen(false); }}
              />
            )}

            {/* Collaboration section */}
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-500">Collaboration</p>
            </div>
            <MenuButton
              icon={copied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
              label={copied ? 'Link copied!' : sharing ? 'Sharing...' : 'Share'}
              onClick={handleShare}
              disabled={sharing}
            />

            {/* Trip section */}
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-500">Trip</p>
            </div>
            <MenuButton
              icon={<Printer className="w-4 h-4" />}
              label="Pretty Print"
              onClick={handlePrint}
            />
            <MenuButton
              icon={<Download className="w-4 h-4" />}
              label="Export to Calendar"
              onClick={handleDownloadIcal}
            />
            {onOpenNotes && (
              <MenuButton
                icon={<StickyNote className="w-4 h-4" />}
                label="Notes"
                onClick={() => { onOpenNotes(); setOpen(false); }}
              />
            )}
            {onEdit && (
              <MenuButton
                icon={<Pencil className="w-4 h-4" />}
                label="Edit"
                onClick={() => { onEdit(); setOpen(false); }}
              />
            )}
            {onDelete && (
              <>
                <div className="border-t border-[var(--editorial-border)] my-1" />
                <MenuButton
                  icon={<Trash2 className="w-4 h-4" />}
                  label="Delete"
                  onClick={() => { onDelete(); setOpen(false); }}
                  danger
                />
              </>
            )}

            {/* Bottom padding */}
            <div className="h-1" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Reusable menu row */
function MenuButton({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left ${
        danger
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-[var(--editorial-text-primary)] hover:bg-[var(--editorial-border-subtle)]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className="flex-shrink-0 text-[var(--editorial-text-tertiary)]">{icon}</span>
      {label}
    </button>
  );
}
