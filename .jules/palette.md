## 2025-02-23 - Accessibility of Hidden Card Actions
**Learning:** Interactive elements that are visually hidden until hover (like Quick Actions on cards) are inaccessible to keyboard users unless they also appear on focus. Using `opacity-0` alone hides them from sight but leaves them in the tab order, confusing users who focus on invisible elements.
**Action:** Always pair `group-hover:opacity-100` with `group-focus-within:opacity-100` (and `translate` transforms) on the container to ensure controls become visible when any element inside the card receives keyboard focus.
