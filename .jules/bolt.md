## 2026-01-26 - React Memoization & CSS Imports
**Learning:** Inline function props (e.g., `onClick={() => ...}`) break `React.memo` on child components, causing unnecessary re-renders of the entire list when parent state changes. Passing a stable callback (via `useCallback`) and a specific `onSelect` prop allows the child to remain memoized.
**Action:** Always prefer `onSelect={(item) => handleSelect(item)}` pattern where the child passes the item back, or better yet `onSelect={stableHandler}` where the handler is generic, rather than inline closures in `map` loops for heavy list items.

**Learning:** CSS `@import` statements must be strictly at the top of the file. Placing them after comments or other rules causes build failures in Next.js/Turbopack.
**Action:** Ensure `@import` statements in `global.css` are the very first lines of the file.
