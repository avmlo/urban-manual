## 2025-02-02 - Component Duplication Risks
**Learning:** Found duplicate components (`components/SearchFilters.tsx` and `src/features/search/SearchFilters.tsx`) where the newer/feature version was accessible but the older one in `components/` had accessibility gaps (missing ARIA labels).
**Action:** When auditing components, always check for feature-specific overrides or duplicates in `src/features` to ensure fixes are applied to the active code or that legacy code is deprecated.
