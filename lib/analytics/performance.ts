'use client';

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

export interface PerformanceMetricData {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
  timestamp: number;
  url: string;
}

const METRIC_THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  FID: { good: 100, poor: 300 },
  INP: { good: 200, poor: 500 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
} as const;

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = METRIC_THRESHOLDS[name as keyof typeof METRIC_THRESHOLDS];
  if (!thresholds) return 'good';

  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

function formatMetric(metric: Metric): PerformanceMetricData {
  return {
    name: metric.name,
    value: metric.value,
    rating: getRating(metric.name, metric.value),
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType || 'unknown',
    timestamp: Date.now(),
    url: typeof window !== 'undefined' ? window.location.pathname : '',
  };
}

async function sendMetricToBackend(metricData: PerformanceMetricData): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // Use sendBeacon for reliable delivery even on page unload
    const data = JSON.stringify(metricData);
    const beaconSent = navigator.sendBeacon('/api/analytics/metrics', data);

    // Fallback to fetch if sendBeacon fails
    if (!beaconSent) {
      await fetch('/api/analytics/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true,
      });
    }
  } catch (error) {
    console.warn('[Performance] Failed to send metric:', error);
  }
}

function handleMetric(metric: Metric): void {
  const metricData = formatMetric(metric);

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vital] ${metric.name}:`, {
      value: metric.value.toFixed(metric.name === 'CLS' ? 3 : 0),
      rating: metricData.rating,
    });
  }

  // Send to backend
  sendMetricToBackend(metricData);
}

/**
 * Initialize Core Web Vitals tracking
 * Call this once in your app layout or root component
 */
export function trackWebVitals(): void {
  if (typeof window === 'undefined') return;

  // Cumulative Layout Shift
  onCLS(handleMetric);

  // First Contentful Paint
  onFCP(handleMetric);

  // Interaction to Next Paint (replaces deprecated FID)
  try {
    onINP(handleMetric);
  } catch (err) {
    console.error('[Web Vitals] INP registration failed', err);
  }

  // Largest Contentful Paint
  onLCP(handleMetric);

  // Time to First Byte
  onTTFB(handleMetric);
}

/**
 * Manual performance measurement for custom operations
 */
export function measurePerformance(
  name: string,
  startMark: string,
  endMark?: string
): number | null {
  if (typeof window === 'undefined' || !window.performance) return null;

  try {
    if (endMark) {
      performance.measure(name, startMark, endMark);
    } else {
      performance.mark(startMark);
      return null;
    }

    const entries = performance.getEntriesByName(name, 'measure');
    const lastEntry = entries[entries.length - 1];

    if (lastEntry) {
      sendMetricToBackend({
        name: `custom.${name}`,
        value: lastEntry.duration,
        rating: lastEntry.duration < 100 ? 'good' : lastEntry.duration < 500 ? 'needs-improvement' : 'poor',
        delta: lastEntry.duration,
        id: `${name}-${Date.now()}`,
        navigationType: 'custom',
        timestamp: Date.now(),
        url: window.location.pathname,
      });

      return lastEntry.duration;
    }
  } catch (error) {
    console.warn('[Performance] Failed to measure:', error);
  }

  return null;
}

/**
 * Track API response time
 */
export function trackApiPerformance(
  endpoint: string,
  duration: number,
  status: number
): void {
  if (typeof window === 'undefined') return;

  sendMetricToBackend({
    name: 'api.response',
    value: duration,
    rating: duration < 200 ? 'good' : duration < 1000 ? 'needs-improvement' : 'poor',
    delta: duration,
    id: `api-${Date.now()}`,
    navigationType: 'api',
    timestamp: Date.now(),
    url: endpoint,
  });
}

/**
 * Performance observer for resource loading
 */
export function observeResourceTiming(): void {
  if (typeof window === 'undefined' || !window.PerformanceObserver) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resourceEntry = entry as PerformanceResourceTiming;

        // Only track slow resources (>500ms)
        if (resourceEntry.duration > 500) {
          sendMetricToBackend({
            name: 'resource.slow',
            value: resourceEntry.duration,
            rating: 'poor',
            delta: resourceEntry.duration,
            id: `resource-${Date.now()}`,
            navigationType: 'resource',
            timestamp: Date.now(),
            url: resourceEntry.name,
          });
        }
      }
    });

    observer.observe({ type: 'resource', buffered: true });
  } catch (error) {
    console.warn('[Performance] Failed to observe resources:', error);
  }
}
