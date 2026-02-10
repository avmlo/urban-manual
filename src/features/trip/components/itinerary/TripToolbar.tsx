'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Route,
  DollarSign,
  Share2,
  Download,
  Settings,
  MoreHorizontal,
  Users,
} from 'lucide-react';
import type { TripDay } from '@/lib/hooks/useTripEditor';

// ─── Types ──────────────────────────────────────────────────────

interface TripToolbarProps {
  tripId: string;
  tripTitle: string;
  primaryCity?: string;
  startDate?: string | null;
  endDate?: string | null;
  days: TripDay[];
  status?: 'planning' | 'upcoming' | 'ongoing' | 'completed';
  travelerCount?: number;
  budgetLimit?: number;
  onEdit?: () => void;
  onShare?: () => void;
  onExportIcal?: () => void;
  onSettings?: () => void;
  className?: string;
}

// ─── Constants ──────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '\u20AC', GBP: '\u00A3', JPY: '\u00A5', CHF: 'CHF',
  AUD: 'A$', CAD: 'C$',
};

const STATUS_STYLES: Record<string, string> = {
  planning: 'bg-amber-100/80 dark:bg-amber-900/25 text-amber-700 dark:text-amber-400',
  upcoming: 'bg-blue-100/80 dark:bg-blue-900/25 text-blue-700 dark:text-blue-400',
  ongoing:  'bg-emerald-100/80 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-400',
  completed: 'bg-stone-100/80 dark:bg-stone-700/30 text-stone-600 dark:text-stone-400',
};

const STATUS_LABELS: Record<string, string> = {
  planning: 'Draft',
  upcoming: 'Upcoming',
  ongoing: 'Active',
  completed: 'Complete',
};

// ─── Component ──────────────────────────────────────────────────

export default function TripToolbar({
  tripId,
  tripTitle,
  primaryCity,
  startDate,
  endDate,
  days,
  status = 'planning',
  travelerCount,
  budgetLimit,
  onEdit,
  onShare,
  onExportIcal,
  onSettings,
  className = '',
}: TripToolbarProps) {
  // ── Computed stats ──

  const { totalCost, currency } = useMemo(() => {
    let total = 0;
    let detected = 'EUR';
    for (const day of days) {
      for (const item of day.items) {
        const cost = item.parsedNotes?.costEstimate;
        if (cost && cost > 0) {
          total += cost;
          if (item.parsedNotes?.currency) detected = item.parsedNotes.currency;
        }
      }
    }
    return { totalCost: total, currency: detected };
  }, [days]);

  const totalDistanceKm = useMemo(() => {
    let total = 0;
    for (const day of days) {
      for (const item of day.items) {
        const d = item.parsedNotes?.travelDistanceToNext;
        if (d && d > 0) total += d;
      }
    }
    return Math.round(total);
  }, [days]);

  const symbol = CURRENCY_SYMBOLS[currency] || currency;

  // Format budget string
  const budgetStr = useMemo(() => {
    if (totalCost <= 0) return null;
    const fmt = (n: number) =>
      n >= 10000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString();
    if (budgetLimit && budgetLimit > 0) {
      return `${symbol}${fmt(totalCost)} / ${symbol}${fmt(budgetLimit)}`;
    }
    return `${symbol}${fmt(totalCost)}`;
  }, [totalCost, budgetLimit, symbol]);

  // Format distance
  const distStr = useMemo(() => {
    if (totalDistanceKm <= 0) return null;
    return `${totalDistanceKm.toLocaleString()} km`;
  }, [totalDistanceKm]);

  // ── Mobile summary ──

  const totalItems = useMemo(
    () => days.reduce((s, d) => s + d.items.length, 0),
    [days],
  );

  // ── Actions dropdown (mobile overflow) ──

  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!actionsOpen) return;
    const close = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setActionsOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [actionsOpen]);

  return (
    <div
      className={`
        flex items-center gap-2 px-3 h-11 flex-shrink-0
        bg-[var(--editorial-bg)]/95 backdrop-blur-md
        border-b border-[var(--editorial-border)]/50
        ${className}
      `}
    >
      {/* ── Left: Back + Title ── */}
      <Link
        href="/trips"
        className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-[var(--editorial-border-subtle)] text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] transition-colors flex-shrink-0"
      >
        <ArrowLeft className="w-4 h-4" />
      </Link>

      <button
        onClick={onEdit}
        className="text-sm font-semibold text-[var(--editorial-text-primary)] truncate max-w-[160px] lg:max-w-[200px] hover:opacity-70 transition-opacity cursor-pointer"
        title={tripTitle}
      >
        {tripTitle}
      </button>

      {/* ── Center: Stats badges (desktop) ── */}
      <div className="hidden lg:flex items-center gap-1.5 ml-3">
        {/* Distance */}
        {distStr && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-[11px] font-medium tabular-nums leading-none">
            <Route className="w-3 h-3" />
            {distStr}
          </span>
        )}

        {/* Budget */}
        {budgetStr && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium tabular-nums leading-none">
            <DollarSign className="w-3 h-3" />
            {budgetStr}
          </span>
        )}

        {/* Status pill */}
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium leading-none ${STATUS_STYLES[status] || STATUS_STYLES.planning}`}
        >
          {STATUS_LABELS[status] || 'Draft'}
        </span>
      </div>

      {/* ── Center: Collapsed summary (mobile) ── */}
      <div className="lg:hidden flex items-center ml-auto mr-1">
        <span className="text-[11px] text-[var(--editorial-text-tertiary)] tabular-nums">
          {days.length}d &middot; {totalItems} items
        </span>
      </div>

      {/* ── Spacer (desktop) ── */}
      <div className="hidden lg:block flex-1" />

      {/* ── Right: Action icons (desktop) ── */}
      <div className="hidden lg:flex items-center gap-0.5">
        {/* Member avatars placeholder */}
        {travelerCount != null && travelerCount > 0 && (
          <div className="flex items-center -space-x-1.5 mr-1.5">
            {Array.from({ length: Math.min(travelerCount, 3) }).map((_, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full bg-[var(--editorial-border-subtle)] border-2 border-[var(--editorial-bg)] flex items-center justify-center"
              >
                <Users className="w-3 h-3 text-[var(--editorial-text-tertiary)]" />
              </div>
            ))}
            {travelerCount > 3 && (
              <div className="w-6 h-6 rounded-full bg-[var(--editorial-border-subtle)] border-2 border-[var(--editorial-bg)] flex items-center justify-center">
                <span className="text-[9px] font-medium text-[var(--editorial-text-tertiary)]">
                  +{travelerCount - 3}
                </span>
              </div>
            )}
          </div>
        )}

        {onShare && (
          <ToolbarButton icon={<Share2 className="w-[18px] h-[18px]" />} title="Share" onClick={onShare} />
        )}
        {onExportIcal && (
          <ToolbarButton icon={<Download className="w-[18px] h-[18px]" />} title="Export" onClick={onExportIcal} />
        )}
        {onSettings && (
          <ToolbarButton icon={<Settings className="w-[18px] h-[18px]" />} title="Settings" onClick={onSettings} />
        )}
      </div>

      {/* ── Right: Overflow menu (mobile + desktop fallback) ── */}
      <div className="relative lg:hidden" ref={actionsRef}>
        <button
          onClick={() => setActionsOpen(!actionsOpen)}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--editorial-border-subtle)] text-[var(--editorial-text-secondary)] transition-colors"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>

        {actionsOpen && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-xl shadow-lg overflow-hidden z-50">
            {onShare && (
              <MobileMenuItem icon={<Share2 className="w-4 h-4" />} label="Share" onClick={() => { onShare(); setActionsOpen(false); }} />
            )}
            {onExportIcal && (
              <MobileMenuItem icon={<Download className="w-4 h-4" />} label="Export" onClick={() => { onExportIcal(); setActionsOpen(false); }} />
            )}
            {onSettings && (
              <MobileMenuItem icon={<Settings className="w-4 h-4" />} label="Settings" onClick={() => { onSettings(); setActionsOpen(false); }} />
            )}
            <div className="h-1" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────

function ToolbarButton({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] hover:bg-[var(--editorial-border-subtle)] transition-colors"
      title={title}
    >
      {icon}
    </button>
  );
}

function MobileMenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--editorial-text-primary)] hover:bg-[var(--editorial-border-subtle)] transition-colors text-left"
    >
      <span className="flex-shrink-0 text-[var(--editorial-text-tertiary)]">{icon}</span>
      {label}
    </button>
  );
}
