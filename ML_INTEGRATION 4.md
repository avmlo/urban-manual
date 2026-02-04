# ML Service Integration Guide

This guide explains how to integrate the Python ML microservice with the Urban Manual Next.js app.

## 🎯 Overview

The ML service provides:
- **Collaborative Filtering**: Personalized recommendations using LightFM
- **Demand Forecasting**: Trending destinations and peak times using Prophet
- **Hybrid Approach**: Falls back to existing recommendations if ML service is unavailable

## 🚀 Quick Start

### 1. Setup ML Service

```bash
cd ml-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 2. Start ML Service

```bash
# Local development
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or with Docker
docker-compose up -d
```

### 3. Train Models

```bash
# Train collaborative filtering model
curl -X POST http://localhost:8000/api/recommendations/train \
  -H "Content-Type: application/json" \
  -d '{"epochs": 50, "num_threads": 4}'

# Train forecast models
curl -X POST http://localhost:8000/api/forecast/train \
  -H "Content-Type: application/json" \
  -d '{"top_n": 200, "historical_days": 180}'

# Check status
curl http://localhost:8000/api/health
```

### 4. Configure Next.js

Add to `.env.local`:
```bash
ML_SERVICE_URL=http://localhost:8000
```

### 5. Enable ML Components

Replace components in your pages:

```tsx
// Before
import { ForYouSection } from '@/components/ForYouSection';

// After
import { ForYouSectionML } from '@/components/ForYouSectionML';
import { TrendingSectionML } from '@/components/TrendingSectionML';

export default function Home() {
  return (
    <>
      <ForYouSectionML />
      <TrendingSectionML limit={12} forecastDays={7} />
    </>
  );
}
```

## 📊 Features

### 1. ML-Powered "For You" Recommendations

**Component**: `ForYouSectionML`

Features:
- Collaborative filtering using user-item interactions
- User and item features (city, category, price, etc.)
- LightFM WARP loss for implicit feedback
- Automatic fallback to existing recommendations
- Visual indicator showing ML vs standard recommendations

**Usage**:
```tsx
<ForYouSectionML />
```

### 2. Trending Destinations

**Component**: `TrendingSectionML`

Features:
- Prophet-based demand forecasting
- Growth rate predictions
- Visual trending badges
- Customizable forecast period

**Usage**:
```tsx
<TrendingSectionML
  limit={12}
  forecastDays={7}
/>
```

### 3. Custom Hooks

**useMLRecommendations**:
```tsx
import { useMLRecommendations } from '@/hooks/useMLRecommendations';

const {
  recommendations,
  loading,
  error,
  isMLPowered,
  isFallback,
  refetch
} = useMLRecommendations({
  enabled: true,
  topN: 10,
  excludeVisited: true,
  excludeSaved: true,
  fallbackToExisting: true
});
```

**useMLTrending**:
```tsx
import { useMLTrending } from '@/hooks/useMLRecommendations';

const {
  trending,
  loading,
  error
} = useMLTrending({
  enabled: true,
  topN: 20,
  forecastDays: 7
});
```

## 🔌 API Routes

Next.js proxy routes are automatically created:

- `/api/ml/recommend` - Collaborative filtering recommendations
- `/api/ml/forecast/trending` - Trending destinations
- `/api/ml/forecast/demand` - Demand forecast for specific destination
- `/api/ml/forecast/peak-times` - Peak time analysis
- `/api/ml/status` - ML service health check

## 🎨 UI Integration

### AI Badges

ML-powered sections show visual indicators:

```tsx
// "AI" badge for ML recommendations
{isMLPowered && (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
    <Sparkles className="h-3 w-3" />
    AI
  </span>
)}

// "Standard" badge for fallback
{isFallback && (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
    Standard
  </span>
)}
```

### Confidence Scores

Show ML confidence on hover:

```tsx
{isMLPowered && rec.score > 0.8 && (
  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
    {Math.round(rec.score * 100)}% match
  </div>
)}
```

### Trending Indicators

Show growth rates and trending badges:

```tsx
<div className="bg-gradient-to-r from-orange-500 to-red-500">
  <TrendingUp className="h-3 w-3" />
  +{Math.round(growthRate * 100)}%
</div>
```

## 🔄 Fallback Strategy

The integration is designed to be resilient:

1. **Try ML Service First**: Attempt to fetch from ML service
2. **Check Response**: Verify recommendations are returned
3. **Fallback to Existing**: If ML fails, use existing recommendation API
4. **Transform Data**: Convert existing format to ML format for consistency
5. **Visual Feedback**: Show badge indicating source (AI vs Standard)

This ensures the user experience is never degraded, even if the ML service is down.

## 📈 Analytics Tracking

ML recommendations are tracked with additional metadata:

```tsx
trackEvent({
  event_type: 'click',
  destination_id: rec.destination_id,
  metadata: {
    source: isMLPowered ? 'ml_for_you_section' : 'for_you_section',
    ml_score: rec.score,
    ml_powered: isMLPowered,
  }
});
```

This allows you to:
- Compare ML vs non-ML conversion rates
- A/B test ML recommendations
- Monitor ML model performance

## 🚢 Deployment

### Railway

1. Deploy ML service to Railway:
```bash
cd ml-service
railway up
```

2. Get Railway URL (e.g., `https://your-ml-service.railway.app`)

3. Update Next.js env:
```bash
ML_SERVICE_URL=https://your-ml-service.railway.app
```

### Fly.io

```bash
cd ml-service
fly launch
fly deploy
```

### Vercel (Next.js)

```bash
vercel env add ML_SERVICE_URL production
# Enter your ML service URL
vercel --prod
```

## 🔧 Configuration

### Environment Variables

**ML Service (.env)**:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
POSTGRES_URL=postgresql://...
LIGHTFM_EPOCHS=50
PROPHET_SEASONALITY_MODE=multiplicative
```

**Next.js (.env.local)**:
```bash
ML_SERVICE_URL=http://localhost:8000  # Development
ML_SERVICE_URL=https://your-ml-service.railway.app  # Production
```

## 📊 Monitoring

### Check ML Service Status

```tsx
// In your admin dashboard
const checkMLStatus = async () => {
  const response = await fetch('/api/ml/status');
  const status = await response.json();

  console.log('ML Service:', status.ml_service);
  console.log('Recommendations Model:', status.models.recommendations);
  console.log('Forecasting Model:', status.models.forecasting);
};
```

### Model Retraining Schedule

Set up cron jobs or scheduled tasks:

```bash
# Every week (Sunday at 2 AM)
0 2 * * 0 curl -X POST https://your-ml-service/api/recommendations/train

# Every day (at 3 AM)
0 3 * * * curl -X POST https://your-ml-service/api/forecast/train
```

## 🐛 Troubleshooting

### ML Service Not Responding

**Symptom**: Recommendations show "Standard" badge

**Check**:
```bash
# Test ML service directly
curl http://localhost:8000/api/health

# Check Next.js can reach ML service
curl http://localhost:3000/api/ml/status
```

### Model Not Trained

**Symptom**: Error "Model not trained yet"

**Solution**:
```bash
# Train both models
curl -X POST http://localhost:8000/api/recommendations/train
curl -X POST http://localhost:8000/api/forecast/train

# Wait for training to complete (check logs)
docker logs -f ml-service
```

### No Recommendations Returned

**Symptom**: Empty recommendations array

**Possible Causes**:
- Insufficient user interaction data
- User not in training set (new user)
- All destinations already visited/saved

**Solution**: Model automatically falls back to cold-start recommendations

## 🎯 Best Practices

1. **Always Enable Fallback**: Set `fallbackToExisting: true` in hooks
2. **Monitor Performance**: Track ML vs standard conversion rates
3. **Regular Retraining**: Weekly for collab filtering, daily for forecasting
4. **Graceful Degradation**: Show standard recommendations if ML fails
5. **Cache Aggressively**: ML service responses are cached for 1 hour
6. **A/B Testing**: Gradually roll out to percentage of users

## 📚 Further Reading

- [ML Service README](./ml-service/README.md) - Detailed ML service documentation
- [LightFM Documentation](https://making.lyst.com/lightfm/docs/home.html)
- [Prophet Documentation](https://facebook.github.io/prophet/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

## 🤝 Contributing

When adding new ML features:

1. Add endpoint to ML service (`ml-service/app/api/`)
2. Create Next.js proxy route (`app/api/ml/`)
3. Create hook if needed (`hooks/useML*.ts`)
4. Update components to use new feature
5. Add tests and documentation
6. Update this integration guide

## 📞 Support

For issues:
- Check ML service logs: `docker logs ml-service`
- Check Next.js console for errors
- Verify environment variables are set
- Test ML service health: `/api/ml/status`
