## 2025-05-23 - React.memo and Inline Callbacks
**Learning:** `React.memo` is ineffective if parent components pass inline functions as props. This is a common performance anti-pattern in React. Specifically, `DestinationCard` (memoized) was re-rendering on every parent render because `onClick` was an inline arrow function.
**Action:** When using `React.memo`, always ensure callback props are referentially stable using `useCallback` or `useMemo`. If the child component needs specific arguments (like an item in a list), pass a generic handler that accepts those arguments, rather than creating a closure for each item. Added `onSelect` prop to `DestinationCard` to support this pattern without breaking existing usage.

## 2025-05-23 - CSS @import Ordering
**Learning:** CSS `@import` rules must strictly precede all other rules (including `:root` variable definitions) in `app/globals.css`. Next.js/Turbopack is strict about this and will fail the build.
**Action:** Always place `@import` statements at the very top of CSS files, before any other content.

## 2025-05-23 - CSS View Transitions Syntax
**Learning:** Pseudo-elements like `::view-transition-old(root)` cannot be followed by class selectors (e.g., `::view-transition-old(root).class` is invalid). The correct syntax is scoping the pseudo-element: `.class::view-transition-old(root)`.
**Action:** Use correct selector scoping for View Transitions API.
