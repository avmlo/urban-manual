## 2024-05-22 - [Lazy Loading Double Duty]
**Learning:** Next.js `Image` component handles lazy loading natively. Wrapping it in a custom `IntersectionObserver` to conditionally render the component is redundant and adds unnecessary JavaScript overhead, delaying the browser's ability to discover and pre-load the image.
**Action:** Trust Next.js `Image` native lazy loading. Only use `IntersectionObserver` for heavy components *other* than images, or if you need to trigger non-visual logic.

## 2024-05-22 - [Nested Interactive Elements]
**Learning:** Placing interactive elements (like `button`) inside another `button` is invalid HTML and causes hydration mismatches and unpredictable event bubbling behavior.
**Action:** Use `div` with `role="button"` and `tabIndex={0}` (plus keyboard handlers) for the outer container if it needs to contain other interactive elements.
