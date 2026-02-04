/**
 * Performance monitoring for Discovery Engine
 */

interface PerformanceMetric {
  endpoint: string;
  method: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics: number = 1000;

  /**
   * Record a performance metric
   */
  record(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    this.metrics.push({
      ...metric,
      timestamp: Date.now(),
    });

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get performance stats
   */
  getStats(timeWindow?: number): {
    totalRequests: number;
    successRate: number;
    averageDuration: number;
    p50: number;
    p95: number;
    p99: number;
    errors: number;
  } {
    let filteredMetrics = this.metrics;

    if (timeWindow) {
      const cutoff = Date.now() - timeWindow;
      filteredMetrics = this.metrics.filter((m) => m.timestamp >= cutoff);
    }

    if (filteredMetrics.length === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        averageDuration: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        errors: 0,
      };
    }

    const durations = filteredMetrics.map((m) => m.duration).sort((a, b) => a - b);
    const successes = filteredMetrics.filter((m) => m.success).length;
    const errors = filteredMetrics.filter((m) => !m.success).length;

    return {
      totalRequests: filteredMetrics.length,
      successRate: successes / filteredMetrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50: durations[Math.floor(durations.length * 0.5)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
      errors,
    };
  }

  /**
   * Get metrics by endpoint
   */
  getMetricsByEndpoint(endpoint: string, timeWindow?: number): PerformanceMetric[] {
    let filtered = this.metrics.filter((m) => m.endpoint === endpoint);

    if (timeWindow) {
      const cutoff = Date.now() - timeWindow;
      filtered = filtered.filter((m) => m.timestamp >= cutoff);
    }

    return filtered;
  }

  /**
   * Clear old metrics
   */
  clear(olderThan?: number): void {
    if (olderThan) {
      const cutoff = Date.now() - olderThan;
      this.metrics = this.metrics.filter((m) => m.timestamp >= cutoff);
    } else {
      this.metrics = [];
    }
  }
}

// Singleton instance
let monitorInstance: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!monitorInstance) {
    monitorInstance = new PerformanceMonitor();
  }
  return monitorInstance;
}

/**
 * Performance monitoring middleware
 */
export async function withPerformanceMonitoring<T>(
  endpoint: string,
  method: string,
  fn: () => Promise<T>
): Promise<T> {
  const monitor = getPerformanceMonitor();
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    monitor.record({
      endpoint,
      method,
      duration,
      success: true,
    });

    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;

    monitor.record({
      endpoint,
      method,
      duration,
      success: false,
      error: error.message,
    });

    throw error;
  }
}

