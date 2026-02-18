"use client";

import { Clock, MapPin, GripVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/src/ui/badge";
import { Button } from "@/src/ui/button";
import { cn } from "@/lib/utils";
import type { PlannerActivity } from "../../types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ActivityCardProps {
  activity: PlannerActivity;
  onEdit: () => void;
  onDelete: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  dining: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  sightseeing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  transport: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  shopping: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  entertainment: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  other: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export function ActivityCard({ activity, onEdit, onDelete }: ActivityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 transition-all",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-1 p-0.5 rounded cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Time indicator */}
      {activity.time && (
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1 shrink-0 w-14">
          <Clock className="w-3 h-3" />
          <span>{activity.time}</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
            {activity.title}
          </span>
          <Badge
            className={cn(
              "text-[10px] px-1.5 py-0 border-0 capitalize",
              CATEGORY_COLORS[activity.category] || CATEGORY_COLORS.other
            )}
          >
            {activity.category}
          </Badge>
        </div>
        {activity.location && (
          <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{activity.location}</span>
          </div>
        )}
        {activity.description && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
            {activity.description}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onEdit}
          className="h-8 w-8"
          aria-label="Edit activity"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          aria-label="Delete activity"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
