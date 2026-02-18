/**
 * Type definitions for the self-build trip planner.
 * Independent from the existing /types/trip.ts to keep systems separate.
 */

// === Core Trip ===
export interface PlannerTrip {
  id: string;
  title: string;
  location: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  coverImage: string;
  currency: string; // ISO code, default "USD"
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

// === Activities / Itinerary ===
export type ActivityCategory =
  | "dining"
  | "sightseeing"
  | "transport"
  | "shopping"
  | "entertainment"
  | "other";

export const ACTIVITY_CATEGORIES: { value: ActivityCategory; label: string }[] = [
  { value: "dining", label: "Dining" },
  { value: "sightseeing", label: "Sightseeing" },
  { value: "transport", label: "Transport" },
  { value: "shopping", label: "Shopping" },
  { value: "entertainment", label: "Entertainment" },
  { value: "other", label: "Other" },
];

export interface PlannerActivity {
  id: string;
  dayIndex: number; // 0-based
  orderIndex: number;
  title: string;
  time: string; // "HH:mm" or ""
  category: ActivityCategory;
  description: string;
  location: string;
}

// === Travelers ===
export type TravelerRole = "owner" | "co-planner" | "traveler" | "viewer";

export const TRAVELER_ROLES: { value: TravelerRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "co-planner", label: "Co-planner" },
  { value: "traveler", label: "Traveler" },
  { value: "viewer", label: "Viewer" },
];

export interface PlannerTraveler {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: TravelerRole;
}

// === Transportation ===
export type TransportType = "flight" | "train" | "car-rental" | "car-transfer" | "cruise" | "ferry";

export const TRANSPORT_TYPES: { value: TransportType; label: string }[] = [
  { value: "flight", label: "Flight" },
  { value: "train", label: "Train" },
  { value: "car-rental", label: "Car Rental" },
  { value: "car-transfer", label: "Car Transfer" },
  { value: "cruise", label: "Cruise" },
  { value: "ferry", label: "Ferry" },
];

export interface PlannerTransport {
  id: string;
  type: TransportType;
  departureLocation: string;
  arrivalLocation: string;
  departureDate: string; // YYYY-MM-DD
  departureTime: string; // HH:mm or ""
  arrivalDate: string;
  arrivalTime: string;
  confirmationNumber: string;
  notes: string;
  cost: number;
}

// === Lodging ===
export interface PlannerLodging {
  id: string;
  name: string;
  address: string;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string;
  rooms: number;
  confirmationNumber: string;
  bookingUrl: string;
  notes: string;
  cost: number;
}

// === Expenses / Pricing ===
export type ExpenseCategory =
  | "transportation"
  | "lodging"
  | "activities"
  | "other";

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "transportation", label: "Transportation" },
  { value: "lodging", label: "Lodging" },
  { value: "activities", label: "Activities" },
  { value: "other", label: "Other" },
];

export const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "JPY", label: "JPY" },
  { value: "AUD", label: "AUD" },
  { value: "CAD", label: "CAD" },
  { value: "CHF", label: "CHF" },
];

export interface PlannerExpense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD
  paidBy: string; // traveler name or "Shared"
  notes: string;
}

// === Section Navigation ===
export type SectionId =
  | "itinerary"
  | "travelers"
  | "transportation"
  | "lodging"
  | "pricing";

// === Full State ===
export interface TripPlannerState {
  trip: PlannerTrip;
  activities: PlannerActivity[];
  travelers: PlannerTraveler[];
  transportation: PlannerTransport[];
  lodging: PlannerLodging[];
  expenses: PlannerExpense[];
  ui: {
    activeSection: SectionId | null;
    activeDayIndex: number;
    isDirty: boolean;
    lastSaved: string | null;
  };
}
