# Palette's Journal - Critical Learnings

## 2024-05-22 - Admin Interface Accessibility Pattern
**Learning:** Admin-facing components (like MediaLibrary) often prioritize function over accessibility, resulting in many icon-only buttons missing `aria-label`. This is a consistent pattern in "internal tools" vs public-facing pages.
**Action:** When auditing internal tools, specifically target utility bars and data grids for icon-only buttons (copy, edit, delete, view) which are often implemented as quick actions without text labels.
