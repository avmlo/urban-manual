# How Machine Learning is Used in Urban Manual

## 🏗️ Architecture Overview

Your site uses a **two-tier ML architecture**:

1. **AI Layer (TypeScript/Next.js)**: Real-time AI features using OpenAI
   - Vector embeddings for semantic search
   - LLM-powered conversational AI
   - Intent analysis and NLU

2. **ML Layer (Python Microservice)**: Advanced ML models for predictions
   - Collaborative filtering for recommendations
   - Time-series forecasting for trends
   - Sentiment analysis, topic modeling, anomaly detection
   - Explainable AI and sequence prediction

---

## 📍 Where ML is Used in Your Site

### 1. **Homepage - Personalized Recommendations**

**Component**: `ForYouSectionML` (`components/ForYouSectionML.tsx`)

**What it does:**
- Shows personalized destination recommendations using **collaborative filtering**
- Uses LightFM model to learn from user behavior patterns
- Considers: what you've viewed, saved, visited, and what similar users liked

**How it works:**
```
User visits homepage
  ↓
useMLRecommendations hook fetches from /api/ml/recommend
  ↓
Next.js proxy calls Python ML service
  ↓
LightFM model analyzes user-item interactions
  ↓
Returns personalized recommendations with scores
  ↓
Displays with "AI" badge and confidence scores
```

**Visual indicators:**
- ✨ "AI" badge when ML-powered
- "Standard" badge when using fallback
- Confidence percentage on hover (for high-confidence items)
- Explanation panel on hover showing "Why recommended?"

---

### 2. **Homepage - Trending Destinations**

**Component**: `TrendingSectionML` (`components/TrendingSectionML.tsx`)

**What it does:**
- Shows destinations with rising demand using **Prophet time-series forecasting**
- Predicts which places will be popular in the next 7 days
- Displays growth rates and trending badges

**How it works:**
```
Component loads
  ↓
useMLTrending hook fetches from /api/ml/forecast/trending
  ↓
Python ML service runs Prophet forecasting
  ↓
Analyzes historical views/saves/visits patterns
  ↓
Identifies destinations with increasing demand
  ↓
Returns trending list with growth percentages
  ↓
Displays with 🔥 trending badges and growth rates
```

**Visual indicators:**
- "AI Forecast" badge
- Trending rank (#1, #2, #3)
- Growth percentage (+42%)
- "Rising demand" text

---

### 3. **Destination Pages - Intelligence Section**

**Location**: `app/destination/[slug]/page-client.tsx`

**What it shows:**

#### a) **Anomaly Detection** (`AnomalyAlert`)
- Detects unusual traffic patterns (spikes or drops)
- Alerts if something unexpected is happening
- Uses Isolation Forest algorithm

#### b) **Demand Forecast** (`ForecastInfo`)
- Shows best time to visit vs peak times
- Predicts demand for next 30 days
- Uses Prophet forecasting

#### c) **Sentiment Analysis** (`SentimentDisplay`)
- Analyzes overall sentiment (positive/negative/neutral)
- Shows sentiment score and counts
- Uses BERT/RoBERTa models

#### d) **Topic Modeling** (`TopicsDisplay`)
- Extracts trending topics/keywords
- Shows what people are talking about
- Uses BERTopic model

**How it works:**
```
User views destination page
  ↓
Multiple hooks fetch in parallel:
  - useMLAnomaly → /api/ml/anomaly
  - ForecastInfo → /api/ml/forecast/peak-times
  - useMLSentiment → /api/ml/sentiment
  - useMLTopics → /api/ml/topics
  ↓
Each calls Python ML service
  ↓
Results displayed in intelligence section
```

---

### 4. **Recommendations - Explainable AI**

**Component**: `ExplanationPanel` (`components/ExplanationPanel.tsx`)

**What it does:**
- Explains WHY a destination was recommended
- Shows feature importance (what factors mattered)
- Uses SHAP or LIME for explanations

**How it works:**
```
User hovers/clicks "Why recommended?" button
  ↓
useMLExplain hook calls /api/ml/explain
  ↓
Python ML service analyzes recommendation
  ↓
SHAP/LIME calculates feature contributions
  ↓
Returns explanation with:
  - Text explanation
  - User feature importance
  - Destination feature importance
  ↓
Displays in expandable panel
```

**Visual indicators:**
- ✨ Sparkles icon
- Expandable panel with detailed breakdown
- Feature importance percentages

---

### 5. **Graph-Based Sequencing**

**Location**: `app/api/graph/suggest-next`, `app/optimize/page.tsx`

**What it does:**
- Suggests next places to visit based on co-visitation patterns
- Optimizes multi-day itineraries
- Uses NetworkX graph algorithms

**How it works:**
```
User adds places to itinerary
  ↓
Calls /api/graph/suggest-next or /api/graph/optimize-itinerary
  ↓
Python ML service analyzes:
  - Co-visitation patterns (people who visit A also visit B)
  - Geographic proximity
  - Category diversity
  ↓
Returns optimized sequence
  ↓
Displays in route optimizer UI
```

---

### 6. **Sequence Prediction** (Available but not yet integrated)

**Component**: `SequencePredictions` (`components/SequencePredictions.tsx`)

**What it does:**
- Predicts next user actions based on browsing patterns
- Suggests what user might want to do next

**How it works:**
```
User performs actions (view, save, search)
  ↓
Sequence model analyzes pattern
  ↓
Predicts next likely actions
  ↓
Shows suggestions
```

---

## 🔄 Data Flow Architecture

### Request Flow:
```
Frontend Component
  ↓
React Hook (useML*)
  ↓
Next.js API Route (/api/ml/*)
  ↓
Python ML Service (FastAPI)
  ↓
ML Model (LightFM, Prophet, etc.)
  ↓
Supabase Database (training data)
  ↓
Response flows back up
```

### Training Flow:
```
Cron Job (/api/cron/train-ml-models)
  ↓
Calls ML service training endpoints
  ↓
ML service fetches data from Supabase
  ↓
Trains models (LightFM, Prophet, etc.)
  ↓
Saves trained models
  ↓
Ready for inference
```

---

## 🤖 ML Models Used

### 1. **LightFM** - Collaborative Filtering
- **Purpose**: Personalized recommendations
- **Input**: User-item interactions (views, saves, visits)
- **Output**: Recommendation scores
- **Training**: Weekly via cron job

### 2. **Prophet** - Time-Series Forecasting
- **Purpose**: Demand prediction, trending detection
- **Input**: Historical views/saves/visits over time
- **Output**: Future demand predictions
- **Features**: Multi-seasonality, holiday awareness

### 3. **BERT/RoBERTa** - Sentiment Analysis
- **Purpose**: Analyze sentiment from text
- **Input**: User notes, reviews, comments
- **Output**: Sentiment scores (positive/negative/neutral)

### 4. **BERTopic** - Topic Modeling
- **Purpose**: Extract themes and keywords
- **Input**: Collection of texts
- **Output**: Topics with keywords and frequencies

### 5. **Isolation Forest** - Anomaly Detection
- **Purpose**: Detect unusual patterns
- **Input**: Traffic metrics over time
- **Output**: Anomaly flags and scores

### 6. **SHAP/LIME** - Explainable AI
- **Purpose**: Explain model predictions
- **Input**: Model prediction
- **Output**: Feature importance and explanations

### 7. **NetworkX** - Graph Algorithms
- **Purpose**: Co-visitation patterns, itinerary optimization
- **Input**: Visit sequences, geographic data
- **Output**: Optimized sequences and suggestions

---

## 📊 ML Features by Page

### **Homepage** (`app/page.tsx`)
- ✅ `TrendingSectionML` - Prophet forecasting
- ✅ `ForYouSectionML` - LightFM recommendations
- ✅ Explanation panels on recommendations

### **Destination Pages** (`app/destination/[slug]/page-client.tsx`)
- ✅ `AnomalyAlert` - Traffic anomaly detection
- ✅ `ForecastInfo` - Demand forecasting
- ✅ `SentimentDisplay` - Sentiment analysis
- ✅ `TopicsDisplay` - Topic modeling

### **Route Optimizer** (`app/optimize/page.tsx`)
- ✅ Graph-based itinerary optimization
- ✅ Co-visitation pattern suggestions

### **Itinerary Page** (`app/itinerary/page.tsx`)
- ⚠️ Placeholder for graph sequencing (backend ready)

---

## 🎯 Key ML Capabilities

### **Personalization**
- Learns from user behavior
- Adapts to preferences over time
- Handles cold-start (new users/destinations)

### **Predictive Analytics**
- Forecasts demand trends
- Predicts peak times
- Identifies upcoming popular destinations

### **Intelligence**
- Detects anomalies automatically
- Analyzes sentiment trends
- Extracts topics and themes

### **Explainability**
- Shows why recommendations were made
- Displays feature importance
- Builds user trust

### **Resilience**
- Graceful fallback if ML service unavailable
- Visual indicators (AI vs Standard badges)
- No user-facing errors

---

## 🔧 Configuration

### Environment Variables:
```bash
# Next.js (.env.local)
ML_SERVICE_URL=http://localhost:8000  # or production URL

# ML Service (.env)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
POSTGRES_URL=...
```

### Training Schedule:
- **Collaborative Filtering**: Weekly (Sunday 2 AM)
- **Forecasting**: Daily (3 AM)
- **Graph Sequencing**: Weekly

### Health Monitoring:
- `/api/ml/status` - Check ML service health
- Automatic fallback if service unavailable

---

## 📈 Performance & Optimization

### Caching:
- ML service responses cached (1 hour TTL)
- Recommendation cache in LightFM model
- Forecast results cached

### Fallback Strategy:
1. Try ML service first
2. If unavailable → use existing recommendation system
3. Show "Standard" badge instead of "AI"
4. No user-facing errors

### Model Updates:
- Models retrained automatically via cron jobs
- New data aggregated daily
- Models update without downtime

---

## 🎨 User Experience

### Visual Indicators:
- ✨ **"AI" badge** - ML-powered feature
- 📊 **"AI Forecast" badge** - Prophet forecasting
- 🔥 **Trending badges** - Growth indicators
- ⚠️ **Anomaly alerts** - Unusual patterns detected
- 💡 **Explanation panels** - Why recommendations

### Transparency:
- Users can see when ML is used
- Explanations available on demand
- Confidence scores visible
- Clear fallback indicators

---

## 🚀 Future Enhancements

### Available but not yet integrated:
- **Sequence Prediction UI** - Predict next actions
- **Bandit Algorithm UI** - A/B testing visualization
- **Performance Monitoring Dashboard** - ML metrics

### Potential additions:
- Real-time model updates
- User feedback loops
- Advanced explainability
- Multi-model ensemble predictions

---

## 📝 Summary

Your site uses ML in **6 main areas**:

1. **Recommendations** - Personalized suggestions using collaborative filtering
2. **Trending** - Demand forecasting to show what's popular
3. **Intelligence** - Sentiment, topics, and anomaly detection on destination pages
4. **Explanations** - Why recommendations were made
5. **Optimization** - Graph-based itinerary sequencing
6. **Sequence Prediction** - Next action predictions (ready but not yet integrated)

All ML features have **graceful fallbacks** and **visual indicators** so users know when AI is powering their experience.

