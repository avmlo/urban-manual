# Palette's Journal - Critical UX/A11y Learnings

This journal tracks specific UX patterns and accessibility insights for the Urban Manual codebase.

## Format
## YYYY-MM-DD - [Title]
**Learning:** [UX/a11y insight]
**Action:** [How to apply next time]

## 2024-05-22 - Icon-Only Button Accessibility
**Learning:** Multiple admin components (MediaLibrary, DataManager) use icon-only buttons for actions like "Copy", "View", and "Delete" without `aria-label` attributes. This makes the admin interface difficult to navigate for screen reader users.
**Action:** Systematically check all `size="icon"` Button usages. Enforce `aria-label` on all icon-only buttons during code review or creation.
