## 2025-05-20 - Explicit Label Association
**Learning:** Implicit label association (nesting input inside label) is sometimes missing or insufficient for screen readers when layout requires separation. Explicit `htmlFor`/`id` association is robust and explicit.
**Action:** Always check `SearchFilters` and similar form components for missing `id` on inputs and `htmlFor` on labels. Use `React.useId()` for generating stable, unique IDs.
