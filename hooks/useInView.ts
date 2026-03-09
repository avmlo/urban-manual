import { useEffect, useState, useRef } from 'react';

type ObserverOptions = {
  rootMargin?: string;
  threshold?: number | number[];
  triggerOnce?: boolean;
};

// Map of observer keys (config) to Observer instances
const observers = new Map<string, IntersectionObserver>();

// Map of Elements to a Map of Observer instances to their callbacks
// This allows an element to be observed by multiple observers (different configs)
const listeners = new Map<Element, Map<IntersectionObserver, (entry: IntersectionObserverEntry) => void>>();

const getObserverKey = (options: IntersectionObserverInit) => {
  const thresholdKey = Array.isArray(options.threshold)
    ? options.threshold.join(',')
    : options.threshold;
  return `${options.rootMargin || '0px'}-${thresholdKey || 0}`;
};

const getObserver = (options: IntersectionObserverInit) => {
  const key = getObserverKey(options);
  if (observers.has(key)) return observers.get(key)!;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      // Get all listeners for this element
      const elementListeners = listeners.get(entry.target);
      if (elementListeners) {
        // Get the specific callback for THIS observer instance
        const callback = elementListeners.get(observer);
        if (callback) {
          callback(entry);
        }
      }
    });
  }, options);

  observers.set(key, observer);
  return observer;
};

/**
 * Hook to track if an element is in the viewport using a shared IntersectionObserver.
 * This is more efficient than creating a new observer for each element.
 */
export function useInView(options: ObserverOptions = {}) {
  const { rootMargin = '0px', threshold = 0, triggerOnce = false } = options;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof window === 'undefined') return;

    // Check if browser supports IntersectionObserver
    if (!('IntersectionObserver' in window)) {
      const timer = setTimeout(() => setInView(true), 0);
      return () => clearTimeout(timer);
    }

    const observer = getObserver({ rootMargin, threshold });

    const handleIntersect = (entry: IntersectionObserverEntry) => {
      const isIntersecting = entry.isIntersecting;

      if (isIntersecting) {
        setInView(true);
        if (triggerOnce) {
          // Cleanup this specific listener
          const elementListeners = listeners.get(element);
          if (elementListeners) {
            elementListeners.delete(observer);
            if (elementListeners.size === 0) {
              listeners.delete(element);
            }
          }
          observer.unobserve(element);
        }
      } else if (!triggerOnce) {
        setInView(false);
      }
    };

    // Register listener
    let elementListeners = listeners.get(element);
    if (!elementListeners) {
      elementListeners = new Map();
      listeners.set(element, elementListeners);
    }
    elementListeners.set(observer, handleIntersect);

    observer.observe(element);

    return () => {
      // Cleanup listener
      const elementListeners = listeners.get(element);
      if (elementListeners) {
        elementListeners.delete(observer);
        if (elementListeners.size === 0) {
          listeners.delete(element);
        }
      }
      observer.unobserve(element);

      // We don't clean up the observer itself as it's shared
      // This is intentional for performance
    };
  }, [rootMargin, threshold, triggerOnce]);

  return { ref, inView };
}
