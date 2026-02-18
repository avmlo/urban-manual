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
import type { PlannerLodging } from "../../types";
import { toast } from "@/lib/toast";

interface LodgingFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (lodging: Omit<PlannerLodging, "id">) => void;
  initial?: PlannerLodging | null;
}

export function LodgingFormModal({
  open,
  onClose,
  onSave,
  initial,
}: LodgingFormModalProps) {
  const [form, setForm] = useState<Omit<PlannerLodging, "id">>({
    name: "",
    address: "",
    checkInDate: "",
    checkOutDate: "",
    rooms: 1,
    confirmationNumber: "",
    bookingUrl: "",
    notes: "",
    cost: 0,
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name ?? "",
        address: initial?.address ?? "",
        checkInDate: initial?.checkInDate ?? "",
        checkOutDate: initial?.checkOutDate ?? "",
        rooms: initial?.rooms ?? 1,
        confirmationNumber: initial?.confirmationNumber ?? "",
        bookingUrl: initial?.bookingUrl ?? "",
        notes: initial?.notes ?? "",
        cost: initial?.cost ?? 0,
      });
    }
  }, [open, initial]);

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("Property name is required");
      return;
    }
    onSave(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Lodging" : "Add Lodging"}</DialogTitle>
          <DialogDescription>
            Enter the details for your accommodation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Property Name *
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Hotel Le Marais"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Address
            </label>
            <Input
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="123 Rue de Rivoli, Paris"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Check-in
              </label>
              <Input
                type="date"
                value={form.checkInDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, checkInDate: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Check-out
              </label>
              <Input
                type="date"
                value={form.checkOutDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, checkOutDate: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rooms
              </label>
              <Input
                type="number"
                min={1}
                value={form.rooms}
                onChange={(e) =>
                  setForm((f) => ({ ...f, rooms: parseInt(e.target.value) || 1 }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Total Cost
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
              Confirmation #
            </label>
            <Input
              value={form.confirmationNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, confirmationNumber: e.target.value }))
              }
              placeholder="Booking confirmation number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Booking URL
            </label>
            <Input
              value={form.bookingUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, bookingUrl: e.target.value }))
              }
              placeholder="https://..."
            />
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
            {initial ? "Save Changes" : "Add Lodging"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
