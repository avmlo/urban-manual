"use client";

import {
  CalendarDays,
  Users,
  Car,
  Building2,
  DollarSign,
} from "lucide-react";
import { Card } from "@/src/ui/card";
import { Badge } from "@/src/ui/badge";
import { cn } from "@/lib/utils";
import { useTripPlanner } from "../context";
import type { SectionId } from "../types";

const SECTION_ICONS: Record<SectionId, React.ReactNode> = {
  itinerary: <CalendarDays className="w-6 h-6" />,
  travelers: <Users className="w-6 h-6" />,
  transportation: <Car className="w-6 h-6" />,
  lodging: <Building2 className="w-6 h-6" />,
  pricing: <DollarSign className="w-6 h-6" />,
};

const SECTION_LABELS: Record<SectionId, string> = {
  itinerary: "Itinerary",
  travelers: "Travelers",
  transportation: "Transportation",
  lodging: "Lodging",
  pricing: "Pricing",
};

interface ModuleNavCardsProps {
  onNavigate: (section: SectionId) => void;
}

export function ModuleNavCards({ onNavigate }: ModuleNavCardsProps) {
  const { state, dispatch } = useTripPlanner();

  const counts: Record<SectionId, number> = {
    itinerary: state.activities.length,
    travelers: state.travelers.length,
    transportation: state.transportation.length,
    lodging: state.lodging.length,
    pricing: state.expenses.length,
  };

  const getStatus = (count: number): "empty" | "partial" | "complete" => {
    if (count === 0) return "empty";
    if (count >= 3) return "complete";
    return "partial";
  };

  const statusColors: Record<string, string> = {
    empty: "bg-gray-200 dark:bg-gray-700",
    partial: "bg-amber-400",
    complete: "bg-green-500",
  };

  const sections: SectionId[] = ["itinerary", "travelers", "transportation", "lodging", "pricing"];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {sections.map((id) => {
        const count = counts[id];
        const status = getStatus(count);
        const isActive = state.ui.activeSection === id;

        return (
          <Card
            key={id}
            onClick={() => {
              dispatch({ type: "SET_ACTIVE_SECTION", payload: id });
              onNavigate(id);
            }}
            className={cn(
              "p-4 transition-all hover:shadow-md",
              isActive && "ring-2 ring-gray-900 dark:ring-white"
            )}
          >
            <div className="flex flex-col items-center text-center gap-2">
              <div className="text-gray-700 dark:text-gray-300">
                {SECTION_ICONS[id]}
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {SECTION_LABELS[id]}
              </span>
              <div className="flex items-center gap-1.5">
                <div className={cn("w-2 h-2 rounded-full", statusColors[status])} />
                <Badge variant="secondary" className="text-xs">
                  {count}
                </Badge>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
