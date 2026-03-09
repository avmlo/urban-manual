import { useState, useEffect, RefObject } from 'react';

/**
 * Shared IntersectionObserver manager to prevent creating too many observer instances
 * which can cause performance issues and memory leaks.
 */

// We track observers by their options stringified
const observers = new Map<string, IntersectionObserver>();
const listeners = new Map<Element, (entry: IntersectionObserverEntry) => void>();

function getObserver(options: IntersectionObserverInit): IntersectionObserver {
  const optionsKey = JSON.stringify(options);

  if (observers.has(optionsKey)) {
    return observers.get(optionsKey)!;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const listener = listeners.get(entry.target);
      if (listener && entry.isIntersecting) {
        listener(entry);
      }
    });
  }, options);

  observers.set(optionsKey, observer);
  return observer;
}

interface UseInViewOptions extends IntersectionObserverInit {
  once?: boolean;
}

/**
 * Hook to track if an element is in the viewport using a shared IntersectionObserver.
 *
 * @param ref - Ref to the element to observe
 * @param options - IntersectionObserver options + once flag
 * @returns boolean - true if the element is in view
 */
export function useInView(
  ref: RefObject<Element | null>,
  { once = true, rootMargin = '50px', threshold = 0.1, ...opts }: UseInViewOptions = {}
) {
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (once && isInView) return;

    const observer = getObserver({ rootMargin, threshold, ...opts });

    const handleIntersect = () => {
      setIsInView(true);
      if (once) {
        listeners.delete(element);
        observer.unobserve(element);
      }
    };

    listeners.set(element, handleIntersect);
    observer.observe(element);

    return () => {
      listeners.delete(element);
      observer.unobserve(element);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, rootMargin, threshold, JSON.stringify(opts), isInView, once]);

  return isInView;
}
