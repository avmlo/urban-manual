'use client';

/**
 * ItemRow - Renders a single itinerary item in TRIP-style row format
 * Layout: time pill | status dot | image/icon | title | cost | status badge | chevron
 *
 * Uses PrimeReact Tag for status badges (matching itskovacs/trip PrimeNG element architecture)
 * Design adapted from itskovacs/trip (MIT)
 * https://github.com/itskovacs/trip
 */
import { useState } from 'react';
import Image from 'next/image';
import {
  MapPin, GripVertical, Plane, Hotel, Coffee, DoorOpen, LogOut,
  UtensilsCrossed, Clock, BedDouble, Waves, Sparkles, Dumbbell,
  Shirt, Package, Briefcase, Camera, ShoppingBag, Phone, Sun,
  Train as TrainIcon, ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Tag } from 'primereact/tag';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import { formatTime } from '@/features/trip/lib/utils';
import ItemDetails from './ItemDetails';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface ItemRowProps {
  item: EnrichedItineraryItem;
  isExpanded: boolean;
  isEditMode?: boolean;
  onToggle: () => void;
  onRemove?: () => void;
  onUpdateItem: (id: string, updates: Record<string, unknown>) => void;
  onUpdateTime: (id: string, time: string) => void;
  onDragEnd: () => void;
  onSelect?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getStatusSeverity(bookingStatus?: string): 'success' | 'info' | 'warn' | 'secondary' | null {
  if (!bookingStatus || bookingStatus === 'walk-in') return null;
  if (bookingStatus === 'booked') return 'success';
  if (bookingStatus === 'need-to-book') return 'info';
  if (bookingStatus === 'waitlist') return 'warn';
  return 'secondary';
}

function getStatusLabel(bookingStatus: string): string {
  if (bookingStatus === 'booked') return 'booked';
  if (bookingStatus === 'need-to-book') return 'pending';
  if (bookingStatus === 'waitlist') return 'waitlist';
  return bookingStatus;
}

function getStatusDotColor(bookingStatus?: string): string | null {
  if (!bookingStatus) return null;
  if (bookingStatus === 'booked') return 'bg-green-500';
  if (bookingStatus === 'need-to-book' || bookingStatus === 'waitlist') return 'bg-blue-500';
  return null;
}

function getItemIcon(iconType: string, activityType?: string) {
  const cls = "w-3.5 h-3.5 text-[var(--editorial-text-tertiary)]";
  switch (iconType) {
    case 'flight': return <Plane className={cls} />;
    case 'hotel': return <Hotel className={cls} />;
    case 'checkin': return <DoorOpen className={cls} />;
    case 'checkout': return <LogOut className={cls} />;
    case 'breakfast': return <UtensilsCrossed className={cls} />;
    case 'train': return <TrainIcon className={cls} />;
    case 'activity': {
      switch (activityType) {
        case 'nap': return <BedDouble className={cls} />;
        case 'pool': return <Waves className={cls} />;
        case 'spa': return <Sparkles className={cls} />;
        case 'gym': return <Dumbbell className={cls} />;
        case 'breakfast-at-hotel': return <Coffee className={cls} />;
        case 'getting-ready': return <Shirt className={cls} />;
        case 'packing': case 'checkout-prep': return <Package className={cls} />;
        case 'sunset': return <Sun className={cls} />;
        case 'work': return <Briefcase className={cls} />;
        case 'call': return <Phone className={cls} />;
        case 'shopping-time': return <ShoppingBag className={cls} />;
        case 'photo-walk': return <Camera className={cls} />;
        default: return <Clock className={cls} />;
      }
    }
    default: return <MapPin className={cls} />;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ItemRow({
  item,
  isExpanded,
  isEditMode,
  onToggle,
  onRemove,
  onUpdateItem,
  onUpdateTime,
  onDragEnd,
  onSelect,
}: ItemRowProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState(false);
  const itemType = item.parsedNotes?.type || 'place';

  // ------- display data -------
  const getItemDisplay = () => {
    if (itemType === 'flight') {
      const from = item.parsedNotes?.from || '?';
      const to = item.parsedNotes?.to || '?';
      const depTime = item.parsedNotes?.departureTime;
      return {
        iconType: 'flight' as const,
        title: `${from} \u2192 ${to}`,
        displayTime: depTime || item.time,
        activityType: undefined,
      };
    }

    if (itemType === 'hotel') {
      const hotelItemType = item.parsedNotes?.hotelItemType;
      if (hotelItemType === 'check_in') return { iconType: 'checkin' as const, title: `Check in \u00B7 ${item.title || 'Hotel'}`, displayTime: item.parsedNotes?.checkInTime || item.time, activityType: undefined };
      if (hotelItemType === 'checkout') return { iconType: 'checkout' as const, title: `Check out \u00B7 ${item.title || 'Hotel'}`, displayTime: item.parsedNotes?.checkOutTime || item.time, activityType: undefined };
      if (hotelItemType === 'breakfast') return { iconType: 'breakfast' as const, title: `Breakfast \u00B7 ${item.title || 'Hotel'}`, displayTime: item.parsedNotes?.breakfastTime?.split('-')[0] || item.time, activityType: undefined };
      return { iconType: 'hotel' as const, title: item.title || 'Hotel', displayTime: item.parsedNotes?.checkInTime || item.time, activityType: undefined };
    }

    if (itemType === 'train') {
      const from = item.parsedNotes?.from || '?';
      const to = item.parsedNotes?.to || '?';
      const depTime = item.parsedNotes?.departureTime;
      return { iconType: 'train' as const, title: `${from} \u2192 ${to}`, displayTime: depTime || item.time, activityType: undefined };
    }

    if (itemType === 'activity') {
      const activityType = item.parsedNotes?.activityType || 'free-time';
      return { iconType: 'activity' as const, title: item.title || 'Activity', displayTime: item.time, activityType };
    }

    // Regular place
    return {
      iconType: 'place' as const,
      title: item.title || item.destination?.name || 'Place',
      displayTime: item.time,
      activityType: undefined,
    };
  };

  const { iconType, title, displayTime, activityType } = getItemDisplay();
  const image = item.destination?.image_thumbnail || item.destination?.image || item.parsedNotes?.image;
  const hasImage = image && !imageError;
  const isPlace = iconType === 'place';
  const bookingStatus = item.parsedNotes?.bookingStatus;
  const statusDotColor = getStatusDotColor(bookingStatus);
  const statusSeverity = getStatusSeverity(bookingStatus);
  // ------- Click handler -------
  const handleClick = () => {
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop && onSelect) onSelect();
    else onToggle();
  };

  return (
    <Reorder.Item
      value={item}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => { setIsDragging(false); onDragEnd(); }}
      className={`${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'z-10' : ''}`}
      dragListener={isEditMode}
    >
      <div
        onClick={handleClick}
        className={`relative overflow-hidden rounded-xl cursor-pointer transition-all bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] ${
          isDragging ? 'shadow-xl ring-2 ring-blue-400 dark:ring-blue-500' : 'hover:shadow-sm'
        }`}
      >
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            {/* Drag handle (edit mode) */}
            {isEditMode && (
              <div className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing">
                <GripVertical className="w-4 h-4 text-gray-400 opacity-60" />
              </div>
            )}

            {/* Time pill - 24h format */}
            <span className={`flex-shrink-0 text-xs font-mono tabular-nums rounded-lg px-2.5 py-1 border ${
              displayTime
                ? 'text-[var(--editorial-text-secondary)] bg-[var(--editorial-bg)] border-[var(--editorial-border)]'
                : 'text-transparent bg-transparent border-transparent'
            }`}>
              {displayTime ? formatTime(displayTime) : '\u00A0\u00A0:\u00A0\u00A0'}
            </span>

            {/* Status dot */}
            {statusDotColor && (
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDotColor}`} />
            )}

            {/* Image thumbnail (for places with images) */}
            {isPlace && hasImage && (
              <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0">
                <Image src={image!} alt="" width={28} height={28} className="w-7 h-7 object-cover" onError={() => setImageError(true)} />
              </div>
            )}

            {/* Icon (for non-place items or places without images) */}
            {(!isPlace || !hasImage) && (
              <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-[var(--editorial-bg)] flex items-center justify-center">
                {getItemIcon(iconType, activityType)}
              </span>
            )}

            {/* Title */}
            <span className="text-sm font-medium text-[var(--editorial-text-primary)] truncate flex-1 min-w-0">
              {title}
            </span>

            {/* Status badge - PrimeReact Tag */}
            {statusSeverity && bookingStatus && (
              <Tag
                value={getStatusLabel(bookingStatus)}
                severity={statusSeverity}
                rounded
                className="!text-[11px] !px-2 !py-0.5"
              />
            )}

            {/* Priority badge - PrimeReact Tag (if no booking status) */}
            {item.parsedNotes?.priority === 'if-time' && !bookingStatus && (
              <Tag
                value="optional"
                severity="secondary"
                rounded
                className="!text-[11px] !px-2 !py-0.5"
              />
            )}

            {/* Chevron */}
            {(isPlace || iconType === 'flight' || iconType === 'hotel') && (
              <ChevronRight className="w-4 h-4 text-[var(--editorial-text-tertiary)] flex-shrink-0" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded details (mobile) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden lg:hidden"
          >
            <ItemDetails
              item={item}
              itemType={itemType}
              onUpdateItem={onUpdateItem}
              onUpdateTime={onUpdateTime}
              onRemove={onRemove}
              onClose={onToggle}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}
