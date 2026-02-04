# Model Catalogue for Urban Manual
## Machine Learning Models for Travel Intelligence

This document catalogs the machine learning models and techniques that will power Urban Manual's intelligent features. Each model type includes its purpose, data requirements, potential libraries, and concrete use-cases within the platform.

---

## 1. Time-Series Forecasting

### Models
- **Prophet** (Facebook) - Additive time-series model with seasonality
- **ARIMA/SARIMAX** - AutoRegressive Integrated Moving Average
- **DeepAR** (AWS/GluonTS) - Deep learning for time-series
- **N-BEATS** - Neural basis expansion analysis
- **NeuralProphet** - Enhanced Prophet with neural components

### Purpose
Predict search interest, booking demand, and price trends over time; identify peak and off-peak periods.

### Data Requirements
- Time-stamped user interactions (views, saves, searches)
- Historical price data (if available)
- Seasonal event dates
- City/destination identifiers

### Use-Cases in Urban Manual

1. **"Upcoming Peak Windows" on Account Page**
   - Forecast booking demand for user's favorite cities
   - Display: "Tokyo demand peaks March 22–April 5 (cherry blossoms)"
   - Power proactive recommendations before peak periods

2. **Dynamic Pricing Insights**
   - Predict hotel/restaurant price trends
   - Show: "Prices typically increase 15% during cherry blossom season"
   - Help users plan optimal booking timing

3. **Search Interest Prediction**
   - Identify trending destinations 2-4 weeks in advance
   - Surface "Trending Soon" badges on city cards
   - Adjust recommendation weights proactively

### Integration Points
- `services/seasonality.ts` - Extend with forecast data
- `app/api/account/insights` - Return forecast windows
- Account page dashboard - Display peak windows

### Libraries
- `prophet` (Python) - Primary forecasting engine
- `statsmodels` (Python) - ARIMA/SARIMAX
- `gluonts` (Python) - Deep learning time-series
- `pandas` - Data manipulation

---

## 2. Collaborative Filtering & Matrix Factorisation

### Models
- **Alternating Least Squares (ALS)** - Classic matrix factorization
- **LightFM** - Hybrid collaborative/content-based
- **Neural Collaborative Filtering (NCF)** - Deep learning CF
- **Singular Value Decomposition (SVD)** - Dimensionality reduction

### Purpose
Provide personalized venue recommendations based on implicit feedback (views, saves, itinerary additions) from similar users.

### Data Requirements
- User × Destination interaction matrix
  - Views (`user_interactions` table)
  - Saves (`saved_destinations` table)
  - Itinerary additions (`itinerary` context)
  - Visits (`visit_history` table)
- User IDs and Destination IDs
- Interaction timestamps (for recency weighting)

### Use-Cases in Urban Manual

1. **"People Who Loved X Also Liked Y"**
   - Display on place detail pages
   - Based on co-visitation patterns
   - Example: "Visitors to Aman Kyoto also saved Ritz-Carlton Kyoto"

2. **Personalized Homepage Feed**
   - Rank destinations by collaborative scores
   - Blend with popularity and freshness signals
   - Currently: `AIRecommendationEngine` uses Gemini; add CF layer

3. **Cold-Start Mitigation**
   - New users: Use content-based fallback
   - New destinations: Boost with editorial signals until CF data accumulates

### Integration Points
- `lib/ai-recommendations/engine.ts` - Hybrid with CF scores
- `app/api/recommendations` - Merge CF + content + AI
- Destination cards - Show "Similar users also liked" badges

### Libraries
- `lightfm` (Python) - Hybrid recommendation
- `implicit` (Python) - Fast ALS implementation
- `surprise` (Python) - Traditional CF algorithms
- Store latent factors in Supabase `user_profiles.recommendation_vectors`

### Current State
- ✅ Existing: `AIRecommendationEngine` (Gemini-based)
- ⚠️ Gap: No collaborative filtering layer yet
- 📝 Plan: Build Python microservice for CF, store scores in Supabase

---

## 3. Content-Based Similarity

### Models
- **Vector Embeddings**
  - OpenAI `text-embedding-3-small` or `text-embedding-3-large`
  - HuggingFace `sentence-transformers/all-MiniLM-L6-v2`
  - Google `text-embedding-004` (already in use)
- **Cosine Similarity** - Vector distance metric
- **TF-IDF + Cosine** - Traditional text similarity

### Purpose
Find similar venues based on tags, descriptions, and metadata; power "You may also like" sections.

### Data Requirements
- Destination embeddings (stored in `destinations.embedding` column - ✅ exists)
- Tags array (`destinations.tags` - ✅ exists)
- Text fields: name, description, content
- Category, city, michelin_stars

### Use-Cases in Urban Manual

1. **"You May Also Like" on Place Pages**
   - Query: `SELECT * FROM destinations WHERE embedding <=> (SELECT embedding FROM destinations WHERE slug = ?) < 0.3`
   - Filter by same city or category
   - Return top 5 similar places

2. **Semantic Autocomplete**
   - Already partially implemented in `/api/search`
   - Enhance with tag-based similarity
   - Example: "romantic" → find places with ["romantic", "cozy", "intimate"] tags

3. **Category Expansion**
   - When user searches "Michelin restaurants in Tokyo"
   - Show similar: fine-dining, award-winning, upscale dining

### Integration Points
- ✅ Existing: `match_destinations` PostgreSQL function uses pgvector
- `app/api/related-destinations` - Currently basic; enhance with embeddings
- Place detail pages - Show "Similar venues" section

### Libraries
- `@supabase/supabase-js` - pgvector queries
- `@google/generative-ai` - text-embedding-004 (already in use)
- No additional Python needed (Supabase handles)

### Current State
- ✅ Vector embeddings column exists
- ✅ `match_destinations` function exists
- ⚠️ Enhance: Tag-based filtering + embedding similarity

---

## 4. Hybrid Recommenders

### Models
- **Factorization Machine (FM)** - Feature interactions
- **DeepFM** - Deep + FM components
- **Wide & Deep** - Google's model
- **LightFM** - Hybrid by design

### Purpose
Combine collaborative signals (user behavior) with content features (tags, metadata) for improved accuracy and cold-start handling.

### Data Requirements
- All CF data (user × destination interactions)
- Content features (tags, category, price_level, michelin_stars, ratings)
- User features (preferences, travel_style, favorite_cities)
- Temporal features (season, day_of_week)

### Use-Cases in Urban Manual

1. **Hybrid Recommendation Engine**
   - Current: `AIRecommendationEngine` uses Gemini (content-only)
   - Enhance: Add CF layer for logged-in users with history
   - Formula: `score = 0.6 × CF_score + 0.3 × Content_similarity + 0.1 × AI_explanation_score`

2. **Cold-Start Handling**
   - New user: 100% content-based (tags + preferences)
   - New destination: Use editorial metadata + popularity boost
   - Gradually blend in CF signals as data accumulates

3. **Contextual Recommendations**
   - "Because you saved 3 Michelin restaurants, here are more"
   - Combine user taste profile with destination tags
   - Filter by seasonality (cherry blossoms → show sakura-view hotels)

### Integration Points
- `lib/recommendations.ts` - Already has hybrid functions; enhance
- `lib/ai-recommendations/engine.ts` - Merge CF scores
- `app/api/recommendations` - Return hybrid results

### Libraries
- `lightfm` (Python) - Primary hybrid engine
- `tensorflow` or `pytorch` - For DeepFM if needed
- Store in Supabase: `personalization_scores` table (✅ exists)

### Current State
- ✅ `getHybridRecommendations` function exists
- ⚠️ Needs: CF model training pipeline
- 📝 Plan: Python service trains weekly, updates Supabase

---

## 5. Sentiment & Social Momentum Analysis

### Models
- **BERT/RoBERTa** - Sentiment classification
  - `cardiffnlp/twitter-roberta-base-sentiment-latest`
  - `nlptown/bert-base-multilingual-uncased-sentiment`
- **XGBoost/CatBoost** - Momentum prediction from aggregated signals
- **Streaming Analytics** - Kafka + Flink for real-time sentiment

### Purpose
Detect positive/negative buzz around destinations or venues; identify trending topics; power "Trending Now" features.

### Data Requirements
- User reviews/comments (if collected)
- Social media mentions (external API scraping - optional)
- User notes in saved destinations (`saved_destinations.notes`)
- Sentiment scores per destination over time
- Volume metrics (mention counts, engagement)

### Use-Cases in Urban Manual

1. **"Trending Now" Badges**
   - Detect week-over-week increase in saves/views
   - Show momentum score: "🔥 Trending (+40% this month)"
   - Display on destination cards and city pages

2. **Sentiment-Driven Prompts**
   - If sentiment positive: "Rave reviews for Aman Tokyo's sakura views"
   - If negative trend: Suppress or flag for editorial review
   - Inform AI context generation

3. **Editorial Insights Dashboard**
   - Alert editors to sudden sentiment drops
   - Surface trending venues for content updates
   - Identify emerging themes ("matcha croissants" trending)

### Integration Points
- `app/api/momentum/{city}` - Return trending metrics
- Destination cards - Show "Trending" badge
- Admin dashboard - Sentiment alerts

### Libraries
- `transformers` (HuggingFace) - BERT sentiment models
- `xgboost` or `catboost` - Momentum prediction
- `pandas` + `numpy` - Data processing

### Current State
- ⚠️ Gap: No sentiment analysis yet
- ✅ Data: User interactions tracked
- 📝 Plan: Python microservice processes mentions, stores in `destination_sentiment` table

---

## 6. Topic Modelling & Theme Extraction

### Models
- **Latent Dirichlet Allocation (LDA)** - Classic topic modeling
- **BERTopic** - Modern topic modeling with embeddings
- **Top2Vec** - Document embeddings → topics
- **KeyBERT** - Keyword extraction

### Purpose
Uncover emergent themes from reviews, social posts, and user notes; inform editorial taxonomy and dynamic prompt selection.

### Data Requirements
- Text corpus: reviews, user notes, social mentions
- Document metadata: destination_id, timestamp, source
- Topics per destination (stored in `destination_topics` table)

### Use-Cases in Urban Manual

1. **Dynamic Tag Suggestions**
   - Extract themes: "farm-to-table", "mid-century design", "hidden gem"
   - Auto-suggest tags for editorial team
   - Enhance `destinations.tags` array

2. **Trending Topics Dashboard**
   - "Trending in Tokyo: matcha croissants, sakura photography"
   - Power discovery prompts: "Explore Tokyo's matcha scene"
   - Surface on city pages

3. **Editorial Taxonomy Enhancement**
   - Discover new category labels
   - Identify subtopics within existing categories
   - Inform content strategy

### Integration Points
- `app/api/topics/{city}` - Return trending topics
- Admin dashboard - Topic extraction tool
- Discovery prompts - Incorporate topics

### Libraries
- `bertopic` (Python) - Recommended, modern approach
- `gensim` (Python) - LDA implementation
- `keybert` (Python) - Keyword extraction

### Current State
- ⚠️ Gap: No topic modeling yet
- 📝 Plan: Batch job weekly, store topics in Supabase

---

## 7. Anomaly Detection

### Models
- **Isolation Forest** - Fast anomaly detection
- **One-Class SVM** - Boundary-based
- **Variational Autoencoders (VAE)** - Deep learning approach
- **Statistical Methods** - Z-score, IQR-based

### Purpose
Flag unusual surges in traffic, booking cancellations, or sentiment; trigger editorial review; inform dynamic prompts about sudden events.

### Data Requirements
- Time-series metrics: views, saves, searches per destination
- Historical baselines
- Event logs (festivals, news events)
- Anomaly flags and explanations

### Use-Cases in Urban Manual

1. **Traffic Spike Detection**
   - Detect unusual views/saves for a destination
   - Alert editors: "Palace Hotel Tokyo traffic up 300%"
   - Generate context: "Recently featured in [media outlet]"

2. **Sentiment Anomaly**
   - Sudden drop in positive sentiment
   - Flag for quality review
   - May indicate issues or fake reviews

3. **Event Correlation**
   - Correlate traffic spikes with external events
   - "Design Week in Milan caused 40% traffic increase"
   - Inform seasonality forecasts

### Integration Points
- `app/api/anomaly/{city}` - Return anomaly flags
- Admin dashboard - Anomaly alerts
- Place pages - Show "In the spotlight" badges

### Libraries
- `scikit-learn` - Isolation Forest, One-Class SVM
- `tensorflow` or `pytorch` - For VAE
- `pandas` - Data processing

### Current State
- ⚠️ Gap: No anomaly detection yet
- 📝 Plan: Python service monitors daily, stores flags

---

## 8. Event Correlation & Rule-Based Enrichment

### Models
- **Rule-Based Mapping** - Explicit event → destination associations
- **Learning-to-Rank** - Rank events by predicted impact
- **Graph Neural Networks** - Model event-destination relationships

### Purpose
Associate festivals, exhibitions, weather events with destinations; generate contextual prompts; adjust itinerary suggestions.

### Data Requirements
- Event database (currently: `services/seasonality.ts`)
- Event → destination/city mappings
- Historical impact data (traffic changes during events)
- Event metadata: dates, location, type, predicted impact

### Use-Cases in Urban Manual

1. **Contextual Prompts**
   - "Design Week starts June 5 in Milan"
   - "Cherry blossoms peak March 22–April 5 in Tokyo"
   - Display on city pages and discovery prompts

2. **Itinerary Suggestions**
   - During Design Week: Suggest design hotels, showrooms
   - During cherry blossoms: Suggest sakura-view restaurants
   - Adjust recommendation weights

3. **Demand Forecasting Enhancement**
   - Events as regressors in Prophet models
   - Predict booking demand spikes
   - Inform "Book Early" prompts

### Integration Points
- ✅ `services/seasonality.ts` - Current implementation
- `app/api/discovery-prompts` - Event-aware prompts
- Itinerary builder - Event-based suggestions

### Libraries
- Custom logic (TypeScript) - Rule-based for now
- `prophet` - Event regressors
- Optional: `networkx` (Python) - Event-destination graph

### Current State
- ✅ Seasonality service exists
- ⚠️ Enhance: Add more events, impact scoring

---

## 9. Graph-Based Recommendations & Itinerary Sequencing

### Models
- **Graph Neural Networks (GNN)**
  - GraphSAGE - Neighborhood aggregation
  - Graph Attention Network (GAT) - Attention-based
- **Random Walks** - Personalized PageRank
- **Knowledge Graphs** - Structured relationships

### Purpose
Recommend venues frequently visited together; propose optimal sequences (breakfast → museum → dinner); support multi-day itinerary optimization.

### Data Requirements
- User visit sequences (`visit_history` table)
- Co-visitation patterns (user visits A then B)
- Geographic proximity (lat/lng for distance)
- Temporal patterns (breakfast → lunch → dinner)
- Graph structure: nodes (destinations), edges (co-visitation frequency)

### Use-Cases in Urban Manual

1. **"Complete Your Day" Suggestions**
   - User adds breakfast place → suggest nearby lunch, dinner, activities
   - Based on common sequences: "People who visit X often add Y next"
   - Show on itinerary page

2. **Multi-Day Itinerary Optimization**
   - Given 3 days in Tokyo, suggest optimal sequence
   - Consider: location, category diversity, user preferences
   - Minimize travel time, maximize experience quality

3. **Neighborhood Exploration**
   - "Explore Ginza" → suggest nearby restaurants, shops, galleries
   - Based on geographic + co-visitation graph
   - Power neighborhood discovery feature

### Integration Points
- `contexts/ItineraryContext.tsx` - Add sequencing logic
- `app/itinerary/page.tsx` - Show "Add nearby" suggestions
- `app/api/itinerary-suggest/{placeId}` - Return next places

### Libraries
- `networkx` (Python) - Graph construction and analysis
- `dgl` or `pytorch-geometric` - GNN training (future)
- Store graph edges in Supabase `co_visitation_graph` table

### Current State
- ⚠️ Gap: No graph-based sequencing yet
- ✅ Data: Visit history tracked
- 📝 Plan: Build graph from visit_history, serve via API

---

## 10. Sequence Models for Travel Patterns

### Models
- **RNNs (GRU/LSTM)** - Sequential pattern learning
- **Temporal Convolutional Networks (TCN)** - Fast sequence modeling
- **Transformer-based** - GPT-style fine-tunes for sequences

### Purpose
Predict the next category or venue a user might be interested in based on their browsing sequence; power "What's next?" suggestions.

### Data Requirements
- User browsing sequences (page views, time between views)
- Session data (session_id, timestamp)
- Sequence labels (destination categories, cities)
- Context features (time of day, device, source)

### Use-Cases in Urban Manual

1. **"What's Next?" Suggestions**
   - User views: Tokyo hotels → Tokyo restaurants → suggest activities/culture
   - Based on common browsing patterns
   - Show in sidebar or discovery section

2. **Session-Based Recommendations**
   - Within a session, predict next likely interest
   - Personalize homepage feed during active browsing
   - Adapt search suggestions based on sequence

3. **Category Transitions**
   - Learn: Hotel → Restaurant → Bar is common
   - Suggest: "After dinner, explore nightlife"
   - Power dynamic prompts

### Integration Points
- `app/api/next-suggestion` - Return next likely interest
- Homepage - Sequence-aware feed
- Search bar - Context-aware autocomplete

### Libraries
- `tensorflow` or `pytorch` - RNN/Transformer models
- `keras` - High-level API
- Store sequences in `user_session_sequences` table

### Current State
- ⚠️ Gap: No sequence modeling yet
- ✅ Data: User interactions tracked with timestamps
- 📝 Plan: Build session sequences, train weekly model

---

## 11. Explainable AI (XAI)

### Methods
- **SHAP (SHapley Additive exPlanations)** - Feature importance
- **LIME (Local Interpretable Model-agnostic Explanations)** - Local explanations
- **Attention Visualizations** - For transformer models
- **Rule Extraction** - Decision trees, rule lists

### Purpose
Provide transparent rationales for recommendations; build user trust; enable editorial oversight.

### Data Requirements
- Model outputs (recommendations, scores)
- Feature importance scores
- Explanation templates
- User feedback on explanations (for validation)

### Use-Cases in Urban Manual

1. **Recommendation Explanations**
   - "Because you saved 3 Michelin restaurants, we suggest..."
   - "Similar to Aman Tokyo (which you visited)"
   - Display below recommended destinations

2. **Forecast Explanations**
   - "Demand peaks March 22 because of cherry blossoms"
   - "Prices typically increase 15% during this period"
   - Show on account insights dashboard

3. **Editorial Transparency**
   - Admin dashboard: "Why was X recommended to user Y?"
   - Review model decisions
   - Override if needed

### Integration Points
- All recommendation APIs - Include `explanation` field
- Account page - Show recommendation reasons
- Admin dashboard - Model transparency tools

### Libraries
- `shap` (Python) - SHAP values
- `lime` (Python) - LIME explanations
- Custom templates (TypeScript) - Format explanations

### Current State
- ✅ Partial: `AIRecommendationEngine` returns `reason` field
- ⚠️ Enhance: Add SHAP/LIME for CF models
- 📝 Plan: Compute explanations server-side, store with recommendations

---

## 12. Reinforcement & Bandit Algorithms

### Models
- **Contextual Bandits** - Multi-armed bandits with context
- **Thompson Sampling** - Bayesian approach
- **LinUCB** - Linear Upper Confidence Bound
- **ε-Greedy** - Simple exploration-exploitation

### Purpose
Optimize which prompts or recommendations to show to maximize engagement; learn from real-time user interactions; balance exploration of new venues with exploitation of known favorites.

### Data Requirements
- User context (profile, preferences, session state)
- Available actions (recommendations, prompts to show)
- Rewards (click-through, save, visit)
- Historical performance per action-context pair

### Use-Cases in Urban Manual

1. **Prompt Selection Optimization**
   - Which discovery prompt to show on city page?
   - Test seasonal vs. personalized vs. trending
   - Learn which performs best per user segment

2. **Recommendation Ranking**
   - Balance showing new destinations (exploration) vs. known favorites (exploitation)
   - Adapt to user engagement patterns
   - Optimize for long-term user satisfaction

3. **A/B Testing Framework**
   - Systematically test UI variations
   - Learn optimal configurations
   - Power "smart" feature flags

### Integration Points
- All recommendation/prompt APIs - Use bandit for selection
- Analytics - Track rewards (clicks, saves)
- Admin dashboard - Bandit performance metrics

### Libraries
- `mabwiser` (Python) - Multi-armed bandits
- `vowpal-wabbit` - Fast contextual bandits
- Custom implementation - Lightweight for Node.js

### Current State
- ⚠️ Gap: No bandit algorithms yet
- 📝 Plan: Start with simple ε-greedy, evolve to contextual bandits

---

## Summary: Current State vs. Planned

### ✅ Already Implemented
- Vector embeddings (pgvector in Supabase)
- AI recommendation engine (Gemini-based)
- Seasonality service (rule-based)
- Content-based similarity (via embeddings)
- Basic hybrid recommendations

### ⚠️ Needs Enhancement
- Collaborative filtering (add CF layer)
- Anomaly detection (add monitoring)
- Graph-based sequencing (build from visit_history)
- Sentiment analysis (process user notes/reviews)

### 📝 To Build
- Time-series forecasting (Prophet for demand)
- Topic modeling (BERTopic for themes)
- Sequence models (RNN for browsing patterns)
- Bandit algorithms (optimize prompt selection)
- XAI (SHAP/LIME for explanations)

---

## Next Steps

1. **Priority 1**: Collaborative Filtering (high impact, moderate complexity)
2. **Priority 2**: Time-Series Forecasting (user-requested, powers insights)
3. **Priority 3**: Graph-Based Sequencing (enhances itinerary builder)
4. **Priority 4**: Sentiment Analysis (adds trending intelligence)
5. **Priority 5**: Topic Modeling (inform editorial taxonomy)

See `INTELLIGENCE_EXPANSION_PLAN.md` for detailed implementation roadmap.

