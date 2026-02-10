'use client';

import { useState, useCallback } from 'react';
import {
  Map,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Cloud,
  AlertTriangle,
} from 'lucide-react';
import TimelineCanvas from './TimelineCanvas';
import PlannerMap from './PlannerMap';
import IntelligenceWarnings from './IntelligenceWarnings';
import type { DayPlan, TimeBlock, PlannerWarning, Place } from '@/lib/intelligence/types';

interface PlannerLayoutProps {
  /** All day plans for the trip */
  days: DayPlan[];
  /** Currently selected day (1-indexed) */
  selectedDay: number;
  /** Trip destination city */
  destination?: string;
  /** Weather forecast string */
  weatherForecast?: string;
  /** Callbacks */
  onDaySelect: (day: number) => void;
  onBlocksChange: (dayNumber: number, blocks: TimeBlock[]) => void;
  onBlockEdit?: (block: TimeBlock) => void;
  onBlockRemove?: (dayNumber: number, blockId: string) => void;
  onAddPlace?: (dayNumber: number) => void;
  onAddFlight?: (dayNumber: number) => void;
  onAIPlan?: () => void;
  /** Active intelligence warnings */
  warnings?: PlannerWarning[];
  onDismissWarning?: (warningId: string) => void;
  onApplyWarning?: (warning: PlannerWarning) => void;
  /** Loading states */
  isAIPlanning?: boolean;
  /** Bucket list items for map display */
  bucketListPlaces?: Place[];
}

export default function PlannerLayout({
  days,
  selectedDay,
  destination,
  weatherForecast,
  onDaySelect,
  onBlocksChange,
  onBlockEdit,
  onBlockRemove,
  onAddPlace,
  onAddFlight,
  onAIPlan,
  warnings = [],
  onDismissWarning,
  onApplyWarning,
  isAIPlanning,
  bucketListPlaces = [],
}: PlannerLayoutProps) {
  const [mobileView, setMobileView] = useState<'timeline' | 'map'>('timeline');
  const currentDay = days.find((d) => d.dayNumber === selectedDay) || days[0];

  // Get places for map from current day's blocks
  const mapPlaces = currentDay?.blocks
    .filter((b) => b.type !== 'transit' && b.place)
    .map((b, idx) => ({
      ...b.place!,
      order: idx + 1,
      blockId: b.id,
    })) || [];

  // Handle blocks change for current day
  const handleBlocksChange = useCallback(
    (blocks: TimeBlock[]) => {
      onBlocksChange(selectedDay, blocks);
    },
    [selectedDay, onBlocksChange]
  );

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-white dark:bg-gray-950">
      {/* Header with Day Tabs and View Toggle */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
        {/* Day Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDaySelect(Math.max(1, selectedDay - 1))}
            disabled={selectedDay === 1}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 text-gray-500 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-[200px] sm:max-w-none">
            {days.map((day) => (
              <button
                key={day.dayNumber}
                onClick={() => onDaySelect(day.dayNumber)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  selectedDay === day.dayNumber
                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Day {day.dayNumber}
              </button>
            ))}
          </div>

          <button
            onClick={() => onDaySelect(Math.min(days.length, selectedDay + 1))}
            disabled={selectedDay === days.length}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 text-gray-500 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile View Toggle */}
        <div className="md:hidden flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setMobileView('timeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              mobileView === 'timeline'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Timeline</span>
          </button>
          <button
            onClick={() => setMobileView('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              mobileView === 'map'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Map</span>
          </button>
        </div>

        {/* Weather Badge */}
        {weatherForecast && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs">
            <Cloud className="w-3.5 h-3.5" />
            <span className="capitalize">{weatherForecast}</span>
          </div>
        )}
      </div>

      {/* Intelligence Warnings */}
      {warnings.length > 0 && (
        <IntelligenceWarnings
          warnings={warnings}
          onDismiss={onDismissWarning}
          onApply={onApplyWarning}
        />
      )}

      {/* Split Screen Content - independent scroll regions */}
      <div className="flex-1 flex overflow-hidden">
        {/* Timeline Panel (35% on desktop) - independently scrollable */}
        <div
          className={`
            flex-shrink-0 border-r border-gray-200 dark:border-gray-800 overflow-y-auto overscroll-contain
            ${mobileView === 'timeline' ? 'w-full' : 'hidden'}
            md:block md:w-[35%]
          `}
        >
          {currentDay && (
            <TimelineCanvas
              dayPlan={currentDay}
              onBlocksChange={handleBlocksChange}
              onBlockEdit={onBlockEdit}
              onBlockRemove={(blockId) => onBlockRemove?.(selectedDay, blockId)}
              onAddPlace={() => onAddPlace?.(selectedDay)}
              onAddFlight={() => onAddFlight?.(selectedDay)}
              onAIPlan={onAIPlan}
              isAIPlanning={isAIPlanning}
              className="h-full"
            />
          )}
        </div>

        {/* Map Panel (65% on desktop) - persistent background layer */}
        <div
          className={`
            flex-1 overflow-hidden relative z-0
            ${mobileView === 'map' ? 'w-full' : 'hidden'}
            md:block md:w-[65%]
          `}
        >
          <PlannerMap
            places={mapPlaces}
            bucketListPlaces={bucketListPlaces}
            destination={destination}
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}
