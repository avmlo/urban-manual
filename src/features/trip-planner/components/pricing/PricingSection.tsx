"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DollarSign,
  Pencil,
  Trash2,
  TrendingUp,
  Plane,
  Building2,
  Sparkles,
  MoreHorizontal,
} from "lucide-react";
import { Badge } from "@/src/ui/badge";
import { Button } from "@/src/ui/button";
import { Card } from "@/src/ui/card";
import { Progress } from "@/src/ui/progress";
import { cn } from "@/lib/utils";
import { useTripPlanner } from "../../context";
import type { PlannerExpense, ExpenseCategory } from "../../types";
import { SectionContainer } from "../SectionContainer";
import { ExpenseFormModal } from "./ExpenseFormModal";
import { toast } from "@/lib/toast";

const CATEGORY_ICONS: Record<ExpenseCategory, React.ReactNode> = {
  transportation: <Plane className="w-4 h-4" />,
  lodging: <Building2 className="w-4 h-4" />,
  activities: <Sparkles className="w-4 h-4" />,
  other: <MoreHorizontal className="w-4 h-4" />,
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  transportation: "bg-blue-500",
  lodging: "bg-green-500",
  activities: "bg-amber-500",
  other: "bg-gray-500",
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PricingSection() {
  const { state, dispatch } = useTripPlanner();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<PlannerExpense | null>(null);

  // Calculate budget from all sources
  const budgetData = useMemo(() => {
    const transportTotal = state.transportation.reduce((sum, t) => sum + (t.cost || 0), 0);
    const lodgingTotal = state.lodging.reduce((sum, l) => sum + (l.cost || 0), 0);

    const expenseByCategory: Record<ExpenseCategory, number> = {
      transportation: 0,
      lodging: 0,
      activities: 0,
      other: 0,
    };
    state.expenses.forEach((e) => {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
    });

    const categories = {
      transportation: transportTotal + expenseByCategory.transportation,
      lodging: lodgingTotal + expenseByCategory.lodging,
      activities: expenseByCategory.activities,
      other: expenseByCategory.other,
    };

    const total = Object.values(categories).reduce((a, b) => a + b, 0);

    return { categories, total };
  }, [state.transportation, state.lodging, state.expenses]);

  const handleAdd = useCallback(
    (data: Omit<PlannerExpense, "id">) => {
      dispatch({
        type: "ADD_EXPENSE",
        payload: { ...data, id: crypto.randomUUID() },
      });
    },
    [dispatch]
  );

  const handleEdit = useCallback(
    (data: Omit<PlannerExpense, "id">) => {
      if (!editingExpense) return;
      dispatch({
        type: "UPDATE_EXPENSE",
        payload: { id: editingExpense.id, updates: data },
      });
      setEditingExpense(null);
    },
    [dispatch, editingExpense]
  );

  const handleDelete = useCallback(
    (expense: PlannerExpense) => {
      dispatch({ type: "DELETE_EXPENSE", payload: expense.id });
      toast.info("Expense removed", {
        action: {
          label: "Undo",
          onClick: () => dispatch({ type: "RESTORE_EXPENSE", payload: expense }),
        },
      });
    },
    [dispatch]
  );

  return (
    <SectionContainer
      id="pricing"
      title="Pricing"
      subtitle="Track your trip budget and expenses"
      onAdd={() => setShowAddModal(true)}
      addLabel="Add Expense"
    >
      {/* Budget Overview */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
            <TrendingUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Estimated Cost</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${budgetData.total.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-3">
          {(Object.entries(budgetData.categories) as [ExpenseCategory, number][]).map(
            ([category, amount]) => {
              const pct = budgetData.total > 0 ? (amount / budgetData.total) * 100 : 0;
              return (
                <div key={category}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      {CATEGORY_ICONS[category]}
                      <span className="capitalize">{category}</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ${amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", CATEGORY_COLORS[category])}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            }
          )}
        </div>
      </Card>

      {/* Expense List */}
      {state.expenses.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <DollarSign className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            No additional expenses yet
          </p>
          <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
            Add an expense
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {state.expenses.map((expense) => (
            <div
              key={expense.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
            >
              <Badge variant="secondary" className="text-[10px] capitalize shrink-0">
                {expense.category}
              </Badge>
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-900 dark:text-white truncate block">
                  {expense.description}
                </span>
                <span className="text-xs text-gray-400">
                  {expense.date ? formatDate(expense.date) : "No date"}
                  {expense.paidBy !== "Shared" && ` · ${expense.paidBy}`}
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white shrink-0">
                ${expense.amount.toFixed(2)}
              </span>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setEditingExpense(expense)}
                  className="h-8 w-8"
                  aria-label="Edit expense"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(expense)}
                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  aria-label="Delete expense"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ExpenseFormModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAdd}
      />
      <ExpenseFormModal
        open={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        onSave={handleEdit}
        initial={editingExpense}
      />
    </SectionContainer>
  );
}
