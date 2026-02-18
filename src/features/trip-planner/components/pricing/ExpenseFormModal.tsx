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
import type { PlannerExpense, ExpenseCategory } from "../../types";
import { EXPENSE_CATEGORIES, CURRENCIES } from "../../types";
import { useTripPlanner } from "../../context";
import { toast } from "@/lib/toast";

interface ExpenseFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (expense: Omit<PlannerExpense, "id">) => void;
  initial?: PlannerExpense | null;
}

export function ExpenseFormModal({
  open,
  onClose,
  onSave,
  initial,
}: ExpenseFormModalProps) {
  const { state } = useTripPlanner();

  const [form, setForm] = useState<Omit<PlannerExpense, "id">>({
    category: "other",
    description: "",
    amount: 0,
    currency: "USD",
    date: "",
    paidBy: "Shared",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        category: initial?.category ?? "other",
        description: initial?.description ?? "",
        amount: initial?.amount ?? 0,
        currency: initial?.currency ?? state.trip.currency ?? "USD",
        date: initial?.date ?? "",
        paidBy: initial?.paidBy ?? "Shared",
        notes: initial?.notes ?? "",
      });
    }
  }, [open, initial, state.trip.currency]);

  const paidByOptions = [
    "Shared",
    ...state.travelers.map((t) => `${t.firstName} ${t.lastName}`),
  ];

  const handleSubmit = () => {
    if (!form.description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (form.amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    onSave(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Expense" : "Add Expense"}</DialogTitle>
          <DialogDescription>
            Track an expense for this trip.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }))
              }
              className="flex h-11 w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-black dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:ring-offset-2 transition-colors"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description *
            </label>
            <Input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="e.g., Dinner at Le Comptoir"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount *
              </label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.amount || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))
                }
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Currency
              </label>
              <select
                value={form.currency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currency: e.target.value }))
                }
                className="flex h-11 w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-black dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:ring-offset-2 transition-colors"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Paid By
              </label>
              <select
                value={form.paidBy}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paidBy: e.target.value }))
                }
                className="flex h-11 w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-black dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:ring-offset-2 transition-colors"
              >
                {paidByOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
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
            {initial ? "Save Changes" : "Add Expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
