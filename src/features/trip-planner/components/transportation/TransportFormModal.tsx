"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/src/ui/dialog";
import { Input } from "@/src/ui/input";
import { Textarea } from "@/src/ui/textarea";
import { Button } from "@/src/ui/button";
import type { PlannerTransport, TransportType } from "../../types";
import { TRANSPORT_TYPES } from "../../types";
import { toast } from "@/lib/toast";

interface TransportFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (transport: Omit<PlannerTransport, "id">) => void;
  initial?: PlannerTransport | null;
  defaultType?: TransportType;
}

export function TransportFormModal({
  open,
  onClose,
  onSave,
  initial,
  defaultType,
}: TransportFormModalProps) {
  const [form, setForm] = useState<Omit<PlannerTransport, "id">>({
    type: "flight",
    departureLocation: "",
    arrivalLocation: "",
    departureDate: "",
    departureTime: "",
    arrivalDate: "",
    arrivalTime: "",
    confirmationNumber: "",
    notes: "",
    cost: 0,
  });

  useEffect(() => {
    if (open) {
      setForm({
        type: initial?.type ?? defaultType ?? "flight",
        departureLocation: initial?.departureLocation ?? "",
        arrivalLocation: initial?.arrivalLocation ?? "",
        departureDate: initial?.departureDate ?? "",
        departureTime: initial?.departureTime ?? "",
        arrivalDate: initial?.arrivalDate ?? "",
        arrivalTime: initial?.arrivalTime ?? "",
        confirmationNumber: initial?.confirmationNumber ?? "",
        notes: initial?.notes ?? "",
        cost: initial?.cost ?? 0,
      });
    }
  }, [open, initial, defaultType]);

  const handleSubmit = () => {
    if (!form.departureLocation.trim()) {
      toast.error("Departure location is required");
      return;
    }
    if (!form.arrivalLocation.trim()) {
      toast.error("Arrival location is required");
      return;
    }
    onSave(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Edit Transportation" : "Add Transportation"}
          </DialogTitle>
          <DialogDescription>
            Enter the details for your {form.type.replace("-", " ")}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type
            </label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({ ...f, type: e.target.value as TransportType }))
              }
              className="flex h-11 w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-black dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:ring-offset-2 transition-colors"
            >
              {TRANSPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From *
              </label>
              <Input
                value={form.departureLocation}
                onChange={(e) =>
                  setForm((f) => ({ ...f, departureLocation: e.target.value }))
                }
                placeholder="e.g., JFK Airport"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                To *
              </label>
              <Input
                value={form.arrivalLocation}
                onChange={(e) =>
                  setForm((f) => ({ ...f, arrivalLocation: e.target.value }))
                }
                placeholder="e.g., CDG Airport"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Departure Date
              </label>
              <Input
                type="date"
                value={form.departureDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, departureDate: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Departure Time
              </label>
              <Input
                type="time"
                value={form.departureTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, departureTime: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Arrival Date
              </label>
              <Input
                type="date"
                value={form.arrivalDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, arrivalDate: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Arrival Time
              </label>
              <Input
                type="time"
                value={form.arrivalTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, arrivalTime: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirmation #
              </label>
              <Input
                value={form.confirmationNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, confirmationNumber: e.target.value }))
                }
                placeholder="ABC123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cost
              </label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.cost || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cost: parseFloat(e.target.value) || 0 }))
                }
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {initial ? "Save Changes" : "Add Transportation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
