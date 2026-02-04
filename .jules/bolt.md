## 2025-02-18 - HomePageClient Grid Optimization
**Learning:** The `HomePageClient` component was recalculating the entire destination grid (filtering, sorting, pagination) on every render, including on every keystroke in the search bar (before debounce), causing unnecessary re-renders of all `DestinationCard` components.
**Action:** Lifted expensive grid calculations (`displayDestinations`, `paginatedDestinations`) into `useMemo` and memoized the `renderItem` callback with `useCallback` to ensure referential stability for `UniversalGrid`.

## 2025-02-18 - CSS Parsing Strictness
**Learning:** Next.js/Turbopack is strict about CSS syntax. `@import` statements must be at the very top of `globals.css` (before any other rules). Pseudo-element selectors must have the class before the pseudo-element (e.g., `.class::view-transition-old(root)` instead of `::view-transition-old(root).class`).
**Action:** Always verify `globals.css` structure when encountering "Parsing CSS source code failed" errors.
