'use client';

/**
 * Sidebar Destination Palette - Drag destinations to add to trip
 * Extracted from page.tsx following itskovacs/trip architecture (MIT)
 * https://github.com/itskovacs/trip
 */
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { MapPin, Sparkles, Loader2, Plus, GripVertical } from 'lucide-react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { createClient } from '@/lib/supabase/client';
import type { Destination } from '@/types/destination';

// ---------------------------------------------------------------------------
// DropZoneBetweenItems
// ---------------------------------------------------------------------------
export function DropZoneBetweenItems({
  dayNumber,
  insertIndex,
  insertTime,
}: {
  dayNumber: number;
  insertIndex: number;
  insertTime?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop-zone-${dayNumber}-${insertIndex}`,
    data: { dayNumber, insertIndex, insertTime, type: 'insertion-point' },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        trip-drop-zone trip-transition-fast
        ${isOver
          ? 'is-over h-12 rounded-lg my-1 flex items-center justify-center'
          : 'h-1 hover:h-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full mx-8'
        }
      `}
    >
      {isOver && (
        <span className="text-xs font-medium text-[var(--editorial-accent)] trip-fade-scale-in">Drop here to insert</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SidebarDestinationPalette
// ---------------------------------------------------------------------------
interface SidebarPaletteProps {
  city: string;
  selectedDayNumber: number;
  onAddPlace: (destination: Destination, dayNumber: number) => void;
}

export default function SidebarDestinationPalette({ city, selectedDayNumber, onAddPlace }: SidebarPaletteProps) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!city) return;
    const fetchDestinations = async () => {
      setIsLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('destinations')
        .select('id, slug, name, city, category, image_thumbnail, image, rating')
        .eq('city', city)
        .order('rating', { ascending: false })
        .limit(12);
      setDestinations((data as Destination[]) || []);
      setIsLoading(false);
    };
    fetchDestinations();
  }, [city]);

  if (!city) return null;

  return (
    <div className="bg-[var(--editorial-bg-elevated)] rounded-xl border border-[var(--editorial-border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--editorial-border)]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-semibold text-[var(--editorial-text-primary)]">Our Curated List in {city}</h3>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">Drag to add to your trip</p>
      </div>
      <div className="p-2 max-h-64 overflow-y-auto space-y-1">
        {isLoading ? (
          <div className="py-6 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
            <p className="text-xs text-gray-400 mt-2">Loading places...</p>
          </div>
        ) : destinations.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400">No places found for {city}</div>
        ) : (
          destinations.map((destination) => (
            <DraggablePaletteCard key={destination.id} destination={destination} />
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DraggablePaletteCard
// ---------------------------------------------------------------------------
export function DraggablePaletteCard({ destination }: { destination: Destination }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${destination.id}`,
    data: { destination, source: 'palette' },
  });

  const style = transform ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 } : undefined;
  const hasImage = destination.image_thumbnail || destination.image;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`flex items-center gap-2.5 p-2 rounded-lg bg-[var(--editorial-bg-elevated)] hover:bg-[var(--editorial-border-subtle)] cursor-grab active:cursor-grabbing transition-all duration-150 ${isDragging ? 'shadow-xl ring-2 ring-gray-900/20 dark:ring-white/20 z-50' : ''}`}>
      <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0" />
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
        {hasImage ? (
          <Image src={destination.image_thumbnail || destination.image || ''} alt={destination.name} width={40} height={40} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><MapPin className="w-4 h-4 text-gray-400" /></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--editorial-text-primary)] truncate">{destination.name}</p>
        <p className="text-xs text-gray-500 truncate capitalize">{destination.category}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DragPreviewCard
// ---------------------------------------------------------------------------
export function DragPreviewCard({ destination, isOverTarget }: { destination: Destination; isOverTarget: boolean }) {
  const hasImage = destination.image_thumbnail || destination.image;

  return (
    <div className={`pointer-events-none transition-all duration-200 ease-out ${isOverTarget ? 'scale-105 rotate-1' : 'scale-100 rotate-0'}`}>
      <div
        className={`glass-panel flex items-center gap-3 p-3 rounded-xl shadow-2xl border-2 transition-all duration-200 ${isOverTarget ? 'border-[var(--editorial-accent)] ring-4 ring-[var(--editorial-accent)]/20' : 'border-[var(--editorial-border)]'}`}
        style={{ width: isOverTarget ? 240 : 180 }}
      >
        <div className={`rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0 transition-all duration-200 ${isOverTarget ? 'w-12 h-12' : 'w-10 h-10'}`}>
          {hasImage ? (
            <Image src={destination.image_thumbnail || destination.image || ''} alt={destination.name} width={48} height={48} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><MapPin className="w-4 h-4 text-gray-400" /></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[var(--editorial-text-primary)] truncate">{destination.name}</p>
          <p className="text-xs text-gray-500 truncate capitalize">{destination.category}</p>
          {isOverTarget && <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Drop to add to day</p>}
        </div>
        {isOverTarget && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <Plus className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}
