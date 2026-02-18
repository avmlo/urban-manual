"use client";

import { useState, useCallback } from "react";
import { Users, Pencil, Trash2, Mail } from "lucide-react";
import { Avatar, AvatarFallback } from "@/src/ui/avatar";
import { Badge } from "@/src/ui/badge";
import { Button } from "@/src/ui/button";
import { Card } from "@/src/ui/card";
import { useTripPlanner } from "../../context";
import type { PlannerTraveler } from "../../types";
import { SectionContainer } from "../SectionContainer";
import { TravelerFormModal } from "./TravelerFormModal";
import { toast } from "@/lib/toast";

const ROLE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  "co-planner": "secondary",
  traveler: "outline",
  viewer: "outline",
};

function getInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function TravelersSection() {
  const { state, dispatch } = useTripPlanner();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTraveler, setEditingTraveler] = useState<PlannerTraveler | null>(null);

  const handleAdd = useCallback(
    (data: Omit<PlannerTraveler, "id">) => {
      dispatch({
        type: "ADD_TRAVELER",
        payload: { ...data, id: crypto.randomUUID() },
      });
    },
    [dispatch]
  );

  const handleEdit = useCallback(
    (data: Omit<PlannerTraveler, "id">) => {
      if (!editingTraveler) return;
      dispatch({
        type: "UPDATE_TRAVELER",
        payload: { id: editingTraveler.id, updates: data },
      });
      setEditingTraveler(null);
    },
    [dispatch, editingTraveler]
  );

  const handleDelete = useCallback(
    (traveler: PlannerTraveler) => {
      dispatch({ type: "DELETE_TRAVELER", payload: traveler.id });
      toast.info("Traveler removed", {
        action: {
          label: "Undo",
          onClick: () => dispatch({ type: "RESTORE_TRAVELER", payload: traveler }),
        },
      });
    },
    [dispatch]
  );

  return (
    <SectionContainer
      id="travelers"
      title="Travelers"
      subtitle="Manage who's coming on this trip"
      onAdd={() => setShowAddModal(true)}
      addLabel="Add Traveler"
    >
      {state.travelers.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <Users className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            No travelers added yet
          </p>
          <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
            Add your first traveler
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {state.travelers.map((traveler) => (
            <Card key={traveler.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback>
                    {getInitials(traveler.firstName, traveler.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {traveler.firstName} {traveler.lastName}
                    </span>
                    <Badge variant={ROLE_VARIANTS[traveler.role] ?? "outline"} className="text-[10px] capitalize">
                      {traveler.role}
                    </Badge>
                  </div>
                  {traveler.email && (
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{traveler.email}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setEditingTraveler(traveler)}
                    className="h-8 w-8"
                    aria-label="Edit traveler"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(traveler)}
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    aria-label="Delete traveler"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <TravelerFormModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAdd}
      />
      <TravelerFormModal
        open={!!editingTraveler}
        onClose={() => setEditingTraveler(null)}
        onSave={handleEdit}
        initial={editingTraveler}
      />
    </SectionContainer>
  );
}
