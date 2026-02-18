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
import { useTripPlanner } from "../context";

interface TripDetailsModalProps {
  open: boolean;
  onClose: () => void;
}

export function TripDetailsModal({ open, onClose }: TripDetailsModalProps) {
  const { state, dispatch } = useTripPlanner();
  const [form, setForm] = useState({
    title: "",
    location: "",
    startDate: "",
    endDate: "",
    description: "",
    coverImage: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        title: state.trip.title,
        location: state.trip.location,
        startDate: state.trip.startDate,
        endDate: state.trip.endDate,
        description: state.trip.description,
        coverImage: state.trip.coverImage,
      });
    }
  }, [open, state.trip]);

  const handleSave = () => {
    dispatch({ type: "UPDATE_TRIP", payload: form });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Trip Details</DialogTitle>
          <DialogDescription>Edit the core details for your trip.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Trip Name
            </label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="My Amazing Trip"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location
            </label>
            <Input
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="Paris, France"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Enter a description for this trip..."
              rows={3}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {form.description.length} characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cover Image URL
            </label>
            <Input
              value={form.coverImage}
              onChange={(e) => setForm((f) => ({ ...f, coverImage: e.target.value }))}
              placeholder="https://example.com/image.jpg"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
