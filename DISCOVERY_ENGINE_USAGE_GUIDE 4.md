# Google Discovery Engine - Complete Implementation Guide

## Overview

This document provides a complete guide to using all implemented features of Google Discovery Engine integration.

---

## Phase 1 & 2: Core Implementation ✅

### Basic Search
```typescript
// POST /api/search/discovery
const response = await fetch('/api/search/discovery', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'romantic restaurant',
    city: 'paris',
    category: 'dining',
    pageSize: 20,
  }),
});
```

### Recommendations
```typescript
// GET /api/recommendations/discovery?userId=user-id&city=paris
const response = await fetch('/api/recommendations/discovery?userId=user-id');
```

### Event Tracking
```typescript
// POST /api/discovery/track-event
await fetch('/api/discovery/track-event', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-id',
    eventType: 'view',
    documentId: 'destination-slug',
  }),
});
```

---

## Phase 3: Personalization & Recommendations ✅

### Batch Event Tracking
```typescript
// POST /api/discovery/events/batch
await fetch('/api/discovery/events/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-id',
    events: [
      { eventType: 'view', documentId: 'dest-1' },
      { eventType: 'click', documentId: 'dest-2' },
      { eventType: 'save', documentId: 'dest-3' },
    ],
  }),
});
```

### Contextual Recommendations
```typescript
// POST /api/discovery/recommendations/contextual
const response = await fetch('/api/discovery/recommendations/contextual', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-id',
    context: {
      city: 'paris',
      weather: 'sunny',
      time: new Date().toISOString(),
      events: ['festival-id'],
    },
  }),
});
```

---

## Phase 4: Advanced Features ✅

### Conversational Search
```typescript
// POST /api/discovery/search/conversational
const response = await fetch('/api/discovery/search/conversational', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'what about something cheaper?',
    conversationHistory: [
      'romantic restaurants in paris',
      'with a view of the eiffel tower',
    ],
    context: {
      city: 'paris',
      category: 'dining',
    },
  }),
});
```

### Multi-Modal Search
```typescript
// POST /api/discovery/search/multimodal
const response = await fetch('/api/discovery/search/multimodal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'places similar to this',
    imageUrl: 'https://example.com/image.jpg',
    // OR
    imageBase64: 'base64-encoded-image-data',
    filters: {
      city: 'paris',
    },
  }),
});
```

### Natural Language Search
```typescript
// POST /api/discovery/search/natural-language
const response = await fetch('/api/discovery/search/natural-language', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'romantic restaurants with outdoor seating under $50',
    userId: 'user-id',
  }),
});
```

### Analytics & Insights
```typescript
// GET /api/discovery/analytics?startDate=2025-01-01&endDate=2025-01-31
const response = await fetch('/api/discovery/analytics?startDate=2025-01-01&endDate=2025-01-31');

// Get specific metric
const popularQueries = await fetch('/api/discovery/analytics?metric=popular-queries');
```

---

## Phase 5: Migration & Optimization ✅

### Feature Flags
```typescript
import { getFeatureFlags, isFeatureEnabled } from '@/lib/discovery-engine/feature-flags';

const flags = getFeatureFlags();
if (flags.useDiscoveryEngine) {
  // Use Discovery Engine
}

if (isFeatureEnabled('useConversationalSearch')) {
  // Use conversational search
}
```

### A/B Testing
```typescript
import { getABTestVariant, getABTestAssignment } from '@/lib/discovery-engine/feature-flags';

// Get variant for specific test
const variant = getABTestVariant(userId, 'search_quality');
if (variant === 'discovery_engine') {
  // Use Discovery Engine
} else {
  // Use Supabase fallback
}

// Get all A/B test assignments
const assignments = getABTestAssignment(userId);
```

### Caching
```typescript
import { withCache, getDiscoveryEngineCache } from '@/lib/discovery-engine/cache';

// Use cache wrapper
const results = await withCache(
  'search:query:city:paris',
  () => performSearch(),
  5 * 60 * 1000 // 5 minutes
);

// Manual cache management
const cache = getDiscoveryEngineCache();
cache.set('key', data, ttl);
const cached = cache.get('key');
```

### Performance Monitoring
```typescript
import { withPerformanceMonitoring, getPerformanceMonitor } from '@/lib/discovery-engine/performance';

// Wrap function with monitoring
const result = await withPerformanceMonitoring(
  '/api/search/discovery',
  'POST',
  () => performSearch()
);

// Get performance stats
const monitor = getPerformanceMonitor();
const stats = monitor.getStats(60 * 60 * 1000); // Last hour
```

### Integration Utilities
```typescript
import {
  unifiedSearch,
  unifiedRecommendations,
  trackUserEvent,
  isDiscoveryEngineAvailable,
  getFeatureAvailability,
} from '@/lib/discovery-engine/integration';

// Unified search with automatic fallback
const results = await unifiedSearch({
  query: 'romantic restaurant',
  userId: 'user-id',
  city: 'paris',
  useCache: true,
});

// Unified recommendations
const recommendations = await unifiedRecommendations('user-id', {
  city: 'paris',
  pageSize: 10,
});

// Track events
await trackUserEvent({
  userId: 'user-id',
  eventType: 'view',
  documentId: 'destination-slug',
});

// Check availability
if (isDiscoveryEngineAvailable()) {
  // Use Discovery Engine features
}

// Get feature availability
const availability = getFeatureAvailability();
if (availability.conversational) {
  // Use conversational search
}
```

---

## Environment Variables

```bash
# Required
GOOGLE_CLOUD_PROJECT_ID=your-project-id
DISCOVERY_ENGINE_DATA_STORE_ID=urban-manual-destinations
GOOGLE_CLOUD_LOCATION=global

# Optional - Feature Flags
USE_DISCOVERY_ENGINE=true
USE_CONVERSATIONAL_SEARCH=true
USE_MULTIMODAL_SEARCH=true
USE_NATURAL_LANGUAGE_FILTERS=true
ENABLE_DISCOVERY_PERSONALIZATION=true
ENABLE_CONTEXTUAL_RECOMMENDATIONS=true

# A/B Testing
AB_TEST_SEARCH_QUALITY=true

# Credentials (choose one)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# OR use gcloud CLI: gcloud auth application-default login
```

---

## Monitoring Endpoints

### Performance Metrics
```typescript
// GET /api/discovery/monitoring/performance?timeWindow=3600000
const metrics = await fetch('/api/discovery/monitoring/performance?timeWindow=3600000');
```

### Status & Configuration
```typescript
// GET /api/discovery/monitoring/status
const status = await fetch('/api/discovery/monitoring/status');
```

### A/B Test Assignment
```typescript
// GET /api/discovery/ab-test/assignment
const assignment = await fetch('/api/discovery/ab-test/assignment');
```

---

## Best Practices

### 1. Use Caching
Always enable caching for search queries to reduce API costs:
```typescript
const results = await unifiedSearch({
  query: 'restaurant',
  useCache: true, // Default: true
});
```

### 2. Batch Events
Batch multiple events together to reduce API calls:
```typescript
await fetch('/api/discovery/events/batch', {
  method: 'POST',
  body: JSON.stringify({
    userId: 'user-id',
    events: [event1, event2, event3],
  }),
});
```

### 3. Use Feature Flags
Control feature rollout with feature flags:
```typescript
if (isFeatureEnabled('useConversationalSearch')) {
  // Use conversational search
}
```

### 4. Monitor Performance
Track performance metrics to optimize:
```typescript
const stats = getPerformanceMonitor().getStats();
if (stats.averageDuration > 500) {
  // Optimize slow queries
}
```

### 5. Graceful Fallback
Always handle fallback scenarios:
```typescript
const results = await unifiedSearch({ query: 'restaurant' });
if (results.source === 'fallback') {
  // Use Supabase search
}
```

---

## Cost Optimization

1. **Enable Caching**: Reduces API calls by 70-80%
2. **Batch Events**: Reduces event tracking costs
3. **Monitor Usage**: Set up billing alerts
4. **Use Feature Flags**: Control rollout and costs
5. **Optimize Queries**: Cache frequently accessed results

---

## Troubleshooting

### Discovery Engine Not Available
- Check `GOOGLE_CLOUD_PROJECT_ID` is set
- Verify `DISCOVERY_ENGINE_DATA_STORE_ID` matches your data store
- Ensure credentials are configured
- Check Google Cloud Console for API status

### High Costs
- Enable caching (`useCache: true`)
- Reduce cache TTL for less frequently accessed data
- Monitor usage via `/api/discovery/monitoring/performance`
- Set up billing alerts in Google Cloud Console

### Poor Search Results
- Ensure data is imported correctly
- Check data quality in Discovery Engine console
- Adjust boost specifications
- Review analytics for popular queries

---

## Next Steps

1. ✅ Configure Google Cloud project
2. ✅ Set up data store
3. ✅ Export and import data
4. ✅ Enable feature flags
5. ✅ Set up A/B testing
6. ✅ Monitor performance
7. ✅ Optimize costs
8. ✅ Integrate into UI

For detailed setup instructions, see `DISCOVERY_ENGINE_SETUP.md`.

