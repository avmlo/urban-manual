import type { TripPlannerState } from "./types";

const STORAGE_KEY = "urban-manual-trip-planner";

export function loadState(): TripPlannerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Basic shape validation
    if (parsed && typeof parsed === "object" && parsed.trip && parsed.activities) {
      return parsed as TripPlannerState;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveState(state: TripPlannerState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save trip planner state:", e);
  }
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
