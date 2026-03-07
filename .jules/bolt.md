## 2024-05-22 - Client-Side API Deduplication
**Learning:** Even with `React.memo` and other React optimizations, components that fetch data in `useEffect` on mount will trigger N requests if rendered N times simultaneously (e.g., in a list).
**Action:** When components in a list need the *same* global data (like trending stats), implement a module-level request cache (promise sharing) to deduplicate simultaneous requests into a single network call. This reduced 20-30 requests to `/api/ml/forecast/trending` down to 1 on the homepage.
