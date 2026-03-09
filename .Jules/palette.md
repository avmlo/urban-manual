## 2024-05-23 - Accessibility of Interactive Icons
**Learning:** Icon-only buttons often slip through accessibility checks because they look "clean" but are invisible to screen readers without explicit labeling. In client-side lists like `CollectionsManager`, these buttons (e.g., "Close", "Delete") need both `aria-label` for screen readers and `Tooltip` for mouse users to explain the icon's meaning.
**Action:** Always wrap `size="icon"` buttons in a `Tooltip` and ensure they have a descriptive `aria-label`. Double-check client-side list renderings for these patterns.
