# Intelligence Expansion Implementation Plan
## Practical Guide to Integrating ML Models into Urban Manual

This document provides a step-by-step implementation plan for integrating the machine learning models catalogued in `MODEL_CATALOGUE.md` into the Urban Manual platform.

---

## Table of Contents

1. [Implementation Phases](#implementation-phases)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Data Pipeline](#data-pipeline)
4. [Model Implementation Order](#model-implementation-order)
5. [API Architecture](#api-architecture)
6. [Frontend Integration](#frontend-integration)
7. [Testing Strategy](#testing-strategy)
8. [Deployment & Monitoring](#deployment--monitoring)

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Set up infrastructure and data pipelines

- ✅ Vector embeddings (already implemented)
- ✅ Basic AI recommendations (already implemented)
- 🔨 Enhance collaborative filtering layer
- 🔨 Set up Python microservice for ML models
- 🔨 Create data aggregation jobs

### Phase 2: Core Intelligence (Weeks 3-5)
**Goal**: Implement high-impact recommendation and forecasting features

- 🔨 Collaborative filtering with LightFM
- 🔨 Time-series forecasting with Prophet
- 🔨 Enhanced hybrid recommendations
- 🔨 Graph-based sequencing

### Phase 3: Advanced Features (Weeks 6-8)
**Goal**: Add sentiment, topics, and anomaly detection

- 🔨 Sentiment analysis pipeline
- 🔨 Topic modeling with BERTopic
- 🔨 Anomaly detection
- 🔨 Event correlation enhancement

### Phase 4: Optimization & Polish (Weeks 9-10)
**Goal**: Add explainability and optimize performance

- 🔨 Explainable AI (SHAP/LIME)
- 🔨 Bandit algorithms for prompt selection
- 🔨 Sequence models for browsing patterns
- 🔨 Performance optimization

---

## Infrastructure Setup

### 1. Python Microservice

Create a new Python service for ML model training and inference:

```
microservices/
├── ml-service/
│   ├── requirements.txt
│   ├── main.py (FastAPI)
│   ├── models/
│   │   ├── collaborative_filtering.py
│   │   ├── time_series.py
│   │   ├── sentiment.py
│   │   ├── topic_modeling.py
│   │   └── anomaly_detection.py
│   ├── data/
│   │   ├── aggregators.py
│   │   └── preprocessors.py
│   ├── api/
│   │   ├── recommendations.py
│   │   ├── forecasting.py
│   │   └── insights.py
│   └── config.py
```

**requirements.txt**:
```txt
fastapi==0.104.1
uvicorn==0.24.0
pandas==2.1.3
numpy==1.26.2
scikit-learn==1.3.2
lightfm==1.17
prophet==1.1.5
xgboost==2.0.3
transformers==4.35.2
bertopic==0.15.0
supabase==2.0.3
python-dotenv==1.0.0
```

**main.py** (FastAPI):
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.recommendations import router as recommendations_router
from api.forecasting import router as forecasting_router
from api.insights import router as insights_router

app = FastAPI(title="Urban Manual ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recommendations_router, prefix="/api/v1")
app.include_router(forecasting_router, prefix="/api/v1")
app.include_router(insights_router, prefix="/api/v1")
```

### 2. Database Schema Extensions

**Migration**: `016_ml_features.sql`

```sql
-- User latent factors for collaborative filtering
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS cf_factors vector(64);
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS cf_factors vector(64);

-- Sentiment scores
CREATE TABLE IF NOT EXISTS destination_sentiment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id INTEGER REFERENCES destinations(id),
  sentiment_score DECIMAL(3,2), -- -1.0 to 1.0
  volume INTEGER,
  momentum DECIMAL(5,2), -- week-over-week % change
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(destination_id, calculated_at)
);

CREATE INDEX idx_destination_sentiment_destination ON destination_sentiment(destination_id);
CREATE INDEX idx_destination_sentiment_calculated ON destination_sentiment(calculated_at DESC);

-- Topic assignments
CREATE TABLE IF NOT EXISTS destination_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id INTEGER REFERENCES destinations(id),
  topic_id INTEGER,
  topic_label TEXT,
  topic_score DECIMAL(5,4), -- 0.0 to 1.0
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_destination_topics_destination ON destination_topics(destination_id);
CREATE INDEX idx_destination_topics_topic ON destination_topics(topic_id);

-- Co-visitation graph
CREATE TABLE IF NOT EXISTS co_visitation_graph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_a_id INTEGER REFERENCES destinations(id),
  destination_b_id INTEGER REFERENCES destinations(id),
  weight DECIMAL(5,4), -- co-visitation frequency
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(destination_a_id, destination_b_id)
);

CREATE INDEX idx_co_visitation_a ON co_visitation_graph(destination_a_id);
CREATE INDEX idx_co_visitation_b ON co_visitation_graph(destination_b_id);

-- Forecasts
CREATE TABLE IF NOT EXISTS demand_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  forecast_date DATE NOT NULL,
  predicted_demand DECIMAL(10,2),
  confidence_interval_lower DECIMAL(10,2),
  confidence_interval_upper DECIMAL(10,2),
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(city, forecast_date)
);

CREATE INDEX idx_demand_forecasts_city ON demand_forecasts(city);
CREATE INDEX idx_demand_forecasts_date ON demand_forecasts(forecast_date);
```

### 3. Environment Variables

Add to `.env`:

```bash
# ML Service
ML_SERVICE_URL=http://localhost:8000  # or production URL
ML_SERVICE_API_KEY=your-api-key-here

# Model APIs
HUGGINGFACE_API_KEY=your-hf-key
OPENAI_API_KEY=optional-for-embeddings

# Python Service Auth
PYTHON_SERVICE_SECRET=shared-secret-for-internal-calls
```

---

## Data Pipeline

### 1. Data Aggregation Jobs

Create scheduled jobs to aggregate user interaction data:

**scripts/aggregate-user-data.ts**:
```typescript
/**
 * Aggregate user interactions for ML models
 * Run daily via cron or Vercel Cron
 */

import { createClient } from '@supabase/supabase-js';

async function aggregateUserInteractions() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Aggregate views, saves, visits by destination
  const { data } = await supabase.rpc('aggregate_interactions', {
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // Store in analytics table or send to ML service
  return data;
}
```

### 2. Training Pipeline

**microservices/ml-service/train.py**:
```python
"""
Scheduled training job (run weekly)
"""
from models.collaborative_filtering import train_cf_model
from models.time_series import train_forecast_models
from data.aggregators import fetch_user_interactions, fetch_visit_history
import supabase

def train_all_models():
    # 1. Fetch data
    interactions = fetch_user_interactions()
    visits = fetch_visit_history()
    
    # 2. Train collaborative filtering
    cf_model = train_cf_model(interactions)
    # Save factors to Supabase
    
    # 3. Train time-series forecasts
    forecasts = train_forecast_models(visits)
    # Save to demand_forecasts table
    
    # 4. Build co-visitation graph
    graph = build_co_visitation_graph(visits)
    # Save to co_visitation_graph table
```

---

## Model Implementation Order

### Priority 1: Collaborative Filtering (Week 3)

**Implementation Steps**:

1. **Create LightFM Model** (`microservices/ml-service/models/collaborative_filtering.py`):
```python
from lightfm import LightFM
from lightfm.datasets import Dataset
from lightfm.evaluation import precision_at_k
import numpy as np

def train_cf_model(interactions_df):
    """
    Train collaborative filtering model
    interactions_df: pandas DataFrame with columns: user_id, destination_id, rating (implicit)
    """
    # Build user/item mappings
    dataset = Dataset()
    dataset.fit(
        interactions_df['user_id'].unique(),
        interactions_df['destination_id'].unique()
    )
    
    # Build interactions matrix
    (interactions_matrix, weights) = dataset.build_interactions(
        interactions_df[['user_id', 'destination_id']].values
    )
    
    # Train model
    model = LightFM(loss='warp', learning_rate=0.05)
    model.fit(interactions_matrix, epochs=30, num_threads=4)
    
    # Extract latent factors
    user_factors = model.user_embeddings
    item_factors = model.item_embeddings
    
    return {
        'model': model,
        'user_factors': user_factors,
        'item_factors': item_factors,
        'dataset': dataset
    }
```

2. **Create API Endpoint** (`microservices/ml-service/api/recommendations.py`):
```python
from fastapi import APIRouter, HTTPException
from models.collaborative_filtering import get_recommendations

router = APIRouter()

@router.post("/recommendations/collaborative")
async def collaborative_recommendations(user_id: str, limit: int = 20):
    """
    Get collaborative filtering recommendations
    """
    try:
        recommendations = get_recommendations(user_id, limit)
        return {
            "recommendations": recommendations,
            "algorithm": "collaborative_filtering",
            "count": len(recommendations)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

3. **Update Next.js API** (`app/api/recommendations/route.ts`):
```typescript
// Add CF layer to existing recommendations
const cfRecommendations = await fetch(`${process.env.ML_SERVICE_URL}/api/v1/recommendations/collaborative`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${process.env.ML_SERVICE_API_KEY}` },
  body: JSON.stringify({ userId: user.id, limit: 20 })
});

// Merge with AI recommendations
const hybridScores = mergeRecommendations(aiRecommendations, cfRecommendations);
```

### Priority 2: Time-Series Forecasting (Week 4)

**Implementation Steps**:

1. **Create Prophet Model** (`microservices/ml-service/models/time_series.py`):
```python
from prophet import Prophet
import pandas as pd

def forecast_demand(city: str, historical_data: pd.DataFrame):
    """
    Forecast booking/search demand for a city
    historical_data: DataFrame with columns ['ds' (date), 'y' (demand)]
    """
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        changepoint_prior_scale=0.05
    )
    
    # Add event regressors if available
    if 'events' in historical_data.columns:
        model.add_regressor('events')
    
    model.fit(historical_data)
    
    # Forecast next 90 days
    future = model.make_future_dataframe(periods=90)
    forecast = model.predict(future)
    
    return {
        'forecast': forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].to_dict('records'),
        'trend': forecast['trend'].values[-90:].tolist(),
        'seasonality': forecast['yearly'].values[-90:].tolist()
    }
```

2. **Create Forecast API** (`microservices/ml-service/api/forecasting.py`):
```python
@router.get("/forecast/demand/{city}")
async def get_demand_forecast(city: str):
    """Get demand forecast for a city"""
    historical = fetch_city_interactions(city)
    forecast = forecast_demand(city, historical)
    return forecast
```

3. **Update Seasonality Service** (`services/seasonality.ts`):
```typescript
export async function getForecastedPeakWindow(
  city: string,
  days: number = 90
): Promise<PeakWindow | null> {
  const response = await fetch(
    `${process.env.ML_SERVICE_URL}/api/v1/forecast/demand/${city}`
  );
  const forecast = await response.json();
  
  // Find peak dates from forecast
  const peakDates = findPeakDates(forecast.forecast);
  return {
    start: peakDates.start,
    end: peakDates.end,
    confidence: forecast.confidence,
  };
}
```

### Priority 3: Graph-Based Sequencing (Week 5)

**Implementation Steps**:

1. **Build Co-Visitation Graph** (`microservices/ml-service/models/graph_sequencing.py`):
```python
import networkx as nx
import pandas as pd

def build_co_visitation_graph(visit_history: pd.DataFrame):
    """
    Build graph from visit sequences
    visit_history: DataFrame with columns ['user_id', 'destination_id', 'visited_at', 'sequence_order']
    """
    G = nx.DiGraph()
    
    # Group by user and sequence
    for user_id, user_visits in visit_history.groupby('user_id'):
        sorted_visits = user_visits.sort_values('visited_at')
        destinations = sorted_visits['destination_id'].tolist()
        
        # Add edges for consecutive visits
        for i in range(len(destinations) - 1):
            src = destinations[i]
            dst = destinations[i + 1]
            if G.has_edge(src, dst):
                G[src][dst]['weight'] += 1
            else:
                G.add_edge(src, dst, weight=1)
    
    return G

def suggest_next_places(current_place_id: int, graph: nx.DiGraph, limit: int = 3):
    """Suggest next places based on graph"""
    if current_place_id not in graph:
        return []
    
    # Get outgoing edges (places visited after this one)
    successors = list(graph.successors(current_place_id))
    
    # Sort by weight (co-visitation frequency)
    sorted_successors = sorted(
        successors,
        key=lambda x: graph[current_place_id][x]['weight'],
        reverse=True
    )
    
    return sorted_successors[:limit]
```

2. **Create Graph API** (`app/api/itinerary-suggest/route.ts`):
```typescript
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const placeId = searchParams.get('placeId');
  
  const response = await fetch(
    `${process.env.ML_SERVICE_URL}/api/v1/itinerary/suggest-next`,
    {
      method: 'POST',
      body: JSON.stringify({ placeId, limit: 3 })
    }
  );
  
  return NextResponse.json(await response.json());
}
```

### Priority 4: Sentiment Analysis (Week 6)

**Implementation Steps**:

1. **Create Sentiment Pipeline** (`microservices/ml-service/models/sentiment.py`):
```python
from transformers import pipeline
import pandas as pd

sentiment_analyzer = pipeline(
    "sentiment-analysis",
    model="cardiffnlp/twitter-roberta-base-sentiment-latest"
)

def analyze_sentiment(texts: list[str]) -> list[dict]:
    """Analyze sentiment for a list of texts"""
    results = sentiment_analyzer(texts)
    return [
        {
            'text': texts[i],
            'label': r['label'],
            'score': r['score']
        }
        for i, r in enumerate(results)
    ]

def calculate_momentum(current_week: int, previous_week: int) -> float:
    """Calculate week-over-week momentum"""
    if previous_week == 0:
        return 0.0
    return ((current_week - previous_week) / previous_week) * 100
```

2. **Process User Notes** (`scripts/process-sentiment.ts`):
```typescript
// Run weekly to process saved_destinations.notes
const { data: notes } = await supabase
  .from('saved_destinations')
  .select('destination_id, notes')
  .not('notes', 'is', null);

// Send to ML service
const response = await fetch(`${ML_SERVICE_URL}/api/v1/sentiment/analyze`, {
  method: 'POST',
  body: JSON.stringify({ texts: notes.map(n => n.notes) })
});

// Store results
await supabase.from('destination_sentiment').upsert(sentimentResults);
```

---

## API Architecture

### Unified API Endpoints

**app/api/insights/[city]/route.ts**:
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { city: string } }
) {
  const city = params.city;
  
  // Fetch from multiple sources
  const [seasonality, forecast, momentum, topics] = await Promise.all([
    fetch(`/api/seasonality?city=${city}`),
    fetch(`${ML_SERVICE_URL}/api/v1/forecast/demand/${city}`),
    fetch(`${ML_SERVICE_URL}/api/v1/momentum/${city}`),
    fetch(`${ML_SERVICE_URL}/api/v1/topics/${city}`),
  ]);
  
  return NextResponse.json({
    city,
    seasonality: await seasonality.json(),
    forecast: await forecast.json(),
    momentum: await momentum.json(),
    topics: await topics.json(),
  });
}
```

**app/api/place-insights/[placeId]/route.ts**:
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { placeId: string } }
) {
  const placeId = params.placeId;
  
  const [sentiment, related, anomaly] = await Promise.all([
    fetchSentiment(placeId),
    fetchRelatedPlaces(placeId),
    fetchAnomalyFlag(placeId),
  ]);
  
  return NextResponse.json({
    placeId,
    sentiment,
    relatedPlaces: related,
    anomaly: anomaly,
  });
}
```

---

## Frontend Integration

### 1. Place Page Enhancements

**components/PlaceInsights.tsx**:
```typescript
'use client';

interface PlaceInsightsProps {
  placeId: string;
}

export default function PlaceInsights({ placeId }: PlaceInsightsProps) {
  const [insights, setInsights] = useState(null);
  
  useEffect(() => {
    fetch(`/api/place-insights/${placeId}`)
      .then(r => r.json())
      .then(setInsights);
  }, [placeId]);
  
  return (
    <div className="space-y-4">
      {/* Sentiment Badge */}
      {insights?.sentiment?.momentum > 20 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <span className="text-sm">🔥 Trending (+{insights.sentiment.momentum}% this month)</span>
        </div>
      )}
      
      {/* Related Places */}
      {insights?.relatedPlaces && (
        <div>
          <h3 className="text-sm font-medium mb-2">You May Also Like</h3>
          <div className="grid grid-cols-3 gap-2">
            {insights.relatedPlaces.map(place => (
              <RelatedPlaceCard key={place.id} place={place} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 2. City Page Dashboard

**components/CityInsights.tsx**:
```typescript
'use client';

export default function CityInsights({ city }: { city: string }) {
  const [insights, setInsights] = useState(null);
  
  useEffect(() => {
    fetch(`/api/insights/${city}`)
      .then(r => r.json())
      .then(setInsights);
  }, [city]);
  
  return (
    <div className="space-y-4">
      {/* Peak Window */}
      {insights?.forecast?.peakWindow && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="text-sm font-medium">Upcoming Peak Window</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {insights.forecast.peakWindow.start} - {insights.forecast.peakWindow.end}
          </div>
        </div>
      )}
      
      {/* Trending Topics */}
      {insights?.topics && insights.topics.length > 0 && (
        <div>
          <div className="text-sm font-medium mb-2">Trending Topics</div>
          <div className="flex flex-wrap gap-2">
            {insights.topics.map(topic => (
              <span key={topic.id} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                {topic.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 3. Account Page Integration

Update `app/account/page.tsx` to use new insights:

```typescript
// In Overview tab
<InsightsDashboard userId={user.id} />

// Add new tab for ML-powered recommendations
{activeTab === 'intelligence' && (
  <IntelligenceDashboard userId={user.id} />
)}
```

---

## Testing Strategy

### 1. Unit Tests

**tests/models/collaborative-filtering.test.ts**:
```typescript
describe('Collaborative Filtering', () => {
  it('should return recommendations for known user', async () => {
    const recommendations = await getCFRecommendations('user-123', 10);
    expect(recommendations).toHaveLength(10);
    expect(recommendations[0]).toHaveProperty('destinationId');
    expect(recommendations[0]).toHaveProperty('score');
  });
  
  it('should handle cold-start users', async () => {
    const recommendations = await getCFRecommendations('new-user', 10);
    // Should fall back to content-based
    expect(recommendations.length).toBeGreaterThan(0);
  });
});
```

### 2. Integration Tests

**tests/api/insights.test.ts**:
```typescript
describe('/api/insights/[city]', () => {
  it('should return forecast and momentum', async () => {
    const response = await fetch('/api/insights/tokyo');
    const data = await response.json();
    
    expect(data).toHaveProperty('forecast');
    expect(data).toHaveProperty('momentum');
    expect(data.city).toBe('tokyo');
  });
});
```

### 3. End-to-End Tests

Test full user flows with ML-powered features.

---

## Deployment & Monitoring

### 1. Deploy Python Service

**Dockerfile** (`microservices/ml-service/Dockerfile`):
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Deploy to:
- **Vercel Serverless Functions** (if lightweight)
- **Railway/Render** (for persistent models)
- **AWS Lambda + ECS** (for scale)

### 2. Scheduled Jobs

**Vercel Cron** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/train-models",
      "schedule": "0 2 * * 0"
    },
    {
      "path": "/api/cron/aggregate-data",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### 3. Monitoring

- **Model Performance**: Track recommendation CTR, forecast accuracy
- **API Latency**: Monitor ML service response times
- **Data Quality**: Alert on missing or stale data
- **Model Drift**: Detect when models need retraining

---

## Quick Start Checklist

### Week 1: Setup
- [ ] Create Python microservice structure
- [ ] Set up database migrations for ML tables
- [ ] Deploy ML service to hosting platform
- [ ] Create environment variables

### Week 2: Data Pipeline
- [ ] Build data aggregation scripts
- [ ] Set up scheduled jobs
- [ ] Test data flow from Supabase to ML service

### Week 3: Collaborative Filtering
- [ ] Implement LightFM model
- [ ] Create training pipeline
- [ ] Build recommendation API
- [ ] Integrate into Next.js

### Week 4: Time-Series Forecasting
- [ ] Implement Prophet models
- [ ] Create forecast APIs
- [ ] Update seasonality service
- [ ] Display on account page

### Week 5: Graph Sequencing
- [ ] Build co-visitation graph
- [ ] Create sequence API
- [ ] Add to itinerary builder

Continue iterating on remaining features based on user feedback and data availability.

---

## Next Steps

1. Review and prioritize features based on business goals
2. Set up development environment for Python service
3. Begin with Phase 1 (Foundation)
4. Iterate based on user feedback and metrics

See `SMART_TRAVEL_MODELS_PLAN.md` for detailed model specifications and `ABOUT_PLACE_AI_PLAN.md` for place-specific AI features.

