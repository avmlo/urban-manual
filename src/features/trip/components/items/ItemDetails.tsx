'use client';

/**
 * ItemDetails - Minimal inline edit form for mobile
 * Extracted from page.tsx following itskovacs/trip architecture (MIT)
 * https://github.com/itskovacs/trip
 */
import { useState } from 'react';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface ItemDetailsProps {
  item: EnrichedItineraryItem;
  itemType: string;
  onUpdateItem: (id: string, updates: Record<string, unknown>) => void;
  onUpdateTime: (id: string, time: string) => void;
  onRemove?: () => void;
  onClose: () => void;
}

export default function ItemDetails({
  item,
  itemType,
  onUpdateItem,
  onUpdateTime,
  onRemove,
  onClose,
}: ItemDetailsProps) {
  const [time, setTime] = useState(item.time || '');
  const [notes, setNotes] = useState(item.parsedNotes?.notes || '');
  const [confirmationNumber, setConfirmationNumber] = useState(
    item.parsedNotes?.confirmationNumber || item.parsedNotes?.hotelConfirmation || ''
  );
  const [departureTime, setDepartureTime] = useState(item.parsedNotes?.departureTime || '');
  const [arrivalTime, setArrivalTime] = useState(item.parsedNotes?.arrivalTime || '');
  const [checkInTime, setCheckInTime] = useState(item.parsedNotes?.checkInTime || '');
  const [checkOutTime, setCheckOutTime] = useState(item.parsedNotes?.checkOutTime || '');

  const handleSave = () => {
    const updates: Record<string, unknown> = {};

    if (itemType === 'hotel') {
      if (checkInTime !== (item.parsedNotes?.checkInTime || '')) updates.checkInTime = checkInTime;
      if (checkOutTime !== (item.parsedNotes?.checkOutTime || '')) updates.checkOutTime = checkOutTime;
      if (confirmationNumber !== (item.parsedNotes?.confirmationNumber || item.parsedNotes?.hotelConfirmation || '')) {
        updates.confirmationNumber = confirmationNumber;
        updates.hotelConfirmation = confirmationNumber;
      }
    } else if (itemType === 'flight' || itemType === 'train') {
      if (departureTime !== (item.parsedNotes?.departureTime || '')) updates.departureTime = departureTime;
      if (arrivalTime !== (item.parsedNotes?.arrivalTime || '')) updates.arrivalTime = arrivalTime;
      if (confirmationNumber !== (item.parsedNotes?.confirmationNumber || '')) updates.confirmationNumber = confirmationNumber;
    } else {
      if (time !== item.time) onUpdateTime(item.id, time);
    }

    if (notes !== (item.parsedNotes?.notes || '')) updates.notes = notes;

    if (Object.keys(updates).length > 0) {
      onUpdateItem(item.id, updates);
    }
    onClose();
  };

  return (
    <div className="px-3 pb-3 pt-2 space-y-3 border-t border-[var(--editorial-border)] mt-2">
      {itemType === 'hotel' && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Check-in</label>
            <input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border-0 rounded-lg" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Check-out</label>
            <input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border-0 rounded-lg" />
          </div>
        </div>
      )}

      {(itemType === 'flight' || itemType === 'train') && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Departs</label>
            <input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border-0 rounded-lg" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Arrives</label>
            <input type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border-0 rounded-lg" />
          </div>
        </div>
      )}

      {itemType !== 'hotel' && itemType !== 'flight' && itemType !== 'train' && (
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Time</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border-0 rounded-lg" />
        </div>
      )}

      {(itemType === 'hotel' || itemType === 'flight' || itemType === 'train') && (
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Confirmation #</label>
          <input type="text" value={confirmationNumber} onChange={(e) => setConfirmationNumber(e.target.value)}
            placeholder="Booking reference"
            className="w-full px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border-0 rounded-lg font-mono" />
        </div>
      )}

      <div>
        <label className="text-xs text-gray-400 mb-1 block">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a note..." rows={2}
          className="w-full px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border-0 rounded-lg resize-none" />
      </div>

      <div className="flex items-center justify-between pt-1">
        {onRemove ? (
          <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-600 font-medium">Remove</button>
        ) : <div />}
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">Cancel</button>
          <button onClick={handleSave} className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-md">Save</button>
        </div>
      </div>
    </div>
  );
}
