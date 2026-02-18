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
import { Button } from "@/src/ui/button";
import type { PlannerTraveler, TravelerRole } from "../../types";
import { TRAVELER_ROLES } from "../../types";
import { toast } from "@/lib/toast";

interface TravelerFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (traveler: Omit<PlannerTraveler, "id">) => void;
  initial?: PlannerTraveler | null;
}

export function TravelerFormModal({
  open,
  onClose,
  onSave,
  initial,
}: TravelerFormModalProps) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "traveler" as TravelerRole,
  });

  useEffect(() => {
    if (open) {
      setForm({
        firstName: initial?.firstName ?? "",
        lastName: initial?.lastName ?? "",
        email: initial?.email ?? "",
        role: initial?.role ?? "traveler",
      });
    }
  }, [open, initial]);

  const handleSubmit = () => {
    if (!form.firstName.trim()) {
      toast.error("First name is required");
      return;
    }
    if (!form.lastName.trim()) {
      toast.error("Last name is required");
      return;
    }
    onSave(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Traveler" : "Add Traveler"}</DialogTitle>
          <DialogDescription>
            {initial ? "Update traveler information." : "Add someone to your trip."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                First Name *
              </label>
              <Input
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                placeholder="John"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Name *
              </label>
              <Input
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role
            </label>
            <select
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({ ...f, role: e.target.value as TravelerRole }))
              }
              className="flex h-11 w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-black dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:ring-offset-2 transition-colors"
            >
              {TRAVELER_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {initial ? "Save Changes" : "Add Traveler"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
