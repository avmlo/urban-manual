# Bolt's Journal

## 2025-02-05 - React.memo Optimization Pattern
**Learning:** `React.memo` components like `DestinationCard` are ineffective if parent components pass inline arrow functions (e.g., `onClick={() => ...}`). This creates a new function reference on every render, invalidating the memoization.
**Action:** Always use stable callbacks (via `useCallback`) or specialized props (like `onSelect` taking an ID/Object) to pass handlers to memoized components. Avoid `onClick={() => handler(item)}` in lists.
