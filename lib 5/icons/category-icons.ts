/**
 * Category to Untitled UI Icon Mapping
 * 
 * Maps destination categories to Untitled UI icon component names.
 * Icons are defined as inline SVG components in components/icons/UntitledUIIcons.tsx
 * 
 * To add new icons:
 * 1. Visit https://www.untitledui.com/free-icons
 * 2. Copy the SVG code for the icon you need
 * 3. Add a new component in components/icons/UntitledUIIcons.tsx
 * 4. Add the mapping here
 */

import React from 'react';
import {
  UtensilsIcon,
  CoffeeIcon,
  WineIcon,
  Building02Icon,
  ShoppingBagIcon,
  CameraIcon,
  MusicIcon,
  FilmIcon,
  DumbbellIcon,
  TreeIcon,
  WavesIcon,
  LandmarkIcon,
  SparklesIcon,
  BreadIcon,
  type IconProps,
} from '@/components/icons/UntitledUIIcons';

type IconComponent = React.ComponentType<IconProps>;

export const CATEGORY_ICON_MAP: Record<string, string> = {
  // Food & Restaurant
  'dining': 'utensils',
  'restaurant': 'utensils',
  'restaurants': 'utensils',
  'food': 'utensils',
  'cafe': 'coffee',
  'cafes': 'coffee',
  'coffee': 'coffee',
  'bar': 'wine',
  'bars': 'wine',
  'nightlife': 'wine',
  'bakery': 'bread',
  'bakeries': 'bread',
  
  // Accommodation
  'hotel': 'building-02',
  'hotels': 'building-02',
  'accommodation': 'building-02',
  'lodging': 'building-02',
  
  // Shopping
  'shopping': 'shopping-bag',
  'shop': 'shopping-bag',
  'store': 'shopping-bag',
  'retail': 'shopping-bag',
  
  // Culture & Entertainment
  'culture': 'landmark',
  'museum': 'landmark',
  'museums': 'landmark',
  'gallery': 'camera',
  'galleries': 'camera',
  'art': 'camera',
  'theater': 'film',
  'theatre': 'film',
  'cinema': 'film',
  'music': 'music',
  'concert': 'music',
  'attraction': 'landmark',
  'attractions': 'landmark',
  'landmark': 'landmark',
  'landmarks': 'landmark',
  
  // Activities
  'activity': 'dumbbell',
  'activities': 'dumbbell',
  'sport': 'dumbbell',
  'sports': 'dumbbell',
  'fitness': 'dumbbell',
  'park': 'tree',
  'parks': 'tree',
  'outdoor': 'tree',
  'beach': 'waves',
  
  // Other - no icon needed (will return null)
};

/**
 * Get Untitled UI icon name for a category
 */
export function getCategoryIconName(category: string): string | null {
  const key = category.toLowerCase().trim();
  return CATEGORY_ICON_MAP[key] || null;
}

/**
 * Get Untitled UI icon component for a category
 */
export function getCategoryIconComponent(category: string): IconComponent | null {
  const iconName = getCategoryIconName(category);
  if (!iconName) return null;

  // Map icon names to components
  const iconMap: Record<string, IconComponent> = {
    'utensils': UtensilsIcon,
    'coffee': CoffeeIcon,
    'wine': WineIcon,
    'building-02': Building02Icon,
    'shopping-bag': ShoppingBagIcon,
    'camera': CameraIcon,
    'music': MusicIcon,
    'film': FilmIcon,
    'dumbbell': DumbbellIcon,
    'tree': TreeIcon,
    'waves': WavesIcon,
    'landmark': LandmarkIcon,
    'sparkles': SparklesIcon,
    'bread': BreadIcon,
  };

  return iconMap[iconName] || null;
}

