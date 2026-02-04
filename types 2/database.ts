// Generated database types for schema reconciliation

export interface SavedPlace {
  id: string;
  user_id: string;
  destination_slug: string;
  destination_id: number | null;
  saved_at: string;
  notes: string | null;
  tags: string[] | null;
}

export interface VisitedPlace {
  id: string;
  user_id: string;
  destination_slug: string;
  destination_id: number | null;
  visited_at: string;
  rating: number | null;
  notes: string | null;
}

export interface UserSavedDestination {
  id: number;
  slug: string;
  name: string;
  city: string;
  category: string;
  content: string | null;
  image_url: string | null;
  rating: number | null;
  price_level: number | null;
  michelin_stars: number | null;
  brand: string | null;
  tags: string[] | null;
  saved_at: string;
  user_notes: string | null;
  user_tags: string[] | null;
}

export interface UserVisitedDestination {
  id: number;
  slug: string;
  name: string;
  city: string;
  category: string;
  content: string | null;
  image_url: string | null;
  rating: number | null;
  price_level: number | null;
  michelin_stars: number | null;
  brand: string | null;
  tags: string[] | null;
  visited_at: string;
  user_rating: number | null;
  user_notes: string | null;
}

export interface DestinationUserStatus {
  is_saved: boolean;
  is_visited: boolean;
  saved_at: string | null;
  visited_at: string | null;
}

