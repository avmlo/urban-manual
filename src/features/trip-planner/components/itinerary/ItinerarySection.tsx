"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/src/ui/button";
import { Badge } from "@/src/ui/badge";
import { cn } from "@/lib/utils";
import { useTripPlanner } from "../../context";
import { getTripDayCount, getDayDate, formatDayLabel } from "../../constants";
import type { PlannerActivity } from "../../types";
import { SectionContainer } from "../SectionContainer";
import { ActivityCard } from "./ActivityCard";
import { ActivityFormModal } from "./ActivityFormModal";
import { toast } from "@/lib/toast";

export function ItinerarySection() {
  const { state, dispatch } = useTripPlanner();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<PlannerActivity | null>(null);

  const dayCount = getTripDayCount(state.trip.startDate, state.trip.endDate);
  const activeDayIndex = state.ui.activeDayIndex;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const dayActivities = useMemo(
    () =>
      state.activities
        .filter((a) => a.dayIndex === activeDayIndex)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [state.activities, activeDayIndex]
  );

  const getActivityCountForDay = useCallback(
    (dayIdx: number) => state.activities.filter((a) => a.dayIndex === dayIdx).length,
    [state.activities]
  );

  const handleAddActivity = useCallback(
    (data: Omit<PlannerActivity, "id" | "dayIndex" | "orderIndex">) => {
      const id = crypto.randomUUID();
      dispatch({
        type: "ADD_ACTIVITY",
        payload: {
          ...data,
          id,
          dayIndex: activeDayIndex,
          orderIndex: dayActivities.length,
        },
      });
    },
    [dispatch, activeDayIndex, dayActivities.length]
  );

  const handleEditActivity = useCallback(
    (data: Omit<PlannerActivity, "id" | "dayIndex" | "orderIndex">) => {
      if (!editingActivity) return;
      dispatch({
        type: "UPDATE_ACTIVITY",
        payload: { id: editingActivity.id, updates: data },
      });
      setEditingActivity(null);
    },
    [dispatch, editingActivity]
  );

  const handleDeleteActivity = useCallback(
    (activity: PlannerActivity) => {
      dispatch({ type: "DELETE_ACTIVITY", payload: activity.id });
      toast.info("Activity deleted", {
        action: {
          label: "Undo",
          onClick: () => dispatch({ type: "RESTORE_ACTIVITY", payload: activity }),
        },
      });
    },
    [dispatch]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const ids = dayActivities.map((a) => a.id);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;

      const newIds = [...ids];
      newIds.splice(oldIndex, 1);
      newIds.splice(newIndex, 0, active.id as string);

      dispatch({
        type: "REORDER_ACTIVITIES",
        payload: { dayIndex: activeDayIndex, orderedIds: newIds },
      });
    },
    [dayActivities, activeDayIndex, dispatch]
  );

  return (
    <SectionContainer
      id="itinerary"
      title="Itinerary"
      subtitle="Plan activities for each day of your trip"
      onAdd={() => setShowAddModal(true)}
      addLabel="Add Activity"
    >
      {/* Day Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 -mx-1 px-1 scrollbar-hide">
        {Array.from({ length: dayCount }, (_, i) => {
          const dateStr = getDayDate(state.trip.startDate, i);
          const label = formatDayLabel(dateStr);
          const count = getActivityCountForDay(i);
          const isActive = i === activeDayIndex;

          return (
            <button
              key={i}
              onClick={() => dispatch({ type: "SET_ACTIVE_DAY", payload: i })}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                isActive
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              {label}
              {count > 0 && (
                <Badge
                  variant={isActive ? "secondary" : "outline"}
                  className="ml-0.5 text-[10px] px-1.5 py-0"
                >
                  {count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Activity List */}
      {dayActivities.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <CalendarDays className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            No activities planned for this day
          </p>
          <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" />
            Add Activity
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={dayActivities.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {dayActivities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onEdit={() => setEditingActivity(activity)}
                  onDelete={() => handleDeleteActivity(activity)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add Modal */}
      <ActivityFormModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddActivity}
      />

      {/* Edit Modal */}
      <ActivityFormModal
        open={!!editingActivity}
        onClose={() => setEditingActivity(null)}
        onSave={handleEditActivity}
        initial={editingActivity}
      />
    </SectionContainer>
  );
}
