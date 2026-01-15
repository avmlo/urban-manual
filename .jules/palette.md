## 2026-01-15 - Hidden Text Labels
**Learning:** Responsive buttons that hide text (e.g., `hidden sm:inline`) become icon-only on mobile, losing their accessible name if it was only provided via text content.
**Action:** Always add `aria-label` to buttons that might hide their text label on smaller screens, ensuring the label matches the visual text.
