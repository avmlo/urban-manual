import { Destination } from './destination';

export interface UserProfile {
  id: string;
  user_id: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  
  // Preferences
  favorite_cities?: string[];
  favorite_categories?: string[];
  dietary_preferences?: string[];
  price_preference?: number; // 1-4 ($ to $$$$)
  
  // Interests
  interests?: string[];
  travel_style?: 'Luxury' | 'Budget' | 'Adventure' | 'Relaxation' | 'Balanced';
  
  // Settings
  privacy_mode: boolean;
  allow_tracking: boolean;
  email_notifications: boolean;
  
  created_at: string;
  updated_at: string;
}

export interface SavedDestination {
  id: string;
  user_id: string;
  destination_id: number;
  collection_id?: string;
  notes?: string;
  visited: boolean;
  visit_date?: string;
  rating?: number; // 1-5
  saved_at: string;
  
  // Joined data
  destination?: Destination;
  collection?: Collection;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  emoji: string;
  color: string;
  is_public: boolean;
  destination_count: number;
  created_at: string;
  updated_at: string;
  
  // Joined data
  destinations?: Destination[];
}

export interface VisitHistory {
  id: string;
  user_id: string;
  destination_id: number;
  visited_at: string;
  duration_seconds?: number;
  source?: string; // 'search', 'recommendation', 'category', 'city'
  search_query?: string;
  
  // Joined data
  destination?: Destination;
}

export interface UserInteraction {
  id: string;
  user_id: string;
  destination_id: number;
  interaction_type: 'view' | 'save' | 'unsave' | 'click_website' | 'click_maps' | 'share';
  created_at: string;
}

export interface PersonalizationScore {
  id: string;
  user_id: string;
  destination_id: number;
  score: number; // 0.0 to 1.0
  reason?: string;
  generated_at: string;
  expires_at: string;
  
  // Joined data
  destination?: Destination;
}

export interface PersonalizationInsights {
  top_cities: { city: string; count: number }[];
  top_categories: { category: string; count: number }[];
  avg_price_level: number;
  michelin_preference: boolean;
  recent_interests: string[];
  travel_style: string;
}

