## 2024-02-27 - Responsive Icon-Only Buttons
**Learning:** Buttons that hide text labels on mobile (e.g. `hidden sm:inline`) often become inaccessible icon-only buttons on small screens if they lack `aria-label`.
**Action:** Always check responsive utility classes on buttons. If text is hidden on any breakpoint, explicitly add `aria-label`.
