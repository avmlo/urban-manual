import { useEffect, useState } from 'react';

interface RecentlyViewedItem {
  slug: string;
  name: string;
  city: string;
  image: string;
  category: string;
  michelin_stars?: number;
  viewedAt: number;
}

const MAX_RECENT_ITEMS = 12;
const STORAGE_KEY = 'recentlyViewed';

export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentlyViewed(parsed);
      }
    } catch (error) {
      console.error('Failed to load recently viewed:', error);
    }
  }, []);

  const addToRecentlyViewed = (item: Omit<RecentlyViewedItem, 'viewedAt'>) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let items: RecentlyViewedItem[] = stored ? JSON.parse(stored) : [];

      // Remove if already exists (to update timestamp)
      items = items.filter(i => i.slug !== item.slug);

      // Add to beginning with current timestamp
      items.unshift({
        ...item,
        viewedAt: Date.now()
      });

      // Keep only MAX_RECENT_ITEMS
      items = items.slice(0, MAX_RECENT_ITEMS);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      setRecentlyViewed(items);
    } catch (error) {
      console.error('Failed to add to recently viewed:', error);
    }
  };

  const clearRecentlyViewed = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setRecentlyViewed([]);
    } catch (error) {
      console.error('Failed to clear recently viewed:', error);
    }
  };

  return {
    recentlyViewed,
    addToRecentlyViewed,
    clearRecentlyViewed
  };
}
