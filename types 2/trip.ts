/**
 * Trip types matching Supabase schema exactly
 * Based on migrations/trips.sql
 */

export interface Trip {
  id: string; // UUID
  user_id: string; // UUID
  title: string; // VARCHAR(255) NOT NULL
  description: string | null; // TEXT
  destination: string | null; // VARCHAR(255)
  start_date: string | null; // DATE (ISO date string)
  end_date: string | null; // DATE (ISO date string)
  status: 'planning' | 'upcoming' | 'ongoing' | 'completed'; // VARCHAR(50) NOT NULL DEFAULT 'planning'
  is_public: boolean; // BOOLEAN NOT NULL DEFAULT FALSE
  cover_image: string | null; // VARCHAR(500)
  created_at: string; // TIMESTAMP WITH TIME ZONE
  updated_at: string; // TIMESTAMP WITH TIME ZONE
}

export interface InsertTrip {
  user_id: string;
  title: string;
  description?: string | null;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: 'planning' | 'upcoming' | 'ongoing' | 'completed';
  is_public?: boolean;
  cover_image?: string | null;
}

export interface UpdateTrip {
  title?: string;
  description?: string | null;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: 'planning' | 'upcoming' | 'ongoing' | 'completed';
  is_public?: boolean;
  cover_image?: string | null;
}

export interface ItineraryItem {
  id: string; // UUID
  trip_id: string; // UUID
  destination_slug: string | null; // VARCHAR(255)
  day: number; // INTEGER NOT NULL
  order_index: number; // INTEGER NOT NULL
  time: string | null; // VARCHAR(50)
  title: string; // VARCHAR(255) NOT NULL
  description: string | null; // TEXT
  notes: string | null; // TEXT (can contain JSON)
  created_at: string; // TIMESTAMP WITH TIME ZONE
}

export interface InsertItineraryItem {
  trip_id: string;
  destination_slug?: string | null;
  day: number;
  order_index: number;
  time?: string | null;
  title: string;
  description?: string | null;
  notes?: string | null;
}

export interface UpdateItineraryItem {
  destination_slug?: string | null;
  day?: number;
  order_index?: number;
  time?: string | null;
  title?: string;
  description?: string | null;
  notes?: string | null;
}

/**
 * Extended types for UI components
 */
export interface TripLocation {
  id: number;
  name: string;
  city: string;
  category: string;
  image: string;
  time?: string;
  notes?: string;
  cost?: number;
  duration?: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

/**
 * Parsed notes data structure (stored as JSON in notes field)
 */
export interface ItineraryItemNotes {
  raw?: string;
  cost?: number;
  duration?: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  image?: string;
  city?: string;
  category?: string;
}

