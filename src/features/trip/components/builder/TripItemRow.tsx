'use client';

import { useState, useCallback, memo, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  MapPin,
  Navigation,
  Sun,
  X,
  GripVertical,
  MessageSquare,
  Check,
  MoveVertical,
  ArrowRight,
} from 'lucide-react';
import { TripItemRowProps } from './types';
import { formatDuration, getCrowdColor, getDayNumbers, openDestination } from './utils';
import { capitalizeCategory } from '@/lib/utils';

/**
 * TripItemRow - A single trip item with full interaction support
 *
 * Features:
 * - Drag and drop reordering via drag handle
 * - Inline time editing
 * - Notes management
 * - Move to different day
 * - Travel time display between items
 * - Crowd level indicator
 * - Outdoor activity marker
 */
const TripItemRow = memo(function TripItemRow({
  item,
  index,
  currentDay,
  totalDays,
  showTravelTime,
  isDragging,
  onRemove,
  onTimeChange,
  onNotesChange,
  onMoveToDay,
  onOpen,
  onDragStart,
  onDragOver,
  onDragEnd,
}: TripItemRowProps) {
  // Local state
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(item.notes || '');
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  // Refs
  const timeInputRef = useRef<HTMLInputElement>(null);
  const notesInputRef = useRef<HTMLInputElement>(null);
  const moveMenuRef = useRef<HTMLDivElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTime && timeInputRef.current) {
      timeInputRef.current.focus();
    }
  }, [isEditingTime]);

  useEffect(() => {
    if (isEditingNotes && notesInputRef.current) {
      notesInputRef.current.focus();
    }
  }, [isEditingNotes]);

  // Close move menu on click outside
  useEffect(() => {
    if (!showMoveMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (moveMenuRef.current && !moveMenuRef.current.contains(e.target as Node)) {
        setShowMoveMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoveMenu]);

  // Handlers
  const handleTimeSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (timeInputRef.current) {
        onTimeChange(timeInputRef.current.value);
      }
      setIsEditingTime(false);
    },
    [onTimeChange]
  );

  const handleNotesSubmit = useCallback(() => {
    onNotesChange(notesValue);
    setIsEditingNotes(false);
  }, [notesValue, onNotesChange]);

  const handleNotesCancel = useCallback(() => {
    setNotesValue(item.notes || '');
    setIsEditingNotes(false);
  }, [item.notes]);

  const handleMoveToDay = useCallback(
    (dayNum: number) => {
      onMoveToDay(dayNum);
      setShowMoveMenu(false);
    },
    [onMoveToDay]
  );

  const handleOpenDestination = useCallback(() => {
    onOpen();
    openDestination(item.destination.slug);
  }, [onOpen, item.destination.slug]);

  // Computed values
  const otherDays = getDayNumbers(totalDays, currentDay);
  const hasImage = item.destination.image || item.destination.image_thumbnail;

  return (
    <>
      {/* Travel time connector */}
      {showTravelTime && item.travelTimeFromPrev && item.travelTimeFromPrev > 5 && (
        <div
          className="flex items-center gap-2 py-1.5 px-3 text-xs text-gray-400"
          aria-label={`${formatDuration(item.travelTimeFromPrev)} travel time`}
        >
          <Navigation className="w-3 h-3" aria-hidden="true" />
          <span>{formatDuration(item.travelTimeFromPrev)} travel</span>
        </div>
      )}

      {/* Main item card */}
      <article
        draggable
        onDragStart={onDragStart}
        onDragOver={(e) => {
          e.preventDefault();
          onDragOver();
        }}
        onDragEnd={onDragEnd}
        className={`
          group relative flex items-start gap-2.5 p-3 rounded-xl
          bg-gray-50 dark:bg-white/5
          hover:bg-gray-100 dark:hover:bg-white/10
          transition-all duration-200 ease-out
          ${isDragging ? 'scale-[1.03] shadow-xl ring-2 ring-gray-900/10 dark:ring-white/20 bg-white dark:bg-gray-800 z-50' : ''}
        `}
        role="listitem"
        aria-label={`${item.destination.name} at ${item.timeSlot || 'unscheduled'}`}
      >
        {/* Drag handle */}
        <div
          className="flex-shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity pt-2"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>

        {/* Time column */}
        <div className="flex-shrink-0 w-14 text-center">
          {isEditingTime ? (
            <form onSubmit={handleTimeSubmit} className="relative">
              <input
                ref={timeInputRef}
                type="time"
                defaultValue={item.timeSlot || ''}
                onBlur={() => setIsEditingTime(false)}
                className="w-full text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white"
              />
            </form>
          ) : (
            <button
              onClick={() => setIsEditingTime(true)}
              className="text-xs font-medium text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label={`Time: ${item.timeSlot || 'Set time'}`}
            >
              {item.timeSlot || '--:--'}
            </button>
          )}
          <div className="text-xs text-gray-400 mt-0.5">
            {formatDuration(item.duration)}
          </div>
        </div>

        {/* Thumbnail */}
        <button
          onClick={handleOpenDestination}
          className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
          aria-label={`View ${item.destination.name}`}
        >
          {hasImage ? (
            <Image
              src={item.destination.image_thumbnail || item.destination.image || ''}
              alt={item.destination.name}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-4 h-4 text-gray-400" aria-hidden="true" />
            </div>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 py-0.5">
          <button
            onClick={handleOpenDestination}
            className="text-sm font-medium text-gray-900 dark:text-white truncate block text-left hover:underline focus:outline-none"
          >
            {item.destination.name}
          </button>

          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {capitalizeCategory(item.destination.category)}
          </p>

          {/* Status indicators */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {item.crowdLabel && (
              <span
                className={`text-xs font-medium ${getCrowdColor(item.crowdLevel)}`}
              >
                {item.crowdLabel}
              </span>
            )}
            {item.isOutdoor && (
              <span className="text-xs text-blue-500 flex items-center gap-0.5">
                <Sun className="w-3 h-3" aria-hidden="true" />
                Outdoor
              </span>
            )}
            {item.notes && !isEditingNotes && (
              <button
                onClick={() => setIsEditingNotes(true)}
                className="text-xs text-gray-400 flex items-center gap-0.5 hover:text-gray-600 transition-colors"
              >
                <MessageSquare className="w-3 h-3" aria-hidden="true" />
                <span className="truncate max-w-[80px]">{item.notes}</span>
              </button>
            )}
          </div>

          {/* Notes editor */}
          {isEditingNotes && (
            <div className="mt-2 flex gap-1.5">
              <input
                ref={notesInputRef}
                type="text"
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="Add a note..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNotesSubmit();
                  if (e.key === 'Escape') handleNotesCancel();
                }}
                className="flex-1 text-xs px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white transition-shadow"
              />
              <button
                onClick={handleNotesSubmit}
                className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                aria-label="Save note"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleNotesCancel}
                className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="relative flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsEditingNotes(true)}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
            title="Add note"
            aria-label="Add note"
          >
            <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {totalDays > 1 && (
            <button
              onClick={() => setShowMoveMenu(!showMoveMenu)}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
              title="Move to another day"
              aria-label="Move to another day"
              aria-expanded={showMoveMenu}
            >
              <MoveVertical className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}

          <button
            onClick={onRemove}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group/remove"
            title="Remove from trip"
            aria-label="Remove from trip"
          >
            <X className="w-3.5 h-3.5 text-gray-400 group-hover/remove:text-red-500 transition-colors" />
          </button>

          {/* Move to day dropdown */}
          {showMoveMenu && (
            <div
              ref={moveMenuRef}
              className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
              role="menu"
            >
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Move to
              </p>
              {otherDays.map((dayNum) => (
                <button
                  key={dayNum}
                  onClick={() => handleMoveToDay(dayNum)}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-white/10 flex items-center gap-2 transition-colors"
                  role="menuitem"
                >
                  <ArrowRight className="w-3 h-3 text-gray-400" aria-hidden="true" />
                  Day {dayNum}
                </button>
              ))}
            </div>
          )}
        </div>
      </article>
    </>
  );
});

export default TripItemRow;
