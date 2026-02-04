/**
 * Caching layer for Discovery Engine API calls
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class DiscoveryEngineCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached value
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached value
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Generate cache key for search
   */
  generateSearchKey(query: string, filters: any, userId?: string): string {
    const filterStr = JSON.stringify(filters || {});
    return `search:${query}:${filterStr}:${userId || 'anonymous'}`;
  }

  /**
   * Generate cache key for recommendations
   */
  generateRecommendationKey(userId: string, filters: any): string {
    const filterStr = JSON.stringify(filters || {});
    return `recommendations:${userId}:${filterStr}`;
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache stats
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
let cacheInstance: DiscoveryEngineCache | null = null;

export function getDiscoveryEngineCache(): DiscoveryEngineCache {
  if (!cacheInstance) {
    cacheInstance = new DiscoveryEngineCache();
    
    // Clear expired entries every minute
    setInterval(() => {
      cacheInstance?.clearExpired();
    }, 60 * 1000);
  }
  return cacheInstance;
}

/**
 * Cache wrapper for async functions
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cache = getDiscoveryEngineCache();
  const cached = cache.get<T>(key);
  
  if (cached !== null) {
    return cached;
  }

  const result = await fn();
  cache.set(key, result, ttl);
  return result;
}

