## 2024-05-23 - Memoization Anti-Pattern in Destination Lists
**Learning:** `DestinationCard` was wrapped in `React.memo` but received an inline `onClick={() => ...}` callback in `ClientDestinationGrid`, causing unnecessary re-renders of all cards whenever the grid parent re-rendered (e.g., on filter change).
**Action:** When using `React.memo` on list items, ensure callback props are stable. Added `onSelect` prop to `DestinationCard` to accept a stable callback from the parent, allowing proper memoization.
