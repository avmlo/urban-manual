# Google Discovery Engine Integration Plan

## Executive Summary

Google Discovery Engine is an AI-powered semantic search and recommendation API that provides enterprise-grade search capabilities with built-in personalization, natural language understanding, and relevance ranking. This document outlines a comprehensive plan to integrate Discovery Engine into Urban Manual to replace and enhance our current search infrastructure.

---

## What is Google Discovery Engine?

Google Discovery Engine is a managed service that provides:

1. **Semantic Search**: Understands natural language queries and user intent, not just keywords
2. **Personalized Ranking**: Automatically ranks results based on user behavior and preferences
3. **Recommendation Engine**: Provides "recommended for you" suggestions based on user history
4. **Real-Time Learning**: Continuously improves from user interactions (clicks, saves, visits)
5. **Multi-Modal Search**: Supports text, images, and structured data
6. **Enterprise Scale**: Handles millions of documents with sub-100ms response times

### Key Advantages Over Current System

| Current System (Supabase + Custom) | Discovery Engine |
|-----------------------------------|------------------|
| Keyword-based search | Semantic understanding |
| Manual ranking logic | AI-powered relevance |
| Static personalization | Dynamic learning from interactions |
| Separate recommendation system | Unified search + recommendations |
| Manual query optimization | Automatic query understanding |
| Limited to text search | Multi-modal (text, images, structured) |

---

## Why Integrate Discovery Engine?

### 1. **Superior Search Quality**
- Understands complex queries: "romantic dinner spot with a view near the Eiffel Tower"
- Handles typos, synonyms, and natural language variations
- Context-aware results based on conversation history

### 2. **Built-in Personalization**
- Automatically learns from user interactions
- No need to manually build taste profiles (though we can enhance them)
- Real-time adaptation to user preferences

### 3. **Reduced Maintenance**
- Google handles infrastructure, scaling, and optimization
- Automatic updates to search algorithms
- Less custom code to maintain

### 4. **Advanced Features**
- Multi-modal search (text + images)
- Conversational search with context
- A/B testing framework built-in
- Analytics and insights dashboard

### 5. **Cost Efficiency**
- Pay-per-use pricing model
- No infrastructure costs
- Potentially cheaper than maintaining custom search infrastructure at scale

---

## Architecture Overview

### Current Architecture
```
User Query → Intent Analysis → Supabase Vector Search → Custom Ranking → Results
```

### With Discovery Engine
```
User Query → Discovery Engine API → Personalized Results + Recommendations
```

### Hybrid Approach (Recommended)
```
User Query → Intent Analysis → Discovery Engine (primary) → Custom Ranking (enhancement) → Results
```

**Why Hybrid?**
- Keep our custom ranking for specific business logic (Manual Score, editorial boosts)
- Use Discovery Engine for semantic understanding and base relevance
- Best of both worlds: AI-powered search + custom business rules

---

## Implementation Phases

### Phase 1: Setup & Data Migration (Week 1-2)

#### 1.1 Google Cloud Setup
- [ ] Create Google Cloud project (or use existing)
- [ ] Enable Discovery Engine API
- [ ] Set up authentication (Service Account + API Key)
- [ ] Configure IAM roles and permissions
- [ ] Set up billing and quotas

#### 1.2 Data Store Creation
- [ ] Create Data Store in Discovery Engine
- [ ] Define schema for destinations:
  ```json
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "content": "string (full content)",
    "city": "string",
    "category": "string",
    "tags": ["array"],
    "rating": "number",
    "price_level": "number",
    "michelin_stars": "number",
    "coordinates": {"lat": number, "lng": number},
    "images": ["array"],
    "metadata": {
      "trending_score": "number",
      "views_count": "number",
      "saves_count": "number"
    }
  }
  ```

#### 1.3 Data Ingestion
- [ ] Export all destinations from Supabase
- [ ] Transform to Discovery Engine document format
- [ ] Batch import destinations (use `DocumentService.importDocuments`)
- [ ] Set up incremental sync (new/updated destinations)
- [ ] Verify data quality and completeness

**Estimated Time**: 1-2 weeks
**Dependencies**: Google Cloud account, API access

---

### Phase 2: Basic Search Integration (Week 3-4)

#### 2.1 API Integration Service
Create `services/search/discovery-engine.ts`:
```typescript
import { DiscoveryEngineClient } from '@google-cloud/discoveryengine';

export class DiscoveryEngineService {
  private client: DiscoveryEngineClient;
  private dataStorePath: string;

  async search(query: string, userId?: string, filters?: SearchFilters): Promise<SearchResults> {
    // Basic search implementation
  }

  async recommend(userId: string, context?: RecommendationContext): Promise<Recommendations> {
    // Recommendation implementation
  }
}
```

#### 2.2 Search API Endpoint
Create `app/api/search/discovery/route.ts`:
- Replace or augment existing search endpoint
- Support both Discovery Engine and fallback to Supabase
- Feature flag to toggle between systems

#### 2.3 User Event Tracking
- Track user interactions (views, clicks, saves, visits)
- Send events to Discovery Engine for learning
- Implement event batching for performance

**Estimated Time**: 2 weeks
**Dependencies**: Phase 1 complete

---

### Phase 3: Personalization & Recommendations (Week 5-6)

#### 3.1 User Event Collection
- [ ] Implement comprehensive event tracking:
  - Search queries and results clicked
  - Destination views
  - Saves and unsaves
  - Visits (with timestamps)
  - Collection creation
  - Filter usage

#### 3.2 Recommendation API
- [ ] Implement Discovery Engine recommendation endpoints
- [ ] Create personalized "For You" section
- [ ] Context-aware recommendations (time, location, weather)
- [ ] "Similar to" recommendations

#### 3.3 A/B Testing Framework
- [ ] Set up A/B tests for search quality
- [ ] Compare Discovery Engine vs. current system
- [ ] Measure metrics: CTR, engagement, satisfaction

**Estimated Time**: 2 weeks
**Dependencies**: Phase 2 complete, user event data

---

### Phase 4: Advanced Features (Week 7-8)

#### 4.1 Conversational Search
- [ ] Multi-turn conversation support
- [ ] Context preservation across queries
- [ ] Clarification questions ("Did you mean...?")

#### 4.2 Multi-Modal Search
- [ ] Image-based search ("Find places that look like this")
- [ ] Visual similarity matching
- [ ] Style-based recommendations

#### 4.3 Advanced Filtering
- [ ] Natural language filters ("under $50", "open now", "with parking")
- [ ] Complex queries ("romantic restaurants with outdoor seating near museums")
- [ ] Filter suggestions based on query

#### 4.4 Analytics & Insights
- [ ] Search analytics dashboard
- [ ] Popular queries and trends
- [ ] User behavior insights
- [ ] Performance monitoring

**Estimated Time**: 2 weeks
**Dependencies**: Phase 3 complete

---

### Phase 5: Migration & Optimization (Week 9-10)

#### 5.1 Gradual Migration
- [ ] Feature flag for gradual rollout
- [ ] Monitor performance and errors
- [ ] Collect user feedback
- [ ] Adjust ranking weights and filters

#### 5.2 Performance Optimization
- [ ] Implement caching layer
- [ ] Optimize query patterns
- [ ] Reduce API calls with batching
- [ ] Implement request deduplication

#### 5.3 Cost Optimization
- [ ] Monitor API usage and costs
- [ ] Implement rate limiting
- [ ] Cache frequently accessed results
- [ ] Optimize data store size

#### 5.4 Documentation & Training
- [ ] Document API integration
- [ ] Create developer guide
- [ ] Train team on Discovery Engine features
- [ ] Set up monitoring and alerts

**Estimated Time**: 2 weeks
**Dependencies**: All previous phases

---

## Technical Implementation Details

### Data Schema Design

```typescript
interface DiscoveryEngineDocument {
  id: string; // destination slug or ID
  name: string; // destination name
  description: string; // short description
  content: string; // full content (for semantic search)
  structData: {
    city: string;
    category: string;
    tags: string[];
    rating: number;
    price_level: number;
    michelin_stars: number;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    images: string[];
    metadata: {
      trending_score: number;
      views_count: number;
      saves_count: number;
      visits_count: number;
      created_at: string;
      updated_at: string;
    };
  };
}
```

### Search Request Example

```typescript
const searchRequest = {
  query: "romantic dinner spot with a view",
  pageSize: 20,
  userInfo: {
    userId: user.id,
    userAgent: request.headers['user-agent'],
  },
  filter: "city:paris AND category:dining AND price_level<=3",
  boostSpec: {
    conditionBoostSpecs: [
      {
        condition: "michelin_stars > 0",
        boost: 1.5,
      },
      {
        condition: "rating >= 4.5",
        boost: 1.2,
      },
    ],
  },
  personalizationSpec: {
    mode: "AUTO", // or "DISABLED" for non-personalized
  },
};
```

### User Event Tracking

```typescript
interface UserEvent {
  eventType: 'search' | 'view' | 'click' | 'save' | 'visit';
  userInfo: {
    userId: string;
  };
  searchInfo?: {
    searchQuery: string;
    pageNumber: number;
  };
  documentInfo: {
    id: string; // destination ID
    uri: string; // destination URL
  };
  eventTime: string; // ISO timestamp
}
```

---

## Integration Points

### 1. Search API Replacement
**File**: `app/api/search/route.ts`
- Add Discovery Engine as primary search backend
- Keep Supabase as fallback
- Feature flag: `USE_DISCOVERY_ENGINE`

### 2. Recommendation System Enhancement
**File**: `app/api/recommendations/`
- Use Discovery Engine for base recommendations
- Enhance with our custom Manual Score
- Combine multiple recommendation sources

### 3. AI Chat Integration
**File**: `app/api/ai-chat/route.ts`
- Use Discovery Engine for semantic search
- Improve intent understanding
- Better context retrieval

### 4. Homepage Search
**File**: `app/page.tsx`
- Replace vector search with Discovery Engine
- Improve search result quality
- Better personalization

### 5. City Page Search
**File**: `app/city/[city]/page-client.tsx`
- City-specific search with Discovery Engine
- Better filtering and ranking
- Personalized city recommendations

---

## Migration Strategy

### Option 1: Gradual Rollout (Recommended)
1. **Week 1-2**: Set up Discovery Engine, import data
2. **Week 3-4**: Implement parallel search (both systems)
3. **Week 5-6**: A/B test with 10% of users
4. **Week 7-8**: Increase to 50% if metrics are good
5. **Week 9-10**: Full rollout if successful

### Option 2: Feature Flag Approach
- Use feature flags to toggle Discovery Engine on/off
- Per-user or per-segment rollout
- Easy rollback if issues occur

### Option 3: Hybrid Approach
- Use Discovery Engine for complex queries
- Use Supabase for simple keyword searches
- Gradually increase Discovery Engine usage

---

## Cost Estimation

### Google Discovery Engine Pricing (as of 2025)
- **Free Tier**: First 1,000 queries/month
- **Paid Tier**: 
  - Search queries: ~$0.01-0.05 per query (varies by region)
  - Document storage: ~$0.10-0.50 per GB/month
  - User events: ~$0.001 per event

### Estimated Monthly Costs (10,000 active users)
- **Search Queries**: 100,000 queries/month × $0.02 = $2,000/month
- **Document Storage**: 1 GB × $0.30 = $0.30/month
- **User Events**: 500,000 events/month × $0.001 = $500/month
- **Total**: ~$2,500/month

### Cost Optimization Strategies
1. Implement aggressive caching (reduce queries by 70-80%)
2. Batch user events (reduce event costs)
3. Use free tier for development/testing
4. Monitor and optimize query patterns

---

## Success Metrics

### Search Quality Metrics
- **Click-Through Rate (CTR)**: Target 15%+ (vs. current ~10%)
- **Time to First Result**: Target <100ms
- **Query Understanding Accuracy**: Target 90%+
- **User Satisfaction**: Target 4.5/5.0

### Business Metrics
- **Search-to-Save Conversion**: Target 5%+ increase
- **Search-to-Visit Conversion**: Target 3%+ increase
- **User Retention**: Target 10%+ increase
- **Search Usage**: Target 20%+ increase

### Technical Metrics
- **API Response Time**: P95 < 200ms
- **Error Rate**: < 0.1%
- **Uptime**: 99.9%+
- **Cost per Query**: < $0.03

---

## Risks & Mitigation

### Risk 1: API Costs Exceed Budget
**Mitigation**: 
- Implement aggressive caching
- Set up cost alerts
- Monitor usage daily
- Have fallback to Supabase

### Risk 2: Search Quality Degrades
**Mitigation**:
- A/B test thoroughly before rollout
- Keep Supabase as fallback
- Gradual migration with monitoring
- Easy rollback mechanism

### Risk 3: Data Migration Issues
**Mitigation**:
- Test migration on staging first
- Validate data completeness
- Keep Supabase data as backup
- Incremental sync for updates

### Risk 4: Vendor Lock-in
**Mitigation**:
- Keep Supabase search as fallback
- Abstract search interface
- Don't remove existing search code
- Plan for multi-vendor support

---

## Prerequisites

### Google Cloud Requirements
- [ ] Google Cloud account with billing enabled
- [ ] Discovery Engine API access (may require approval)
- [ ] Service account with appropriate permissions
- [ ] API key for client-side usage (if needed)

### Technical Requirements
- [ ] Node.js environment with Google Cloud SDK
- [ ] TypeScript/JavaScript client library
- [ ] Data export/import scripts
- [ ] Monitoring and logging infrastructure

### Data Requirements
- [ ] Complete destination data export
- [ ] User interaction history (for personalization)
- [ ] Search query logs (for optimization)

---

## Implementation Checklist

### Phase 1: Setup
- [ ] Google Cloud project created
- [ ] Discovery Engine API enabled
- [ ] Service account configured
- [ ] Data store created
- [ ] Schema defined
- [ ] Data migration script created
- [ ] All destinations imported
- [ ] Data validation complete

### Phase 2: Integration
- [ ] Discovery Engine service created
- [ ] Search API endpoint implemented
- [ ] Fallback to Supabase implemented
- [ ] Feature flag system set up
- [ ] User event tracking implemented
- [ ] Basic search working

### Phase 3: Personalization
- [ ] User event collection complete
- [ ] Recommendation API implemented
- [ ] "For You" section updated
- [ ] A/B testing framework set up
- [ ] Personalization metrics tracked

### Phase 4: Advanced Features
- [ ] Conversational search implemented
- [ ] Multi-modal search implemented
- [ ] Advanced filtering implemented
- [ ] Analytics dashboard created
- [ ] Performance monitoring set up

### Phase 5: Migration
- [ ] Gradual rollout plan executed
- [ ] Performance optimized
- [ ] Costs monitored and optimized
- [ ] Documentation complete
- [ ] Team trained
- [ ] Full migration complete

---

## Next Steps

1. **Immediate (This Week)**:
   - Request Google Cloud account access
   - Apply for Discovery Engine API access
   - Review pricing and quotas
   - Create proof-of-concept with sample data

2. **Short Term (Next 2 Weeks)**:
   - Set up Google Cloud project
   - Create data store
   - Export and transform destination data
   - Import sample dataset for testing

3. **Medium Term (Next Month)**:
   - Implement basic search integration
   - Set up user event tracking
   - Create A/B testing framework
   - Begin gradual rollout

4. **Long Term (3-6 Months)**:
   - Full migration complete
   - Advanced features implemented
   - Performance optimized
   - Cost optimized

---

## References

- [Google Discovery Engine Documentation](https://cloud.google.com/generative-ai-app-builder/docs)
- [Discovery Engine API Reference](https://cloud.google.com/generative-ai-app-builder/docs/reference/rest)
- [Pricing Information](https://cloud.google.com/generative-ai-app-builder/pricing)
- [Best Practices Guide](https://cloud.google.com/generative-ai-app-builder/docs/best-practices)

---

## Conclusion

Google Discovery Engine integration represents a significant upgrade to Urban Manual's search capabilities. While it requires initial setup and migration effort, the benefits in search quality, personalization, and reduced maintenance make it a valuable long-term investment.

The recommended approach is a **gradual migration** with feature flags, allowing us to test, optimize, and roll back if needed. This ensures minimal risk while maximizing the benefits of AI-powered search.

**Estimated Total Timeline**: 8-10 weeks
**Estimated Total Cost**: $2,000-3,000/month (after optimization)
**Expected ROI**: 20-30% increase in user engagement and conversion

