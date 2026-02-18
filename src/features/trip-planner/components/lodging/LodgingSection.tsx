"use client";

import { useState, useCallback } from "react";
import {
  Building2,
  Calendar,
  MapPin,
  Hash,
  ExternalLink,
  Pencil,
  Trash2,
  DoorOpen,
} from "lucide-react";
import { Badge } from "@/src/ui/badge";
import { Button } from "@/src/ui/button";
import { Card } from "@/src/ui/card";
import { useTripPlanner } from "../../context";
import type { PlannerLodging } from "../../types";
import { SectionContainer } from "../SectionContainer";
import { LodgingFormModal } from "./LodgingFormModal";
import { toast } from "@/lib/toast";

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getNightCount(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const s = new Date(checkIn + "T00:00:00");
  const e = new Date(checkOut + "T00:00:00");
  return Math.max(0, Math.ceil((e.getTime() - s.getTime()) / 86400000));
}

export function LodgingSection() {
  const { state, dispatch } = useTripPlanner();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLodging, setEditingLodging] = useState<PlannerLodging | null>(null);

  const handleAdd = useCallback(
    (data: Omit<PlannerLodging, "id">) => {
      dispatch({
        type: "ADD_LODGING",
        payload: { ...data, id: crypto.randomUUID() },
      });
    },
    [dispatch]
  );

  const handleEdit = useCallback(
    (data: Omit<PlannerLodging, "id">) => {
      if (!editingLodging) return;
      dispatch({
        type: "UPDATE_LODGING",
        payload: { id: editingLodging.id, updates: data },
      });
      setEditingLodging(null);
    },
    [dispatch, editingLodging]
  );

  const handleDelete = useCallback(
    (lodging: PlannerLodging) => {
      dispatch({ type: "DELETE_LODGING", payload: lodging.id });
      toast.info("Lodging removed", {
        action: {
          label: "Undo",
          onClick: () => dispatch({ type: "RESTORE_LODGING", payload: lodging }),
        },
      });
    },
    [dispatch]
  );

  // Sort by check-in date
  const sorted = [...state.lodging].sort((a, b) =>
    a.checkInDate.localeCompare(b.checkInDate)
  );

  return (
    <SectionContainer
      id="lodging"
      title="Lodging"
      subtitle="Where you'll stay during the trip"
      onAdd={() => setShowAddModal(true)}
      addLabel="Add Lodging"
    >
      {sorted.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <Building2 className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            No lodging added yet
          </p>
          <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
            Add your first accommodation
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((lodging) => {
            const nights = getNightCount(lodging.checkInDate, lodging.checkOutDate);
            return (
              <Card key={lodging.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {lodging.name}
                      </span>
                      {nights > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          {nights} night{nights !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    {lodging.address && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{lodging.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {lodging.checkInDate && (
                        <span className="flex items-center gap-1">
                          <DoorOpen className="w-3 h-3" />
                          {formatDate(lodging.checkInDate)} - {formatDate(lodging.checkOutDate)}
                        </span>
                      )}
                      {lodging.confirmationNumber && (
                        <span className="flex items-center gap-0.5">
                          <Hash className="w-3 h-3" />
                          {lodging.confirmationNumber}
                        </span>
                      )}
                      {lodging.cost > 0 && (
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          ${lodging.cost.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {lodging.bookingUrl && (
                      <a
                        href={lodging.bookingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Open booking"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditingLodging(lodging)}
                      className="h-8 w-8"
                      aria-label="Edit lodging"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(lodging)}
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      aria-label="Delete lodging"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <LodgingFormModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAdd}
      />
      <LodgingFormModal
        open={!!editingLodging}
        onClose={() => setEditingLodging(null)}
        onSave={handleEdit}
        initial={editingLodging}
      />
    </SectionContainer>
  );
}
