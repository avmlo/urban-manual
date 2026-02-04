/**
 * Integration utilities for Discovery Engine
 * Provides helper functions for integrating Discovery Engine into existing components
 */

import { getDiscoveryEngineService } from '@/services/search/discovery-engine';
import { getFeatureFlags, getABTestVariant } from '@/lib/discovery-engine/feature-flags';
import { withCache, getDiscoveryEngineCache } from '@/lib/discovery-engine/cache';

export interface SearchOptions {
  query: string;
  userId?: string;
  city?: string;
  category?: string;
  priceLevel?: number;
  minRating?: number;
  pageSize?: number;
  pageToken?: string;
  useCache?: boolean;
}

export interface SearchResult {
  results: any[];
  totalSize: number;
  nextPageToken?: string;
  query: string;
  source: 'discovery_engine' | 'supabase' | 'fallback';
}

/**
 * Unified search function that handles Discovery Engine with fallback
 */
export async function unifiedSearch(options: SearchOptions): Promise<SearchResult> {
  const {
    query,
    userId,
    city,
    category,
    priceLevel,
    minRating,
    pageSize = 20,
    pageToken,
    useCache = true,
  } = options;

  const discoveryEngine = getDiscoveryEngineService();
  const flags = getFeatureFlags();

  // Check A/B test assignment
  let useDiscoveryEngine = flags.useDiscoveryEngine;
  if (userId && flags.abTests.some((t) => t.name === 'search_quality' && t.enabled)) {
    const variant = getABTestVariant(userId, 'search_quality');
    useDiscoveryEngine = variant === 'discovery_engine';
  }

  // Try Discovery Engine if enabled and available
  if (useDiscoveryEngine && discoveryEngine.isAvailable()) {
    try {
      const cache = getDiscoveryEngineCache();
      const cacheKey = cache.generateSearchKey(query, { city, category, priceLevel, minRating }, userId);

      const searchFn = () =>
        discoveryEngine.search(query, {
          userId,
          pageSize,
          pageToken,
          filters: {
            city,
            category,
            priceLevel,
            minRating,
          },
          boostSpec: [
            {
              condition: 'michelin_stars > 0',
              boost: 1.5,
            },
            {
              condition: 'rating >= 4.5',
              boost: 1.2,
            },
          ],
        });

      const results = useCache
        ? await withCache(cacheKey, searchFn, 5 * 60 * 1000)
        : await searchFn();

      return {
        results: results.results,
        totalSize: results.totalSize,
        nextPageToken: results.nextPageToken,
        query,
        source: 'discovery_engine',
      };
    } catch (error: any) {
      console.warn('Discovery Engine search failed, falling back:', error);
      // Fall through to fallback
    }
  }

  // Fallback to Supabase search
  return {
    results: [],
    totalSize: 0,
    query,
    source: 'fallback',
  };
}

/**
 * Get recommendations with fallback
 */
export async function unifiedRecommendations(
  userId: string,
  options: {
    city?: string;
    category?: string;
    pageSize?: number;
    useCache?: boolean;
  } = {}
): Promise<any[]> {
  const { city, category, pageSize = 10, useCache = true } = options;

  const discoveryEngine = getDiscoveryEngineService();
  const flags = getFeatureFlags();

  if (!flags.enablePersonalization || !discoveryEngine.isAvailable()) {
    return [];
  }

  try {
    const cache = getDiscoveryEngineCache();
    const cacheKey = cache.generateRecommendationKey(userId, { city, category });

    const recommendFn = () =>
      discoveryEngine.recommend(userId, {
        pageSize,
        filters: {
          city,
          category,
        },
      });

    const recommendations = useCache
      ? await withCache(cacheKey, recommendFn, 10 * 60 * 1000) // 10 minute cache for recommendations
      : await recommendFn();

    return recommendations;
  } catch (error: any) {
    console.warn('Discovery Engine recommendations failed:', error);
    return [];
  }
}

/**
 * Track user event with automatic fallback handling
 */
export async function trackUserEvent(event: {
  userId: string;
  eventType: 'search' | 'view' | 'click' | 'save' | 'visit';
  documentId?: string;
  searchQuery?: string;
}): Promise<void> {
  const discoveryEngine = getDiscoveryEngineService();
  const flags = getFeatureFlags();

  if (!flags.enablePersonalization || !discoveryEngine.isAvailable()) {
    return; // Silently fail if not configured
  }

  try {
    await discoveryEngine.trackEvent(event);
  } catch (error: any) {
    console.warn('Failed to track user event:', error);
    // Don't throw - event tracking shouldn't break the app
  }
}

/**
 * Check if Discovery Engine features are available
 */
export function isDiscoveryEngineAvailable(): boolean {
  const discoveryEngine = getDiscoveryEngineService();
  const flags = getFeatureFlags();
  return flags.useDiscoveryEngine && discoveryEngine.isAvailable();
}

/**
 * Get feature availability status
 */
export function getFeatureAvailability(): {
  search: boolean;
  recommendations: boolean;
  personalization: boolean;
  conversational: boolean;
  multimodal: boolean;
  naturalLanguage: boolean;
} {
  const flags = getFeatureFlags();
  const discoveryEngine = getDiscoveryEngineService();
  const isAvailable = discoveryEngine.isAvailable();

  return {
    search: flags.useDiscoveryEngine && isAvailable,
    recommendations: flags.enablePersonalization && isAvailable,
    personalization: flags.enablePersonalization && isAvailable,
    conversational: flags.useConversationalSearch && isAvailable,
    multimodal: flags.useMultimodalSearch && isAvailable,
    naturalLanguage: flags.useNaturalLanguageFilters && isAvailable,
  };
}

