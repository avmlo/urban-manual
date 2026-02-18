"use client";

import { useState, useCallback } from "react";
import {
  Plane,
  TrainFront,
  Car,
  Ship,
  Anchor,
  ArrowRight,
  Calendar,
  Clock,
  Pencil,
  Trash2,
  Hash,
} from "lucide-react";
import { Badge } from "@/src/ui/badge";
import { Button } from "@/src/ui/button";
import { Card } from "@/src/ui/card";
import { cn } from "@/lib/utils";
import { useTripPlanner } from "../../context";
import type { PlannerTransport, TransportType } from "../../types";
import { TRANSPORT_TYPES } from "../../types";
import { SectionContainer } from "../SectionContainer";
import { TransportFormModal } from "./TransportFormModal";
import { toast } from "@/lib/toast";

const TYPE_ICONS: Record<TransportType, React.ReactNode> = {
  flight: <Plane className="w-5 h-5" />,
  train: <TrainFront className="w-5 h-5" />,
  "car-rental": <Car className="w-5 h-5" />,
  "car-transfer": <Car className="w-5 h-5" />,
  cruise: <Ship className="w-5 h-5" />,
  ferry: <Anchor className="w-5 h-5" />,
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TransportationSection() {
  const { state, dispatch } = useTripPlanner();
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<TransportType>("flight");
  const [editingTransport, setEditingTransport] = useState<PlannerTransport | null>(null);

  const handleAdd = useCallback(
    (data: Omit<PlannerTransport, "id">) => {
      dispatch({
        type: "ADD_TRANSPORT",
        payload: { ...data, id: crypto.randomUUID() },
      });
    },
    [dispatch]
  );

  const handleEdit = useCallback(
    (data: Omit<PlannerTransport, "id">) => {
      if (!editingTransport) return;
      dispatch({
        type: "UPDATE_TRANSPORT",
        payload: { id: editingTransport.id, updates: data },
      });
      setEditingTransport(null);
    },
    [dispatch, editingTransport]
  );

  const handleDelete = useCallback(
    (transport: PlannerTransport) => {
      dispatch({ type: "DELETE_TRANSPORT", payload: transport.id });
      toast.info("Transportation removed", {
        action: {
          label: "Undo",
          onClick: () => dispatch({ type: "RESTORE_TRANSPORT", payload: transport }),
        },
      });
    },
    [dispatch]
  );

  return (
    <SectionContainer
      id="transportation"
      title="Transportation"
      subtitle="Flights, trains, cars, and more"
    >
      {/* Type buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TRANSPORT_TYPES.map((t) => (
          <Button
            key={t.value}
            variant="outline"
            size="sm"
            onClick={() => {
              setAddType(t.value);
              setShowAddModal(true);
            }}
          >
            {TYPE_ICONS[t.value]}
            {t.label}
          </Button>
        ))}
      </div>

      {/* Transport List */}
      {state.transportation.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <Car className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No transportation added yet
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {state.transportation.map((transport) => {
            const typeLabel =
              TRANSPORT_TYPES.find((t) => t.value === transport.type)?.label ?? transport.type;
            return (
              <Card key={transport.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 shrink-0">
                    {TYPE_ICONS[transport.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {typeLabel}
                      </Badge>
                      {transport.confirmationNumber && (
                        <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                          <Hash className="w-3 h-3" />
                          {transport.confirmationNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                      <span className="truncate">{transport.departureLocation}</span>
                      <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="truncate">{transport.arrivalLocation}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {transport.departureDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(transport.departureDate)}
                        </span>
                      )}
                      {transport.departureTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {transport.departureTime}
                        </span>
                      )}
                      {transport.cost > 0 && (
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          ${transport.cost.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditingTransport(transport)}
                      className="h-8 w-8"
                      aria-label="Edit transportation"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(transport)}
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      aria-label="Delete transportation"
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

      <TransportFormModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAdd}
        defaultType={addType}
      />
      <TransportFormModal
        open={!!editingTransport}
        onClose={() => setEditingTransport(null)}
        onSave={handleEdit}
        initial={editingTransport}
      />
    </SectionContainer>
  );
}
