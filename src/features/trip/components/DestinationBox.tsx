'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  X, MapPin, Star, Globe, Clock, DollarSign,
  Plane, Train, Building2, Navigation, ExternalLink,
  ImageOff, Coffee, MapPinned
} from 'lucide-react';
import Link from 'next/link';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import type { ItineraryItemNotes } from '@/types/trip';

interface DestinationBoxProps {
  item: EnrichedItineraryItem;
  onClose?: () => void;
  onTimeChange?: (itemId: string, time: string) => void;
  onNotesChange?: (itemId: string, notes: string) => void;
  onItemUpdate?: (itemId: string, updates: Partial<ItineraryItemNotes>) => void;
  onRemove?: (itemId: string) => void;
  className?: string;
}

const DURATION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
];

const PRIORITY_OPTIONS = [
  { value: 'must-do', label: 'Must do', color: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
  { value: 'want-to', label: 'Want to', color: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
  { value: 'if-time', label: 'If time', color: 'bg-stone-50 text-stone-500 border-stone-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' },
];

const BOOKING_OPTIONS = [
  { value: 'need-to-book', label: 'Need to book' },
  { value: 'booked', label: 'Booked' },
  { value: 'waitlist', label: 'Waitlist' },
  { value: 'walk-in', label: 'Walk-in' },
];

const TAG_OPTIONS = ['Romantic', 'Kid-friendly', 'Outdoor', 'Foodie', 'Photo spot', 'Local favorite'];

/** Reusable section header */
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-gray-500 mb-2.5 mt-1">
      {children}
    </p>
  );
}

/** Reusable bordered input field with floating label */
function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative border border-stone-200 dark:border-gray-700 rounded-lg overflow-hidden ${className}`}>
      <label className="absolute top-1.5 left-3 text-[10px] text-stone-400 dark:text-gray-500 uppercase tracking-wide pointer-events-none">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputBase = "w-full pt-5 pb-2 px-3 text-sm bg-transparent text-stone-900 dark:text-white outline-none";

export default function DestinationBox({
  item,
  onClose,
  onTimeChange,
  onItemUpdate,
  onRemove,
  className = '',
}: DestinationBoxProps) {
  // Edit state
  const [editTime, setEditTime] = useState(item.time || '');
  const [editNotes, setEditNotes] = useState(item.parsedNotes?.notes || '');
  const [editConfirmation, setEditConfirmation] = useState(
    item.parsedNotes?.confirmationNumber || item.parsedNotes?.hotelConfirmation || ''
  );
  const [editDepartureTime, setEditDepartureTime] = useState(item.parsedNotes?.departureTime || '');
  const [editArrivalTime, setEditArrivalTime] = useState(item.parsedNotes?.arrivalTime || '');
  const [editCheckInTime, setEditCheckInTime] = useState(item.parsedNotes?.checkInTime || '');
  const [editCheckOutTime, setEditCheckOutTime] = useState(item.parsedNotes?.checkOutTime || '');
  const [editDuration, setEditDuration] = useState(item.parsedNotes?.duration || 60);
  const [editPriority, setEditPriority] = useState(item.parsedNotes?.priority || '');
  const [editBookingStatus, setEditBookingStatus] = useState(item.parsedNotes?.bookingStatus || '');
  const [editTags, setEditTags] = useState<string[]>(item.parsedNotes?.tags || []);
  const [imageError, setImageError] = useState(false);

  // Flight-specific fields
  const [editTerminal, setEditTerminal] = useState(item.parsedNotes?.terminal || '');
  const [editGate, setEditGate] = useState(item.parsedNotes?.gate || '');
  const [editSeat, setEditSeat] = useState(item.parsedNotes?.seatNumber || '');

  const destination = item.destination;
  const parsedNotes = item.parsedNotes;
  const itemType = parsedNotes?.type || 'place';

  const name = item.title || destination?.name || 'Place';
  const image = destination?.image || destination?.image_thumbnail || parsedNotes?.image;
  const category = destination?.category || parsedNotes?.category;
  const description = destination?.micro_description || destination?.description;
  const address = destination?.formatted_address || parsedNotes?.address;
  const website = destination?.website || parsedNotes?.website;
  const rating = destination?.rating;
  const priceLevel = destination?.price_level;
  const lat = destination?.latitude || parsedNotes?.latitude;
  const lng = destination?.longitude || parsedNotes?.longitude;

  const isPlace = itemType !== 'flight' && itemType !== 'train' && itemType !== 'hotel';
  const isHotel = itemType === 'hotel';
  const isFlight = itemType === 'flight';

  // Get type icon and label
  const getTypeInfo = () => {
    switch (itemType) {
      case 'flight': return { icon: Plane, label: 'FLIGHT' };
      case 'train': return { icon: Train, label: 'TRAIN' };
      case 'hotel': return { icon: Building2, label: 'HOTEL' };
      default: return { icon: MapPin, label: category?.replace(/_/g, ' ').toUpperCase() || 'PLACE' };
    }
  };

  const typeInfo = getTypeInfo();
  const TypeIcon = typeInfo.icon;

  // Reset when item changes
  useEffect(() => {
    setEditTime(item.time || '');
    setEditNotes(item.parsedNotes?.notes || '');
    setEditConfirmation(item.parsedNotes?.confirmationNumber || item.parsedNotes?.hotelConfirmation || '');
    setEditDepartureTime(item.parsedNotes?.departureTime || '');
    setEditArrivalTime(item.parsedNotes?.arrivalTime || '');
    setEditCheckInTime(item.parsedNotes?.checkInTime || '');
    setEditCheckOutTime(item.parsedNotes?.checkOutTime || '');
    setEditDuration(item.parsedNotes?.duration || 60);
    setEditPriority(item.parsedNotes?.priority || '');
    setEditBookingStatus(item.parsedNotes?.bookingStatus || '');
    setEditTags(item.parsedNotes?.tags || []);
    setEditTerminal(item.parsedNotes?.terminal || '');
    setEditGate(item.parsedNotes?.gate || '');
    setEditSeat(item.parsedNotes?.seatNumber || '');
    setImageError(false);
  }, [item.id]);

  // Save changes
  const saveChanges = (field: string, value: unknown) => {
    if (!onItemUpdate) return;
    const updates: Partial<ItineraryItemNotes> = {};

    switch (field) {
      case 'time':
        if (onTimeChange && value !== item.time) onTimeChange(item.id, value as string);
        return;
      case 'notes':
        if (value !== (item.parsedNotes?.notes || '')) updates.notes = value as string;
        break;
      case 'duration':
        if (value !== (item.parsedNotes?.duration || 60)) updates.duration = value as number;
        break;
      case 'priority':
        updates.priority = (value as string) as 'must-do' | 'want-to' | 'if-time' | undefined;
        break;
      case 'bookingStatus':
        updates.bookingStatus = (value as string) as 'need-to-book' | 'booked' | 'waitlist' | 'walk-in' | undefined;
        break;
      case 'tags':
        updates.tags = value as string[];
        break;
      case 'checkInTime':
        if (value !== (item.parsedNotes?.checkInTime || '')) updates.checkInTime = value as string;
        break;
      case 'checkOutTime':
        if (value !== (item.parsedNotes?.checkOutTime || '')) updates.checkOutTime = value as string;
        break;
      case 'departureTime':
        if (value !== (item.parsedNotes?.departureTime || '')) updates.departureTime = value as string;
        break;
      case 'arrivalTime':
        if (value !== (item.parsedNotes?.arrivalTime || '')) updates.arrivalTime = value as string;
        break;
      case 'confirmation':
        if (itemType === 'hotel') {
          updates.confirmationNumber = value as string;
          updates.hotelConfirmation = value as string;
        } else {
          updates.confirmationNumber = value as string;
        }
        break;
      case 'terminal':
        updates.terminal = value as string;
        break;
      case 'gate':
        updates.gate = value as string;
        break;
      case 'seatNumber':
        updates.seatNumber = value as string;
        break;
    }

    if (Object.keys(updates).length > 0) {
      onItemUpdate(item.id, updates);
    }
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove(item.id);
      onClose?.();
    }
  };

  const toggleTag = (tag: string) => {
    const newTags = editTags.includes(tag)
      ? editTags.filter(t => t !== tag)
      : [...editTags, tag];
    setEditTags(newTags);
    saveChanges('tags', newTags);
  };

  return (
    <div className={`${className}`}>
      {/* Header: type label + name + close */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-gray-500 mb-1">
            <TypeIcon className="w-3.5 h-3.5" />
            <span>{typeInfo.label}</span>
          </div>
          <h3 className="font-semibold text-stone-900 dark:text-white text-lg leading-tight">
            {name}
          </h3>
          {isFlight && parsedNotes?.airline && (
            <p className="text-sm text-stone-500 dark:text-gray-400 mt-0.5">
              {parsedNotes.airline} {parsedNotes.flightNumber || ''}
            </p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-stone-400" />
          </button>
        )}
      </div>

      {/* ============ FLIGHT ============ */}
      {isFlight && (
        <div className="space-y-5">
          {/* Route display */}
          <div className="bg-stone-50 dark:bg-gray-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-400 uppercase tracking-wide mb-0.5">Departure</p>
                <p className="text-2xl font-bold text-stone-900 dark:text-white font-mono">
                  {parsedNotes?.from?.split(/[-–—]/)[0]?.trim().toUpperCase().slice(0, 3) || '---'}
                </p>
              </div>
              <div className="flex items-center gap-1 px-2">
                <div className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                <div className="w-6 h-px bg-stone-300" />
                <Plane className="w-3.5 h-3.5 text-stone-400" />
                <div className="w-6 h-px bg-stone-300" />
                <div className="w-1.5 h-1.5 rounded-full bg-stone-300" />
              </div>
              <div className="text-right">
                <p className="text-xs text-stone-400 uppercase tracking-wide mb-0.5">Arrival</p>
                <p className="text-2xl font-bold text-stone-900 dark:text-white font-mono">
                  {parsedNotes?.to?.split(/[-–—]/)[0]?.trim().toUpperCase().slice(0, 3) || '---'}
                </p>
              </div>
            </div>
          </div>

          <SectionHeader>Flight Details</SectionHeader>

          {/* Departure / Arrival times */}
          <div className="flex gap-2">
            <Field label="Departure" className="flex-1">
              <input type="time" value={editDepartureTime}
                onChange={(e) => setEditDepartureTime(e.target.value)}
                onBlur={() => saveChanges('departureTime', editDepartureTime)}
                className={inputBase} />
            </Field>
            <Field label="Arrival" className="flex-1">
              <input type="time" value={editArrivalTime}
                onChange={(e) => setEditArrivalTime(e.target.value)}
                onBlur={() => saveChanges('arrivalTime', editArrivalTime)}
                className={inputBase} />
            </Field>
          </div>

          {/* Terminal / Gate / Seat */}
          <div className="flex gap-2">
            <Field label="Terminal" className="flex-1">
              <input type="text" value={editTerminal} placeholder="A"
                onChange={(e) => setEditTerminal(e.target.value.toUpperCase())}
                onBlur={() => saveChanges('terminal', editTerminal)}
                className={`${inputBase} font-mono text-center`} />
            </Field>
            <Field label="Gate" className="flex-1">
              <input type="text" value={editGate} placeholder="B22"
                onChange={(e) => setEditGate(e.target.value.toUpperCase())}
                onBlur={() => saveChanges('gate', editGate)}
                className={`${inputBase} font-mono text-center`} />
            </Field>
            <Field label="Seat" className="flex-1">
              <input type="text" value={editSeat} placeholder="12A"
                onChange={(e) => setEditSeat(e.target.value.toUpperCase())}
                onBlur={() => saveChanges('seatNumber', editSeat)}
                className={`${inputBase} font-mono text-center`} />
            </Field>
          </div>

          {/* Confirmation */}
          <Field label="Confirmation #">
            <input type="text" value={editConfirmation} placeholder="Booking reference"
              onChange={(e) => setEditConfirmation(e.target.value.toUpperCase())}
              onBlur={() => saveChanges('confirmation', editConfirmation)}
              className={`${inputBase} font-mono`} />
          </Field>
        </div>
      )}

      {/* ============ HOTEL ============ */}
      {isHotel && (
        <div className="space-y-5">
          {/* Image */}
          {image && !imageError && (
            <div className="relative h-36 w-full rounded-xl overflow-hidden">
              <Image src={image} alt={name} fill className="object-cover" onError={() => setImageError(true)}
                unoptimized={image.includes('googleusercontent.com')} />
            </div>
          )}

          <SectionHeader>Your Stay</SectionHeader>

          <div className="flex gap-2">
            <Field label="Check-in" className="flex-1">
              <input type="time" value={editCheckInTime}
                onChange={(e) => setEditCheckInTime(e.target.value)}
                onBlur={() => saveChanges('checkInTime', editCheckInTime)}
                className={inputBase} />
            </Field>
            <Field label="Check-out" className="flex-1">
              <input type="time" value={editCheckOutTime}
                onChange={(e) => setEditCheckOutTime(e.target.value)}
                onBlur={() => saveChanges('checkOutTime', editCheckOutTime)}
                className={inputBase} />
            </Field>
          </div>

          <Field label="Confirmation #">
            <input type="text" value={editConfirmation} placeholder="Booking reference"
              onChange={(e) => setEditConfirmation(e.target.value.toUpperCase())}
              onBlur={() => saveChanges('confirmation', editConfirmation)}
              className={`${inputBase} font-mono`} />
          </Field>

          {parsedNotes?.breakfastIncluded && (
            <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-gray-400 py-1">
              <Coffee className="w-4 h-4" />
              <span>Breakfast included</span>
              {parsedNotes.breakfastTime && <span className="text-stone-400">({parsedNotes.breakfastTime})</span>}
            </div>
          )}

          {address && (
            <div className="flex items-start gap-2 text-sm text-stone-500 dark:text-gray-400">
              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{address}</span>
            </div>
          )}
        </div>
      )}

      {/* ============ PLACE ============ */}
      {isPlace && (
        <div className="space-y-5">
          {/* Image */}
          {image && !imageError && (
            <div className="relative h-36 w-full rounded-xl overflow-hidden">
              <Image src={image} alt={name} fill className="object-cover" onError={() => setImageError(true)}
                unoptimized={image.includes('googleusercontent.com') || image.includes('maps.googleapis.com')} />
              {rating && (
                <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-xs font-medium text-white">{rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {description && (
            <p className="text-sm text-stone-600 dark:text-gray-400 leading-relaxed">{description}</p>
          )}

          {/* Place info: address, coordinates, category */}
          <SectionHeader>Place Info</SectionHeader>

          {address && (
            <Field label="Address">
              <p className={`${inputBase} text-stone-600 dark:text-gray-400`}>{address}</p>
            </Field>
          )}

          {lat && lng && (
            <div className="flex gap-2">
              <Field label="Latitude" className="flex-1">
                <p className={`${inputBase} font-mono text-xs text-stone-500`}>{Number(lat).toFixed(5)}</p>
              </Field>
              <Field label="Longitude" className="flex-1">
                <p className={`${inputBase} font-mono text-xs text-stone-500`}>{Number(lng).toFixed(5)}</p>
              </Field>
            </div>
          )}

          {(category || priceLevel) && (
            <div className="flex gap-2">
              {category && (
                <Field label="Category" className="flex-1">
                  <p className={`${inputBase} capitalize`}>{category.replace(/_/g, ' ')}</p>
                </Field>
              )}
              {priceLevel && priceLevel > 0 && (
                <Field label="Price Level" className="flex-1">
                  <p className={inputBase}>{'$'.repeat(priceLevel)}</p>
                </Field>
              )}
            </div>
          )}

          {/* Details section */}
          <SectionHeader>Details</SectionHeader>

          {/* Priority badges */}
          <div className="flex flex-wrap gap-2">
            {PRIORITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  const newValue = editPriority === opt.value ? '' : opt.value;
                  setEditPriority(newValue);
                  saveChanges('priority', newValue);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${
                  editPriority === opt.value
                    ? opt.color
                    : 'bg-white dark:bg-gray-900 text-stone-400 border-stone-200 dark:border-gray-700 hover:border-stone-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Time and Duration */}
          <div className="flex gap-2">
            <Field label="Time" className="flex-1">
              <input type="time" value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                onBlur={() => saveChanges('time', editTime)}
                className={inputBase} />
            </Field>
            <Field label="Duration" className="flex-1">
              <select value={editDuration}
                onChange={(e) => { const val = Number(e.target.value); setEditDuration(val); saveChanges('duration', val); }}
                className={`${inputBase} cursor-pointer`}>
                {DURATION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Booking */}
          <div className="flex gap-2">
            <Field label="Booking" className="flex-1">
              <select value={editBookingStatus}
                onChange={(e) => { setEditBookingStatus(e.target.value); saveChanges('bookingStatus', e.target.value); }}
                className={`${inputBase} cursor-pointer`}>
                <option value="">Not set</option>
                {BOOKING_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Tags */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-gray-500 mb-2 block">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {TAG_OPTIONS.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                    editTags.includes(tag)
                      ? 'bg-stone-900 dark:bg-white text-white dark:text-gray-900 border-stone-900 dark:border-white'
                      : 'bg-white dark:bg-gray-900 text-stone-500 border-stone-200 dark:border-gray-700 hover:border-stone-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============ NOTES (all types) ============ */}
      <div className="mt-5">
        <Field label="Notes">
          <textarea value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            onBlur={() => saveChanges('notes', editNotes)}
            placeholder="Add a note..."
            rows={3}
            className={`${inputBase} resize-none`} />
        </Field>
      </div>

      {/* ============ ACTIONS ============ */}
      <div className="mt-5 space-y-1">
        {(website || (lat && lng)) && (
          <div className="flex gap-2 mb-2">
            {website && (
              <a href={website} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-stone-500 hover:text-stone-800 dark:hover:text-white border border-stone-200 dark:border-gray-700 rounded-lg transition-colors">
                <Globe className="w-3.5 h-3.5" />
                Website
              </a>
            )}
            {lat && lng && (
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-stone-500 hover:text-stone-800 dark:hover:text-white border border-stone-200 dark:border-gray-700 rounded-lg transition-colors">
                <Navigation className="w-3.5 h-3.5" />
                Directions
              </a>
            )}
          </div>
        )}

        {destination?.slug && (
          <Link href={`/destinations/${destination.slug}`}
            className="flex items-center justify-center gap-1.5 w-full py-2 text-xs text-stone-500 hover:text-stone-800 dark:hover:text-white transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
            View on Urban Manual
          </Link>
        )}

        {onRemove && (
          <button onClick={handleRemove}
            className="w-full py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
            Remove from itinerary
          </button>
        )}
      </div>
    </div>
  );
}
