## 2025-02-18 - Built-in Loading States
**Learning:** Users expect immediate feedback when clicking action buttons. Manually composing spinners (e.g., `{isLoading ? <Spinner /> : "Save"}`) is error-prone and leads to inconsistent UI.
**Action:** Adding a native `isLoading` prop to the Button primitive ensures consistent spacing, disabling behavior, and spinner placement across the application, reducing boilerplate for developers and improving the experience for users.
