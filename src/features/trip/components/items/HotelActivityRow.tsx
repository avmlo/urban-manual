'use client';

/**
 * HotelActivityRow - Card for hotel check-in, checkout, and breakfast activities
 * Extracted from page.tsx following itskovacs/trip architecture (MIT)
 * https://github.com/itskovacs/trip
 */
import { useState } from 'react';
import { GripVertical, DoorOpen, Coffee, LogOut, Check } from 'lucide-react';
import { Reorder } from 'framer-motion';
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

  const getActivityStyle = () => {
    switch (activityType) {
      case 'checkin':
        return {
          icon: <DoorOpen className="w-4 h-4" />,
          label: 'CHECK-IN',
          time: item.parsedNotes?.checkInTime ? formatTime(item.parsedNotes.checkInTime) : '',
        };
      case 'breakfast':
        return {
          icon: <Coffee className="w-4 h-4" />,
          label: 'BREAKFAST',
          time: item.parsedNotes?.breakfastTime || '7:00–10:00',
        };
      case 'checkout':
        return {
          icon: <LogOut className="w-4 h-4" />,
          label: 'CHECK-OUT',
          time: item.parsedNotes?.checkOutTime ? formatTime(item.parsedNotes.checkOutTime) : '',
        };
    }
  };

  const style = getActivityStyle();

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
        className={`
          relative overflow-hidden rounded-2xl cursor-pointer transition-all
          bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)]
          ${isDragging ? 'shadow-xl ring-2 ring-stone-400 dark:ring-gray-500' : 'hover:shadow-md'}
        `}
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--editorial-bg-elevated)] flex items-center justify-center">
                <span className="text-[var(--editorial-text-tertiary)]">{style.icon}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-900 dark:text-white">{hotelName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.parsedNotes?.roomType && activityType === 'checkin' && (
                    <span className="text-xs text-[var(--editorial-text-tertiary)]">{item.parsedNotes.roomType}</span>
                  )}
                  {activityType === 'breakfast' && item.parsedNotes?.breakfastIncluded && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <Check className="w-3 h-3" /> Included
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-stone-900 dark:text-white">{style.time}</p>
              <p className="text-xs text-[var(--editorial-text-tertiary)] uppercase tracking-wide">{style.label}</p>
            </div>
          </div>
        </div>
        {isEditMode && (
          <div className="absolute top-2 left-2 opacity-60">
            <GripVertical className="w-4 h-4 text-stone-400" />
          </div>
        )}
      </div>
    </Reorder.Item>
  );
}
