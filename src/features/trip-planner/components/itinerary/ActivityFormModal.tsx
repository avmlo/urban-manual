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
import type { PlannerActivity, ActivityCategory } from "../../types";
import { ACTIVITY_CATEGORIES } from "../../types";
import { toast } from "@/lib/toast";

interface ActivityFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (activity: Omit<PlannerActivity, "id" | "dayIndex" | "orderIndex">) => void;
  initial?: PlannerActivity | null;
}

export function ActivityFormModal({
  open,
  onClose,
  onSave,
  initial,
}: ActivityFormModalProps) {
  const [form, setForm] = useState({
    title: "",
    time: "",
    category: "other" as ActivityCategory,
    description: "",
    location: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        title: initial?.title ?? "",
        time: initial?.time ?? "",
        category: initial?.category ?? "other",
        description: initial?.description ?? "",
        location: initial?.location ?? "",
      });
    }
  }, [open, initial]);

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast.error("Activity title is required");
      return;
    }
    onSave(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Activity" : "Add Activity"}</DialogTitle>
          <DialogDescription>
            {initial ? "Update the details for this activity." : "Add a new activity to your day."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g., Visit the Eiffel Tower"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Time
              </label>
              <Input
                type="time"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value as ActivityCategory }))
                }
                className="flex h-11 w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-black dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:ring-offset-2 transition-colors"
              >
                {ACTIVITY_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location
            </label>
            <Input
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="e.g., Champ de Mars, Paris"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Notes about this activity..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {initial ? "Save Changes" : "Add Activity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
