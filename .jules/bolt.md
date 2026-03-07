# Bolt's Journal

## 2025-02-09 - ClientDestinationGrid Virtualization
**Learning:** Virtualization is not always the answer. In this case, `ClientDestinationGrid` uses pagination (4 rows per page), so the number of items rendered is small (likely ~20-30). Virtualization adds complexity with height calculations and scroll listeners which might be overkill and potentially buggy if not needed.
**Action:** Focus on standard optimization like `React.memo` or image optimization instead of forcing virtualization where pagination exists.

**Learning:** `DestinationCard` is already using `React.memo`.
**Action:** Check if `DestinationCard` props are stable. `onClick` is an arrow function in `ClientDestinationGrid.tsx`, which breaks memoization.

## 2025-02-09 - Stable Callbacks
**Learning:** Passing inline arrow functions to memoized components breaks memoization.
**Action:** Use `useCallback` for event handlers passed to memoized components.
