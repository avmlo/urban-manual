## 2025-02-18 - [Parallelizing tRPC Backend]
**Learning:** Sequential DB and API calls in tRPC routers can be a major bottleneck. Parallelizing them using `Promise.all` is effective, but care must be taken with Foreign Key constraints (e.g., creating a session before inserting a message).
**Action:** Always check for FK dependencies before blindly parallelizing DB writes. Group independent reads with writes where possible.
