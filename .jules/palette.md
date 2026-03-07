## 2026-02-01 - Accessible Icon Buttons
**Learning:** Native `title` attributes on icon-only buttons are insufficient for accessibility and consistent UI. Radix UI's `Tooltip` component provides a robust, accessible alternative that integrates well with screen readers (via `aria-describedby` logic) while allowing for consistent styling.
**Action:** When encountering icon-only buttons using `title`, refactor them to use the `@/ui/tooltip` component pattern, ensuring `aria-label` is preserved on the trigger for screen reader redundancy where appropriate.
