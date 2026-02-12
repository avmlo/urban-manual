'use client';

/**
 * HotelActivityRow - Card for hotel check-in, checkout, and breakfast activities
 * TRIP-style uniform row: time pill | status dot | icon | title | status badge
 *
 * Uses PrimeReact Tag for status badges (matching itskovacs/trip PrimeNG element architecture)
 * Design adapted from itskovacs/trip (MIT)
 * https://github.com/itskovacs/trip
 */
import { useState } from 'react';
import { GripVertical, DoorOpen, Coffee, LogOut, ChevronRight } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { Tag } from 'primereact/tag';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import { formatTime } from '@/features/trip/lib/utils';

interface HotelActivityRowProps {
  item: EnrichedItineraryItem;
  activityType: 'breakfast' | 'checkout' | 'checkin';
  isEditMode?: boolean;
  onSelect?: () => void;
  onDragEnd?: () => void;
}

export default function HotelActivityRow({
  item,
  activityType,
  isEditMode,
  onSelect,
  onDragEnd,
}: HotelActivityRowProps) {
  const [isDragging, setIsDragging] = useState(false);

  const hotelName = item.title || 'Hotel';

  const getActivityDetails = () => {
    // Warm amber tint for hotel activity icons
    const iconCls = "w-3.5 h-3.5 text-amber-600 dark:text-amber-400";
    switch (activityType) {
      case 'checkin':
        return {
          icon: <DoorOpen className={iconCls} />,
          label: 'Check in',
          time: item.parsedNotes?.checkInTime || '',
        };
      case 'breakfast':
        return {
          icon: <Coffee className={iconCls} />,
          label: 'Breakfast',
          time: item.parsedNotes?.breakfastTime?.split('-')[0] || '08:00',
        };
      case 'checkout':
        return {
          icon: <LogOut className={iconCls} />,
          label: 'Check out',
          time: item.parsedNotes?.checkOutTime || '',
        };
    }
  };

  const details = getActivityDetails();

  return (
    <Reorder.Item
      value={item}
      id={item.id}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => { setIsDragging(false); onDragEnd?.(); }}
      dragListener={isEditMode}
      className={`${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'z-50' : ''}`}
    >
      <div
        onClick={onSelect}
        className={`trip-item-row relative overflow-hidden rounded-xl cursor-pointer bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] ${
          isDragging ? 'shadow-xl ring-2 ring-blue-400 dark:ring-blue-500' : ''
        }`}
      >
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            {/* Drag handle */}
            {isEditMode && (
              <div className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing">
                <GripVertical className="w-4 h-4 text-gray-400 opacity-60" />
              </div>
            )}

            {/* Time pill - 24h format */}
            <span className={`flex-shrink-0 text-xs font-mono tabular-nums rounded-lg px-2.5 py-1 border ${
              details.time
                ? 'text-[var(--editorial-text-secondary)] bg-[var(--editorial-bg)] border-[var(--editorial-border)]'
                : 'text-transparent bg-transparent border-transparent'
            }`}>
              {details.time ? formatTime(details.time) : '\u00A0\u00A0:\u00A0\u00A0'}
            </span>

            {/* Icon */}
            <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-[var(--editorial-bg)] flex items-center justify-center">
              {details.icon}
            </span>

            {/* Title */}
            <span className="text-sm font-medium text-[var(--editorial-text-primary)] truncate flex-1 min-w-0">
              {details.label} &middot; {hotelName}
            </span>

            {/* Breakfast included badge - PrimeReact Tag */}
            {activityType === 'breakfast' && item.parsedNotes?.breakfastIncluded && (
              <Tag
                value="included"
                severity="success"
                rounded
                className="!text-[11px] !px-2 !py-0.5"
              />
            )}

            {/* Chevron */}
            <ChevronRight className="w-4 h-4 text-[var(--editorial-text-tertiary)] flex-shrink-0" />
          </div>
        </div>
      </div>
    </Reorder.Item>
  );
}
