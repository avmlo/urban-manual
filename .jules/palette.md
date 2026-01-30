## 2025-02-27 - Accessible Tooltips for Icon-Only Buttons
**Learning:** Icon-only buttons using native `title` attributes provide poor accessibility and inconsistent styling. The project prefers Radix UI `Tooltip` components (`@/ui/tooltip`) which offer better keyboard support, customization, and screen reader integration.
**Action:** When encountering icon-only buttons with `title` attributes (e.g., in `QuickActions`), replace them with `Tooltip` wrappers, ensuring `aria-label` is preserved on the button for direct accessibility.
