"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import type { TripPlannerState } from "./types";
import { tripPlannerReducer, type TripPlannerAction } from "./reducer";
import { createDefaultState } from "./constants";
import { loadState, saveState } from "./storage";

interface TripPlannerContextValue {
  state: TripPlannerState;
  dispatch: React.Dispatch<TripPlannerAction>;
  saveDraft: () => void;
}

const TripPlannerContext = createContext<TripPlannerContextValue | null>(null);

export function TripPlannerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tripPlannerReducer, null, () => {
    return createDefaultState();
  });

  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);

  // Keep stateRef in sync via effect (not during render)
  useEffect(() => {
    stateRef.current = state;
  });

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const saved = loadState();
    if (saved) {
      dispatch({ type: "HYDRATE", payload: saved });
    }
  }, []);

  // Auto-save: 2-second debounce after data changes
  useEffect(() => {
    if (!hydrated.current) return;
    if (!state.ui.isDirty) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveState(stateRef.current);
      dispatch({ type: "MARK_SAVED" });
    }, 2000);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state.ui.isDirty, state.trip, state.activities, state.travelers, state.transportation, state.lodging, state.expenses]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (stateRef.current.ui.isDirty) {
        saveState(stateRef.current);
      }
    };
  }, []);

  const saveDraft = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveState(stateRef.current);
    dispatch({ type: "MARK_SAVED" });
  }, []);

  return (
    <TripPlannerContext.Provider value={{ state, dispatch, saveDraft }}>
      {children}
    </TripPlannerContext.Provider>
  );
}

export function useTripPlanner() {
  const ctx = useContext(TripPlannerContext);
  if (!ctx) {
    throw new Error("useTripPlanner must be used within TripPlannerProvider");
  }
  return ctx;
}
