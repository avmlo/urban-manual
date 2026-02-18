import type {
  TripPlannerState,
  PlannerTrip,
  PlannerActivity,
  PlannerTraveler,
  PlannerTransport,
  PlannerLodging,
  PlannerExpense,
  SectionId,
} from "./types";

// === Action Types ===
export type TripPlannerAction =
  // Trip
  | { type: "UPDATE_TRIP"; payload: Partial<PlannerTrip> }
  // Activities
  | { type: "ADD_ACTIVITY"; payload: PlannerActivity }
  | { type: "UPDATE_ACTIVITY"; payload: { id: string; updates: Partial<PlannerActivity> } }
  | { type: "DELETE_ACTIVITY"; payload: string }
  | { type: "REORDER_ACTIVITIES"; payload: { dayIndex: number; orderedIds: string[] } }
  | { type: "RESTORE_ACTIVITY"; payload: PlannerActivity }
  // Travelers
  | { type: "ADD_TRAVELER"; payload: PlannerTraveler }
  | { type: "UPDATE_TRAVELER"; payload: { id: string; updates: Partial<PlannerTraveler> } }
  | { type: "DELETE_TRAVELER"; payload: string }
  | { type: "RESTORE_TRAVELER"; payload: PlannerTraveler }
  // Transportation
  | { type: "ADD_TRANSPORT"; payload: PlannerTransport }
  | { type: "UPDATE_TRANSPORT"; payload: { id: string; updates: Partial<PlannerTransport> } }
  | { type: "DELETE_TRANSPORT"; payload: string }
  | { type: "RESTORE_TRANSPORT"; payload: PlannerTransport }
  // Lodging
  | { type: "ADD_LODGING"; payload: PlannerLodging }
  | { type: "UPDATE_LODGING"; payload: { id: string; updates: Partial<PlannerLodging> } }
  | { type: "DELETE_LODGING"; payload: string }
  | { type: "RESTORE_LODGING"; payload: PlannerLodging }
  // Expenses
  | { type: "ADD_EXPENSE"; payload: PlannerExpense }
  | { type: "UPDATE_EXPENSE"; payload: { id: string; updates: Partial<PlannerExpense> } }
  | { type: "DELETE_EXPENSE"; payload: string }
  | { type: "RESTORE_EXPENSE"; payload: PlannerExpense }
  // UI
  | { type: "SET_ACTIVE_SECTION"; payload: SectionId | null }
  | { type: "SET_ACTIVE_DAY"; payload: number }
  // Lifecycle
  | { type: "HYDRATE"; payload: TripPlannerState }
  | { type: "MARK_SAVED" };

function markDirty(state: TripPlannerState): TripPlannerState {
  return {
    ...state,
    trip: { ...state.trip, updatedAt: new Date().toISOString() },
    ui: { ...state.ui, isDirty: true },
  };
}

export function tripPlannerReducer(
  state: TripPlannerState,
  action: TripPlannerAction
): TripPlannerState {
  switch (action.type) {
    // ─── Trip ─────────────────────────
    case "UPDATE_TRIP":
      return markDirty({
        ...state,
        trip: { ...state.trip, ...action.payload },
      });

    // ─── Activities ───────────────────
    case "ADD_ACTIVITY":
      return markDirty({
        ...state,
        activities: [...state.activities, action.payload],
      });

    case "UPDATE_ACTIVITY":
      return markDirty({
        ...state,
        activities: state.activities.map((a) =>
          a.id === action.payload.id ? { ...a, ...action.payload.updates } : a
        ),
      });

    case "DELETE_ACTIVITY":
      return markDirty({
        ...state,
        activities: state.activities.filter((a) => a.id !== action.payload),
      });

    case "REORDER_ACTIVITIES": {
      const { dayIndex, orderedIds } = action.payload;
      const reordered = state.activities.map((a) => {
        if (a.dayIndex !== dayIndex) return a;
        const newIndex = orderedIds.indexOf(a.id);
        if (newIndex === -1) return a;
        return { ...a, orderIndex: newIndex };
      });
      return markDirty({ ...state, activities: reordered });
    }

    case "RESTORE_ACTIVITY":
      return markDirty({
        ...state,
        activities: [...state.activities, action.payload],
      });

    // ─── Travelers ────────────────────
    case "ADD_TRAVELER":
      return markDirty({
        ...state,
        travelers: [...state.travelers, action.payload],
      });

    case "UPDATE_TRAVELER":
      return markDirty({
        ...state,
        travelers: state.travelers.map((t) =>
          t.id === action.payload.id ? { ...t, ...action.payload.updates } : t
        ),
      });

    case "DELETE_TRAVELER":
      return markDirty({
        ...state,
        travelers: state.travelers.filter((t) => t.id !== action.payload),
      });

    case "RESTORE_TRAVELER":
      return markDirty({
        ...state,
        travelers: [...state.travelers, action.payload],
      });

    // ─── Transportation ───────────────
    case "ADD_TRANSPORT":
      return markDirty({
        ...state,
        transportation: [...state.transportation, action.payload],
      });

    case "UPDATE_TRANSPORT":
      return markDirty({
        ...state,
        transportation: state.transportation.map((t) =>
          t.id === action.payload.id ? { ...t, ...action.payload.updates } : t
        ),
      });

    case "DELETE_TRANSPORT":
      return markDirty({
        ...state,
        transportation: state.transportation.filter((t) => t.id !== action.payload),
      });

    case "RESTORE_TRANSPORT":
      return markDirty({
        ...state,
        transportation: [...state.transportation, action.payload],
      });

    // ─── Lodging ──────────────────────
    case "ADD_LODGING":
      return markDirty({
        ...state,
        lodging: [...state.lodging, action.payload],
      });

    case "UPDATE_LODGING":
      return markDirty({
        ...state,
        lodging: state.lodging.map((l) =>
          l.id === action.payload.id ? { ...l, ...action.payload.updates } : l
        ),
      });

    case "DELETE_LODGING":
      return markDirty({
        ...state,
        lodging: state.lodging.filter((l) => l.id !== action.payload),
      });

    case "RESTORE_LODGING":
      return markDirty({
        ...state,
        lodging: [...state.lodging, action.payload],
      });

    // ─── Expenses ─────────────────────
    case "ADD_EXPENSE":
      return markDirty({
        ...state,
        expenses: [...state.expenses, action.payload],
      });

    case "UPDATE_EXPENSE":
      return markDirty({
        ...state,
        expenses: state.expenses.map((e) =>
          e.id === action.payload.id ? { ...e, ...action.payload.updates } : e
        ),
      });

    case "DELETE_EXPENSE":
      return markDirty({
        ...state,
        expenses: state.expenses.filter((e) => e.id !== action.payload),
      });

    case "RESTORE_EXPENSE":
      return markDirty({
        ...state,
        expenses: [...state.expenses, action.payload],
      });

    // ─── UI ───────────────────────────
    case "SET_ACTIVE_SECTION":
      return { ...state, ui: { ...state.ui, activeSection: action.payload } };

    case "SET_ACTIVE_DAY":
      return { ...state, ui: { ...state.ui, activeDayIndex: action.payload } };

    // ─── Lifecycle ────────────────────
    case "HYDRATE":
      return {
        ...action.payload,
        ui: { ...action.payload.ui, isDirty: false },
      };

    case "MARK_SAVED":
      return {
        ...state,
        ui: { ...state.ui, isDirty: false, lastSaved: new Date().toISOString() },
      };

    default:
      return state;
  }
}
