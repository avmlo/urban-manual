// Re-export category types for convenience
export { VALID_CATEGORIES, type CategoryType } from '@/lib/categories';

export interface Destination {
  id?: number; // Database primary key
  slug: string;
  name: string;
  city: string;
  country?: string;
  neighborhood?: string | null; // Specific neighborhood within city
  category: string; // Valid values: Dining, Hotel, Bar, Cafe, Culture, Shopping, Bakery, Park, Other
  micro_description?: string; // Short 1-line description for cards
  description?: string;
  content?: string;
  image?: string;
  image_thumbnail?: string; // Optimized thumbnail from Supabase Storage
  image_original?: string; // Backup of original URL before migration
  michelin_stars?: number;
  crown?: boolean;
  brand?: string | null;
  brand_id?: string | null;
  // Legacy architecture fields (text) - kept for backward compatibility
  architect?: string | null;
  interior_designer?: string | null;
  design_firm?: string | null;
  architectural_style?: string | null;
  design_period?: string | null;
  architect_info_json?: Record<string, unknown> | null;
  architect_info_updated_at?: string | null;
  // NEW: Architecture-First fields (FKs and rich content)
  architect_id?: string | null;
  design_firm_id?: string | null;
  interior_designer_id?: string | null;
  movement_id?: string | null;
  architectural_significance?: string | null; // Why this matters architecturally
  design_story?: string | null; // Rich narrative about the design
  construction_year?: number | null;
  renovation_history?: Record<string, unknown> | null;
  design_awards?: Record<string, unknown> | null;
  intelligence_score?: number | null;
  web_content_json?: Record<string, unknown> | null;
  web_content_updated_at?: string | null;
  // Nested destinations support
  parent_destination_id?: number | null; // ID of parent destination (e.g., hotel containing this bar)
  nested_destinations?: Destination[]; // Array of nested destinations (populated by queries)
  // Enrichment fields
  place_id?: string | null;
  rating?: number | null;
  price_level?: number | null;
  phone_number?: string | null;
  website?: string | null;
  google_maps_url?: string | null;
  instagram_handle?: string | null;
  instagram_url?: string | null;
  tags?: string[] | null;
  last_enriched_at?: string | null;
  // Google Places API enriched data (JSON fields from database)
  formatted_address?: string | null;
  international_phone_number?: string | null;
  user_ratings_total?: number | null;
  opening_hours_json?: Record<string, unknown> | null;
  reviews_json?: Array<Record<string, unknown>> | null;
  photos_json?: Array<Record<string, unknown>> | null;
  editorial_summary?: string | null;
  google_name?: string | null;
  place_types_json?: Array<string> | null;
  utc_offset?: number | null;
  vicinity?: string | null;
  timezone_id?: string | null;
  primary_photo_url?: string | null;
  photo_count?: number | null;
  // Geolocation fields
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number; // Added by nearby query
  distance_miles?: number; // Added by nearby query
  // Engagement fields
  views_count?: number;
  saves_count?: number;
  visits_count?: number;
  // Booking fields
  opentable_url?: string | null;
  resy_url?: string | null;
  booking_url?: string | null;
  reservation_phone?: string | null;
}
