## 2025-01-25 - The "Editorial" Trap
**Learning:** Arbitrary pixel values (e.g., `text-[17px]`, `text-[15px]`) often creep in when developers aim for an "editorial" look that sits between standard system tokens. This creates maintenance debt and inconsistency.
**Action:** When auditing, check for "editorial" style files that might define these deviations. Replace them with the nearest standard token (e.g., `text-base`) or explicitly add a new token if the semantic need is justified (e.g., `text-editorial-body`), rather than leaving magic numbers in the codebase.
