'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface ItineraryItem {
  listingId: string;
  listingSlug: string;
  listingName: string;
  listingImage?: string;
  listingCity?: string;
  date: string | null; // ISO date string or null
  time?: string; // Optional time (HH:mm)
  notes?: string;
}

interface ItineraryContextType {
  items: ItineraryItem[];
  addItem: (item: Omit<ItineraryItem, 'date'>) => void;
  removeItem: (listingId: string) => void;
  updateItem: (listingId: string, updates: Partial<ItineraryItem>) => void;
  clearItinerary: () => void;
  hasItem: (listingId: string) => boolean;
}

const ItineraryContext = createContext<ItineraryContextType | undefined>(undefined);

const STORAGE_KEY = 'urban-manual-itinerary';

export function ItineraryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItineraryItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure dates are strings (localStorage doesn't preserve Date objects)
        const normalized = parsed.map((item: ItineraryItem) => ({
          ...item,
          date: item.date || null,
        }));
        setItems(normalized);
      }
    } catch (error) {
      console.error('Error loading itinerary from localStorage:', error);
    }
  }, []);

  // Save to localStorage whenever items change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving itinerary to localStorage:', error);
    }
  }, [items]);

  const addItem = (item: Omit<ItineraryItem, 'date'>) => {
    setItems(prev => {
      // Check if item already exists
      if (prev.some(i => i.listingId === item.listingId || i.listingSlug === item.listingSlug)) {
        return prev; // Don't add duplicates
      }
      return [...prev, { ...item, date: null }];
    });
  };

  const removeItem = (listingId: string) => {
    setItems(prev => prev.filter(item => item.listingId !== listingId && item.listingSlug !== listingId));
  };

  const updateItem = (listingId: string, updates: Partial<ItineraryItem>) => {
    setItems(prev =>
      prev.map(item =>
        (item.listingId === listingId || item.listingSlug === listingId)
          ? { ...item, ...updates }
          : item
      )
    );
  };

  const clearItinerary = () => {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const hasItem = (listingId: string) => {
    return items.some(item => item.listingId === listingId || item.listingSlug === listingId);
  };

  return (
    <ItineraryContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateItem,
        clearItinerary,
        hasItem,
      }}
    >
      {children}
    </ItineraryContext.Provider>
  );
}

export function useItinerary() {
  const context = useContext(ItineraryContext);
  if (context === undefined) {
    throw new Error('useItinerary must be used within an ItineraryProvider');
  }
  return context;
}

