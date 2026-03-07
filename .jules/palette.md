## 2026-01-23 - Missing Form Labels
**Learning:** Found multiple form inputs (selects) in search filters without associated labels, violating WCAG 4.1.2. Visually adjacent labels were not programmatically linked.
**Action:** Use `React.useId()` to generate unique IDs and strictly enforce `htmlFor`/`id` pairing or `aria-labelledby` for all form controls.
