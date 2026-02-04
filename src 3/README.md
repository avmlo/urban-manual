# Application Features (modeled after apps.apple.com)

Structure:
- features/
  - search/
  - detail/
  - lists/
  - account/
  - admin/
- ui/ (shared components)
- hooks/ (client hooks)
- lib/ (feature-agnostic helpers)

Notes:
- Route shells use Suspense and skeletons.
- Feature modules are code-split and lazy loaded.

