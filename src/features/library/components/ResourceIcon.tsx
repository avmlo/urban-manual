"use client";

import {
  Ticket,
  UtensilsCrossed,
  Bed,
  User,
  BookOpen,
  List,
} from "lucide-react";
import type { ResourceType } from "../lib/types";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<ResourceType, React.ComponentType<{ className?: string }>> = {
  activity: Ticket,
  restaurant: UtensilsCrossed,
  hotel: Bed,
  partner: User,
  guide: BookOpen,
  list: List,
};

interface ResourceIconProps {
  type: ResourceType;
  hasUnreadUpdate?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function ResourceIcon({
  type,
  hasUnreadUpdate = false,
  size = "md",
  className,
}: ResourceIconProps) {
  const Icon = ICON_MAP[type] ?? Ticket;

  return (
    <div className={cn("relative flex-shrink-0", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-[#C75B2A]",
          size === "md" ? "w-10 h-10" : "w-8 h-8"
        )}
      >
        <Icon
          className={cn(
            "text-white",
            size === "md" ? "w-5 h-5" : "w-4 h-4"
          )}
        />
      </div>
      {hasUnreadUpdate && (
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#C75B2A] border-2 border-white" />
      )}
    </div>
  );
}
