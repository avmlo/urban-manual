/**
 * Type definitions for MCP Server
 *
 * Shared types used across the MCP server implementation.
 */

// Re-export common types from main app
export interface Destination {
  id?: number;
  slug: string;
  name: string;
  city: string;
  country?: string;
  neighborhood?: string | null;
  category: string;
  micro_description?: string;
  description?: string;
  content?: string;
  image?: string;
  image_thumbnail?: string;
  michelin_stars?: number;
  crown?: boolean;
  brand?: string | null;
  design_firm?: string | null;
  architectural_style?: string | null;
  design_period?: string | null;
  architectural_significance?: string | null;
  design_story?: string | null;
  place_id?: string | null;
  rating?: number | null;
  price_level?: number | null;
  phone_number?: string | null;
  website?: string | null;
  google_maps_url?: string | null;
  instagram_handle?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  views_count?: number;
  saves_count?: number;
  visits_count?: number;
  opentable_url?: string | null;
  resy_url?: string | null;
  booking_url?: string | null;
}

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "planning" | "upcoming" | "ongoing" | "completed";
  is_public: boolean;
  cover_image: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItineraryItem {
  id: string;
  trip_id: string;
  destination_slug: string | null;
  day: number;
  order_index: number;
  time: string | null;
  title: string;
  description: string | null;
  notes: string | null;
  created_at: string;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  city: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedPlace {
  user_id: string;
  destination_slug: string;
  created_at: string;
}

export interface VisitedPlace {
  user_id: string;
  destination_slug: string;
  visited_at: string;
  rating: number | null;
  notes: string | null;
}

// Tool response types
export interface ToolResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

// Search result types
export interface SearchResult {
  slug: string;
  name: string;
  city: string;
  category: string;
  micro_description?: string;
  rating?: number;
  image?: string;
  score?: number;
}

// Recommendation types
export interface RecommendationRequest {
  city?: string;
  category?: string;
  preferences?: string[];
  exclude_visited?: string[];
  mood?: string;
  budget?: "budget" | "moderate" | "upscale" | "luxury";
  limit?: number;
}

// Trip planning types
export interface TripPlanRequest {
  cities: string[];
  days: number;
  interests?: string[];
  pace?: "relaxed" | "moderate" | "packed";
  must_see?: string[];
}

export interface DayPlan {
  day: number;
  city: string;
  items: Array<{
    time: string;
    destination_slug?: string;
    name: string;
    category: string;
    duration?: number;
  }>;
}

// Weather types
export interface WeatherData {
  location: {
    name: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  current: {
    temp_c: number;
    temp_f: number;
    condition: string;
    wind_kmh: number;
  };
  forecast: Array<{
    date: string;
    temp_high_c: number;
    temp_low_c: number;
    temp_high_f: number;
    temp_low_f: number;
    precipitation_chance: number;
    condition: string;
  }>;
}

// Intent analysis types
export interface IntentAnalysis {
  message: string;
  primary_intent: {
    intent: string;
    confidence: number;
  };
  all_intents: Array<{
    intent: string;
    confidence: number;
  }>;
  entities: {
    city?: string;
    category?: string;
    duration?: {
      value: number;
      unit: string;
    };
  };
}
