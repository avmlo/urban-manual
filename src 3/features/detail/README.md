# Detail Feature Module

## Overview
The detail feature module contains all UI components and logic related to destination detail pages and drawers.

## Components

### `DestinationDrawer.tsx`
Full-featured destination detail drawer/sidebar component.

**Features:**
- Destination information display
- Save/visit functionality
- Recommendations integration
- Google Maps integration
- Share functionality
- Lists management
- Visit history with ratings

**Usage:**
```tsx
import { DestinationDrawer } from '@/src/features/detail/DestinationDrawer';

// Dynamically imported for code-splitting
const DestinationDrawer = dynamic(
  () => import('@/src/features/detail/DestinationDrawer').then(mod => ({ default: mod.DestinationDrawer })),
  { ssr: false, loading: () => null }
);

<DestinationDrawer
  destination={destination}
  isOpen={isDrawerOpen}
  onClose={() => setIsDrawerOpen(false)}
  onSaveToggle={handleSave}
  onVisitToggle={handleVisit}
/>
```

### `RelatedDestinations.tsx`
Displays similar and complementary destinations based on destination relationships.

**Features:**
- Similar vibe destinations
- Complementary destinations (pair with)
- Semantic similarity scoring
- Co-visitation relationships

**Usage:**
```tsx
import { RelatedDestinations } from '@/src/features/detail/RelatedDestinations';

<RelatedDestinations destinationId={destination.id.toString()} />
```

### `DetailSkeleton.tsx`
Loading skeleton for destination detail pages.

**Usage:**
```tsx
import DetailSkeleton from '@/src/features/detail/DetailSkeleton';

<Suspense fallback={<DetailSkeleton />}>
  <DestinationPageClient />
</Suspense>
```

## Code Splitting

All detail components are dynamically imported to ensure optimal bundle size:
- `DestinationDrawer` is lazy-loaded (large component with many dependencies)
- `RelatedDestinations` can be lazy-loaded for below-the-fold content
- Skeleton components are small and loaded immediately

## Dependencies

- `@/components/VisitModal` - Visit confirmation modal
- `@/components/GoogleMap` - Map integration
- `@/lib/analytics/track` - Event tracking
- `@/lib/supabase` - Data fetching

## Future Enhancements

- [ ] Image gallery with lightbox
- [ ] Reviews integration
- [ ] Social sharing with preview cards
- [ ] Save to lists with quick actions
- [ ] Related itineraries suggestions
