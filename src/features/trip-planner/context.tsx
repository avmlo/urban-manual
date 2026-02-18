"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import type { TripPlannerState } from "./types";
import { tripPlannerReducer, type TripPlannerAction } from "./reducer";
import { createDefaultState } from "./constants";
import { loadState, saveState } from "./storage";
import { syncToSupabase, loadFromSupabase } from "./supabase-sync";

interface TripPlannerContextValue {
  state: TripPlannerState;
  dispatch: React.Dispatch<TripPlannerAction>;
  saveDraft: () => void;
  supabaseTripId: string | null;
  isSyncing: boolean;
}

const TripPlannerContext = createContext<TripPlannerContextValue | null>(null);

interface TripPlannerProviderProps {
  children: ReactNode;
  /** If provided, loads an existing trip from Supabase */
  tripId?: string;
  /** Authenticated user ID for Supabase sync */
  userId?: string;
}

export function TripPlannerProvider({
  children,
  tripId,
  userId,
}: TripPlannerProviderProps) {
  const [state, dispatch] = useReducer(tripPlannerReducer, null, () => {
    return createDefaultState();
  });

  const [supabaseTripId, setSupabaseTripId] = useState<string | null>(
    tripId ?? null
  );
  const [isSyncing, setIsSyncing] = useState(false);

  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);

  // Keep stateRef in sync via effect
  useEffect(() => {
    stateRef.current = state;
  });

  // Hydrate: from Supabase (if tripId given) or localStorage
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    if (tripId && userId) {
      setIsSyncing(true);
      loadFromSupabase(tripId, userId)
        .then((loaded) => {
          if (loaded) {
            dispatch({ type: "HYDRATE", payload: loaded });
          }
        })
        .finally(() => setIsSyncing(false));
    } else {
      const saved = loadState();
      if (saved) {
        dispatch({ type: "HYDRATE", payload: saved });
      }
    }
  }, [tripId, userId]);

  // Auto-save: 2-second debounce after data changes
  useEffect(() => {
    if (!hydrated.current) return;
    if (!state.ui.isDirty) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const currentState = stateRef.current;
      // Always save to localStorage
      saveState(currentState);

      // Sync to Supabase if authenticated
      if (userId) {
        setIsSyncing(true);
        syncToSupabase(currentState, userId, supabaseTripId)
          .then((newId) => {
            if (newId && !supabaseTripId) {
              setSupabaseTripId(newId);
            }
          })
          .finally(() => setIsSyncing(false));
      }

      dispatch({ type: "MARK_SAVED" });
    }, 2000);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [
    state.ui.isDirty,
    state.trip,
    state.activities,
    state.travelers,
    state.transportation,
    state.lodging,
    state.expenses,
    userId,
    supabaseTripId,
  ]);

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

    const currentState = stateRef.current;
    saveState(currentState);

    if (userId) {
      setIsSyncing(true);
      syncToSupabase(currentState, userId, supabaseTripId)
        .then((newId) => {
          if (newId && !supabaseTripId) {
            setSupabaseTripId(newId);
          }
        })
        .finally(() => setIsSyncing(false));
    }

    dispatch({ type: "MARK_SAVED" });
  }, [userId, supabaseTripId]);

  return (
    <TripPlannerContext.Provider
      value={{ state, dispatch, saveDraft, supabaseTripId, isSyncing }}
    >
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
