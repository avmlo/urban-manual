'use client';

/**
 * ItemRow - Renders a single itinerary item as a card or row
 * Place items: bordered card with image, name, category, time
 * Flight items: premium ticket-style card
 * Other items: flat row with icon and time
 *
 * Extracted from page.tsx following itskovacs/trip architecture (MIT)
 * https://github.com/itskovacs/trip
 */
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  MapPin, GripVertical, Plane, Hotel, Coffee, DoorOpen, LogOut,
  UtensilsCrossed, Clock, BedDouble, Waves, Sparkles, Dumbbell,
  Shirt, Package, Briefcase, Camera, ShoppingBag, Phone, Sun,
  Train as TrainIcon, Car,
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
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
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const itemType = item.parsedNotes?.type || 'place';

  // ------- display data -------

  const getItemDisplay = () => {
    if (itemType === 'flight') {
      const from = item.parsedNotes?.from || '?';
      const to = item.parsedNotes?.to || '?';
      const depTime = item.parsedNotes?.departureTime;
      const arrTime = item.parsedNotes?.arrivalTime;
      const airline = [item.parsedNotes?.airline, item.parsedNotes?.flightNumber].filter(Boolean).join(' ');
      const terminal = item.parsedNotes?.terminal;
      const gate = item.parsedNotes?.gate;
      const seat = item.parsedNotes?.seatNumber;
      const confirmation = item.parsedNotes?.confirmationNumber;
      const timeDisplay = [depTime && `${formatTime(depTime)} dep`, arrTime && `${formatTime(arrTime)} arr`].filter(Boolean).join(' → ');
      const extraInfo = [terminal && `T${terminal}`, gate && `Gate ${gate}`, seat && `Seat ${seat}`].filter(Boolean).join(' · ');
      return { iconType: 'flight' as const, title: `${from} → ${to}`, inlineTimes: timeDisplay, subtitle: airline || undefined, extraInfo: extraInfo || undefined, confirmation };
    }

    if (itemType === 'hotel') {
      const hotelItemType = item.parsedNotes?.hotelItemType;
      const checkIn = item.parsedNotes?.checkInTime;
      const checkOut = item.parsedNotes?.checkOutTime;
      const breakfast = item.parsedNotes?.breakfastTime;
      const address = item.parsedNotes?.address || item.destination?.formatted_address;
      const confirmation = item.parsedNotes?.hotelConfirmation || item.parsedNotes?.confirmationNumber;
      const checkInDate = item.parsedNotes?.checkInDate;
      const checkOutDate = item.parsedNotes?.checkOutDate;
      let nights: number | null = null;
      if (checkInDate && checkOutDate) {
        const start = new Date(checkInDate + 'T00:00:00');
        const end = new Date(checkOutDate + 'T00:00:00');
        nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      }
      if (hotelItemType === 'check_in') return { iconType: 'checkin' as const, title: `Check in · ${item.title || 'Hotel'}`, inlineTimes: checkIn ? formatTime(checkIn) : undefined, subtitle: address ? address.split(',')[0] : undefined, confirmation };
      if (hotelItemType === 'checkout') return { iconType: 'checkout' as const, title: `Check out · ${item.title || 'Hotel'}`, inlineTimes: checkOut ? formatTime(checkOut) : undefined, subtitle: address ? address.split(',')[0] : undefined, confirmation };
      if (hotelItemType === 'breakfast') return { iconType: 'breakfast' as const, title: `Breakfast · ${item.title || 'Hotel'}`, inlineTimes: breakfast || undefined, subtitle: undefined };
      const times = [checkIn && `check-in ${formatTime(checkIn)}`, checkOut && `checkout ${formatTime(checkOut)}`, breakfast && `breakfast ${breakfast}`].filter(Boolean).join(' · ');
      return { iconType: 'hotel' as const, title: item.title || 'Hotel', inlineTimes: times || undefined, subtitle: address ? address.split(',')[0] : undefined, nights, confirmation };
    }

    if (itemType === 'train') {
      const from = item.parsedNotes?.from || '?';
      const to = item.parsedNotes?.to || '?';
      const depTime = item.parsedNotes?.departureTime;
      const arrTime = item.parsedNotes?.arrivalTime;
      const trainLine = item.parsedNotes?.trainLine;
      const trainNumber = item.parsedNotes?.trainNumber;
      const confirmation = item.parsedNotes?.confirmationNumber;
      const timeDisplay = [depTime && `${formatTime(depTime)} dep`, arrTime && `${formatTime(arrTime)} arr`].filter(Boolean).join(' → ');
      const trainInfo = [trainLine, trainNumber].filter(Boolean).join(' ');
      return { iconType: 'train' as const, title: `${from} → ${to}`, inlineTimes: timeDisplay, subtitle: trainInfo || undefined, confirmation };
    }

    if (itemType === 'activity') {
      const activityType = item.parsedNotes?.activityType || 'free-time';
      const duration = item.parsedNotes?.duration;
      const time = item.time ? formatTime(item.time) : '';
      const durationDisplay = duration ? `${Math.round(duration / 60)}h ${duration % 60}m` : '';
      const timeDisplay = [time, durationDisplay].filter(Boolean).join(' · ');
      return { iconType: 'activity' as const, activityType, title: item.title || 'Activity', inlineTimes: timeDisplay || undefined, subtitle: undefined };
    }

    // Regular place
    const time = item.time ? formatTime(item.time) : '';
    const duration = item.parsedNotes?.duration;
    const category = item.destination?.category || item.parsedNotes?.category || '';
    const neighborhood = item.destination?.neighborhood;
    const timeWithDuration = [time, duration && `${duration}h`].filter(Boolean).join(' · ');
    const locationInfo = [neighborhood, category].filter(Boolean).join(' · ');
    return { iconType: 'place' as const, title: item.title || item.destination?.name || 'Place', inlineTimes: timeWithDuration || undefined, subtitle: locationInfo || undefined, rating: item.destination?.rating };
  };

  const { iconType, title, inlineTimes, subtitle, ...extraData } = getItemDisplay();
  const image = item.destination?.image_thumbnail || item.destination?.image || item.parsedNotes?.image;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setShowActions(false);
    };
    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showActions]);

  const parseAirportCode = (value?: string) => {
    if (!value) return '---';
    const parts = value.split(/[-–—]/);
    return parts[0]?.trim().toUpperCase().slice(0, 3) || '---';
  };

  // ------- Click handler -------
  const handleClick = () => {
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop && onSelect) onSelect();
    else onToggle();
  };

  // ------- Status badges -------
  const statusBadge = (
    <div className="flex items-center gap-2 flex-shrink-0">
      {item.parsedNotes?.costEstimate && item.parsedNotes.costEstimate > 0 && (
        <span className="text-xs text-[var(--editorial-text-tertiary)] tabular-nums">
          {item.parsedNotes.costEstimate}{item.parsedNotes.currency ? ` ${item.parsedNotes.currency}` : ' €'}
        </span>
      )}
      {item.parsedNotes?.bookingStatus && item.parsedNotes.bookingStatus !== 'walk-in' && (
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
          item.parsedNotes.bookingStatus === 'booked' ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30'
          : item.parsedNotes.bookingStatus === 'need-to-book' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
          : item.parsedNotes.bookingStatus === 'waitlist' ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30'
          : 'text-gray-500 bg-gray-100 dark:bg-gray-800'
        }`}>
          {item.parsedNotes.bookingStatus === 'booked' ? 'booked' : item.parsedNotes.bookingStatus === 'need-to-book' ? 'pending' : item.parsedNotes.bookingStatus === 'waitlist' ? 'waitlist' : item.parsedNotes.bookingStatus}
        </span>
      )}
      {item.parsedNotes?.priority === 'if-time' && !item.parsedNotes?.bookingStatus && (
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800">optional</span>
      )}
    </div>
  );

  // ------- FLIGHT CARD -------
  if (itemType === 'flight') {
    const notes = item.parsedNotes;
    const originCode = parseAirportCode(notes?.from);
    const destCode = parseAirportCode(notes?.to);
    const airline = notes?.airline || '';
    const flightNum = notes?.flightNumber || '';
    const depTime = notes?.departureTime;
    const arrTime = notes?.arrivalTime;
    const terminal = notes?.terminal;
    const gate = notes?.gate;
    const seat = notes?.seatNumber;

    return (
      <Reorder.Item value={item} onDragStart={() => setIsDragging(true)} onDragEnd={() => { setIsDragging(false); onDragEnd(); }}
        className={`${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'z-10' : ''}`} dragListener={isEditMode}>
        <div onClick={handleClick}
          className={`relative rounded-2xl overflow-hidden transition-all cursor-pointer bg-stone-50 dark:bg-gray-800/60 ring-1 ring-stone-200/60 dark:ring-gray-700/50 hover:ring-stone-300 dark:hover:ring-gray-600 ${isDragging ? 'shadow-xl ring-2 ring-stone-400 dark:ring-gray-500' : ''}`}>
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="text-center"><p className="text-xl font-semibold tracking-tight text-stone-900 dark:text-white font-mono">{originCode}</p></div>
                <div className="flex items-center gap-1 px-1.5">
                  <div className="w-1 h-1 rounded-full bg-stone-300 dark:bg-gray-600" />
                  <div className="w-8 h-px bg-stone-300 dark:bg-gray-600 relative"><Plane className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 dark:text-gray-500" /></div>
                  <div className="w-1 h-1 rounded-full bg-stone-300 dark:bg-gray-600" />
                </div>
                <div className="text-center"><p className="text-xl font-semibold tracking-tight text-stone-900 dark:text-white font-mono">{destCode}</p></div>
              </div>
              <div className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300">Confirmed</div>
            </div>
            <div className="relative my-3">
              <div className="w-full border-t border-dashed border-stone-200 dark:border-gray-700" />
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-2 h-4 bg-[var(--editorial-bg-elevated)] rounded-r-full" />
              <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-2 h-4 bg-[var(--editorial-bg-elevated)] rounded-l-full" />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-[9px] uppercase tracking-wider text-stone-400 dark:text-gray-500">Depart</p><p className="text-base font-semibold text-stone-900 dark:text-white font-mono tabular-nums">{depTime ? formatTime(depTime) : '--:--'}</p></div>
              <div className="text-center"><p className="text-[9px] text-stone-400 dark:text-gray-500">Nonstop</p></div>
              <div className="text-right"><p className="text-[9px] uppercase tracking-wider text-stone-400 dark:text-gray-500">Arrive</p><p className="text-base font-semibold text-stone-900 dark:text-white font-mono tabular-nums">{arrTime ? formatTime(arrTime) : '--:--'}</p></div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-100 dark:border-gray-700/50">
              <div className="flex items-center gap-2"><p className="text-xs font-medium text-stone-600 dark:text-gray-400">{airline}</p>{flightNum && <p className="text-xs text-stone-400 dark:text-gray-500 font-mono">{flightNum}</p>}</div>
              <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-gray-500 font-mono">{terminal && <span>T{terminal}</span>}{gate && <span>Gate {gate}</span>}{seat && <span>{seat}</span>}</div>
            </div>
          </div>
          {isEditMode && <div className="absolute top-2 left-2 opacity-60"><GripVertical className="w-4 h-4 text-stone-400" /></div>}
        </div>
        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden lg:hidden">
              <ItemDetails item={item} itemType={itemType} onUpdateItem={onUpdateItem} onUpdateTime={onUpdateTime} onClose={onToggle} />
            </motion.div>
          )}
        </AnimatePresence>
      </Reorder.Item>
    );
  }

  // ------- PLACE CARD -------
  if (iconType === 'place') {
    const category = item.destination?.category || item.parsedNotes?.category || '';
    const formattedCategory = category.replace(/_/g, ' ');

    return (
      <Reorder.Item value={item} onDragStart={() => setIsDragging(true)} onDragEnd={() => { setIsDragging(false); onDragEnd(); }}
        className={`${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'z-10' : ''}`} dragListener={isEditMode}>
        <div onClick={handleClick}
          className={`relative overflow-hidden rounded-2xl cursor-pointer transition-all bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] ${isDragging ? 'shadow-xl ring-2 ring-stone-400 dark:ring-gray-500' : 'hover:shadow-md'}`}>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {isEditMode && <div className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing"><GripVertical className="w-4 h-4 text-gray-400 opacity-60" /></div>}
                {image && !imageError ? (
                  <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0"><Image src={image} alt="" width={36} height={36} className="w-9 h-9 object-cover" onError={() => setImageError(true)} /></div>
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0"><MapPin className="w-4 h-4 text-[var(--editorial-text-tertiary)]" /></div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-900 dark:text-white truncate">{title}</p>
                  {formattedCategory && <p className="text-xs text-[var(--editorial-text-tertiary)] truncate capitalize">{formattedCategory}</p>}
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                {item.time && <p className="text-sm font-semibold text-stone-900 dark:text-white tabular-nums">{formatTime(item.time)}</p>}
                {statusBadge}
              </div>
            </div>
          </div>
        </div>
        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden lg:hidden">
              <ItemDetails item={item} itemType={itemType} onUpdateItem={onUpdateItem} onUpdateTime={onUpdateTime} onRemove={onRemove} onClose={onToggle} />
            </motion.div>
          )}
        </AnimatePresence>
      </Reorder.Item>
    );
  }

  // ------- NON-PLACE ROW (hotel, train, activity) -------
  const getIcon = () => {
    if (iconType === 'hotel') return <Hotel className="w-3 h-3 text-[var(--editorial-text-tertiary)]" />;
    if (iconType === 'checkin') return <DoorOpen className="w-3 h-3 text-[var(--editorial-text-tertiary)]" />;
    if (iconType === 'checkout') return <LogOut className="w-3 h-3 text-[var(--editorial-text-tertiary)]" />;
    if (iconType === 'breakfast') return <UtensilsCrossed className="w-3 h-3 text-[var(--editorial-text-tertiary)]" />;
    if (iconType === 'train') return <TrainIcon className="w-3 h-3 text-[var(--editorial-text-tertiary)]" />;
    if (iconType === 'activity') {
      const aType = (extraData as any).activityType;
      const cls = "w-3 h-3 text-[var(--editorial-text-tertiary)]";
      switch (aType) {
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
    return <MapPin className="w-3 h-3 text-[var(--editorial-text-tertiary)]" />;
  };

  return (
    <Reorder.Item value={item} onDragStart={() => setIsDragging(true)} onDragEnd={() => { setIsDragging(false); onDragEnd(); }}
      className={`${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'z-10' : ''}`} dragListener={isEditMode}>
      <div onClick={handleClick}
        className={`relative transition-all cursor-pointer group ${isDragging ? 'shadow-lg bg-[var(--editorial-bg-elevated)] rounded-xl' : 'hover:bg-[var(--editorial-bg-elevated)]'} rounded-lg`}>
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-3">
            {isEditMode && <div className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing"><GripVertical className="w-4 h-4 text-gray-400 opacity-60" /></div>}
            <div className="w-14 flex-shrink-0">
              {item.time ? <span className="text-[15px] font-mono tabular-nums text-[var(--editorial-text-secondary)]">{formatTime(item.time)}</span> : <span className="text-xs text-gray-300 dark:text-gray-600 font-mono">&nbsp;</span>}
            </div>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--editorial-bg-elevated)] flex items-center justify-center">{getIcon()}</span>
              <p className="text-sm text-[var(--editorial-text-primary)] truncate">{title}</p>
            </div>
            {statusBadge}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden lg:hidden">
            <ItemDetails item={item} itemType={itemType} onUpdateItem={onUpdateItem} onUpdateTime={onUpdateTime} onRemove={onRemove} onClose={onToggle} />
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}
