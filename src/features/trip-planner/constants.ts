import type { TripPlannerState, SectionId } from "./types";

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export function createDefaultState(): TripPlannerState {
  const today = todayStr();
  const id = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

  return {
    trip: {
      id,
      title: "",
      location: "",
      description: "",
      startDate: today,
      endDate: addDays(today, 3),
      coverImage: "",
      currency: "USD",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    activities: [],
    travelers: [],
    transportation: [],
    lodging: [],
    expenses: [],
    ui: {
      activeSection: null,
      activeDayIndex: 0,
      isDirty: false,
      lastSaved: null,
    },
  };
}

export interface SectionDef {
  id: SectionId;
  label: string;
  icon: string; // lucide icon name
  description: string;
}

export const SECTIONS: SectionDef[] = [
  { id: "itinerary", label: "Itinerary", icon: "calendar-days", description: "Plan your daily activities" },
  { id: "travelers", label: "Travelers", icon: "users", description: "Who's coming along" },
  { id: "transportation", label: "Transportation", icon: "car", description: "Flights, trains & more" },
  { id: "lodging", label: "Lodging", icon: "building-2", description: "Where you'll stay" },
  { id: "pricing", label: "Pricing", icon: "dollar-sign", description: "Budget & expenses" },
];

/** Calculate how many days the trip spans (minimum 1) */
export function getTripDayCount(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 1;
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const diff = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
  return Math.max(1, diff);
}

/** Get the date string for a given day index */
export function getDayDate(startDate: string, dayIndex: number): string {
  return addDays(startDate, dayIndex);
}

/** Format a date string as "Feb 19 (Thu)" */
export function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const day = d.getDate();
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  return `${month} ${day} (${weekday})`;
}

/** Format date range as "Feb 19 - 22, 2026" */
export function formatDateRange(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return "Set dates";
  const s = new Date(startDate + "T12:00:00");
  const e = new Date(endDate + "T12:00:00");
  const sMonth = s.toLocaleDateString("en-US", { month: "long" });
  const sDay = s.getDate();
  const eDay = e.getDate();
  const year = e.getFullYear();

  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${sMonth} ${sDay} - ${eDay}, ${year}`;
  }
  const eMonth = e.toLocaleDateString("en-US", { month: "long" });
  return `${sMonth} ${sDay} - ${eMonth} ${eDay}, ${year}`;
}

/** Calculate completion percentage (0-100) */
export function calculateCompletion(state: TripPlannerState): number {
  const checks = [
    state.trip.title.length > 0,
    state.trip.location.length > 0,
    state.trip.startDate.length > 0,
    state.trip.endDate.length > 0,
    state.trip.description.length > 0,
    state.activities.length > 0,
    state.travelers.length > 0,
    state.transportation.length > 0,
    state.lodging.length > 0,
    state.expenses.length > 0,
  ];
  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}
