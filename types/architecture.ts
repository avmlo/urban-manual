/**
 * Architecture-First Type Definitions
 * Architecture is primary, not metadata
 */

export interface Architect {
  id: string;
  name: string;
  slug: string;
  bio?: string | null;
  birth_year?: number | null;
  death_year?: number | null;
  nationality?: string | null;
  design_philosophy?: string | null;
  notable_works?: string[] | null;
  movements?: string[] | null; // Movement slugs
  influences?: string[] | null; // Architect IDs
  influenced_by?: string[] | null; // Architect IDs
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DesignFirm {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  founded_year?: number | null;
  founders?: string[] | null; // Architect IDs
  notable_works?: string[] | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DesignMovement {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  period_start?: number | null;
  period_end?: number | null; // null if ongoing
  key_characteristics?: string[] | null;
  notable_architects?: string[] | null; // Architect IDs
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  common_uses?: string[] | null;
  created_at: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  description?: string | null;
  website?: string | null;
  founded_year?: number | null;
  headquarters?: string | null;
  parent_company?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArchitecturalPhoto {
  id: string;
  destination_id: number;
  url: string;
  caption?: string | null;
  photographer?: string | null;
  is_primary: boolean;
  order_index: number;
  created_at: string;
}

/**
 * Extended Destination with Architecture as Primary
 */
export interface ArchitectureDestination {
  // Core identity
  id: number;
  name: string;
  slug: string;
  city: string;
  country: string;
  neighborhood?: string | null;
  
  // ARCHITECTURE FIRST (not metadata!)
  architect_id?: string | null;
  architect?: Architect | null; // Populated via join
  design_firm_id?: string | null;
  design_firm?: DesignFirm | null;
  interior_designer_id?: string | null;
  interior_designer?: Architect | null;
  movement_id?: string | null;
  movement?: DesignMovement | null;
  materials?: Material[] | null; // Populated via join
  design_period?: string | null; // "1960s", "Contemporary", etc.
  
  // Architecture content (PRIMARY)
  architectural_significance?: string | null; // Why this matters
  design_story?: string | null; // Rich narrative
  construction_year?: number | null;
  renovation_history?: Record<string, unknown> | null;
  design_awards?: Record<string, unknown> | null;
  
  // Travel intelligence
  category: string;
  location?: { lat: number; lng: number } | null; // PostGIS or lat/long
  opening_hours?: Record<string, unknown> | null;
  price_level?: number | null;
  rating?: number | null;
  
  // Rich content
  hero_image?: string | null;
  image?: string | null; // Main image (for compatibility)
  architectural_photos?: ArchitecturalPhoto[] | null;
  description?: string | null;
  
  // Location (for map compatibility)
  latitude?: number | null;
  longitude?: number | null;
  
  // Intelligence metadata
  intelligence_score?: number | null;
  last_enriched_at?: string | null;
  created_at: string;
}

/**
 * Architectural Journey - Core Intelligence Product
 */
export interface ArchitecturalJourney {
  id: string;
  title: string;
  description: string;
  type: 'movement' | 'architect' | 'material' | 'period' | 'city';
  focus: string; // Movement slug, architect slug, material slug, etc.
  destinations: ArchitectureDestination[];
  narrative: string; // The design story
  insights: ArchitecturalInsight[];
  created_at: string;
}

export interface ArchitecturalInsight {
  type: 'influence' | 'evolution' | 'contrast' | 'material' | 'movement';
  title: string;
  description: string;
  destinations: number[]; // Destination IDs
}

