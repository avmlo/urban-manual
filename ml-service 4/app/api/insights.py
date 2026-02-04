"""API endpoints for Phase 3 advanced features: sentiment, topics, anomalies, events."""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

from app.models.sentiment import get_sentiment_model
from app.models.topic_modeling import get_topic_model
from app.models.anomaly_detection import get_anomaly_model
from app.models.event_correlation import get_event_model
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


# Sentiment Analysis Endpoints

class SentimentAnalysisRequest(BaseModel):
    """Request for sentiment analysis."""
    texts: List[str] = Field(..., min_length=1, description="List of texts to analyze")


class SentimentAnalysisResponse(BaseModel):
    """Response from sentiment analysis."""
    results: List[Dict]
    total: int
    generated_at: str


@router.post("/sentiment/analyze", response_model=SentimentAnalysisResponse, tags=["Sentiment"])
async def analyze_sentiment(request: SentimentAnalysisRequest):
    """Analyze sentiment for a list of texts."""
    try:
        model = get_sentiment_model()
        results = model.analyze_texts(request.texts)
        
        return SentimentAnalysisResponse(
            results=results,
            total=len(results),
            generated_at=datetime.utcnow().isoformat()
        )
    except Exception as e:
        logger.error(f"Error in sentiment analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sentiment/destination/{destination_id}", tags=["Sentiment"])
async def get_destination_sentiment(
    destination_id: int,
    days: int = Query(30, ge=1, le=365)
):
    """Get sentiment analysis for a specific destination."""
    try:
        model = get_sentiment_model()
        result = model.analyze_destination_sentiment(destination_id, days)
        return result
    except Exception as e:
        logger.error(f"Error getting destination sentiment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Topic Modeling Endpoints

class TopicModelingRequest(BaseModel):
    """Request for topic modeling."""
    texts: List[str] = Field(..., min_length=5, description="List of texts (minimum 5)")
    min_topic_size: int = Field(5, ge=2, description="Minimum documents per topic")
    n_topics: Optional[int] = Field(None, ge=2, description="Optional fixed number of topics")


@router.post("/topics/extract", tags=["Topics"])
async def extract_topics(request: TopicModelingRequest):
    """Extract topics from a collection of texts."""
    try:
        model = get_topic_model()
        result = model.train(
            request.texts,
            min_topic_size=request.min_topic_size,
            n_topics=request.n_topics
        )
        return result
    except Exception as e:
        logger.error(f"Error extracting topics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/topics/city/{city}", tags=["Topics"])
async def get_city_topics(
    city: str,
    min_topic_size: int = Query(5, ge=2)
):
    """Extract topics for a specific city."""
    try:
        model = get_topic_model()
        result = model.extract_topics_for_city(city, min_topic_size)
        return result
    except Exception as e:
        logger.error(f"Error getting city topics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/topics/destination/{destination_id}", tags=["Topics"])
async def get_destination_topics(
    destination_id: int,
    min_topic_size: int = Query(3, ge=2)
):
    """Extract topics for a specific destination."""
    try:
        model = get_topic_model()
        result = model.extract_topics_for_destination(destination_id, min_topic_size)
        return result
    except Exception as e:
        logger.error(f"Error getting destination topics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Anomaly Detection Endpoints

@router.get("/anomaly/destination/{destination_id}", tags=["Anomaly"])
async def detect_destination_anomalies(
    destination_id: int,
    days: int = Query(30, ge=7, le=365),
    contamination: float = Query(0.1, ge=0.0, le=0.5)
):
    """Detect traffic anomalies for a destination."""
    try:
        model = get_anomaly_model()
        result = model.detect_traffic_anomalies(destination_id, days, contamination)
        return result
    except Exception as e:
        logger.error(f"Error detecting destination anomalies: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/anomaly/destination/{destination_id}/sentiment", tags=["Anomaly"])
async def detect_sentiment_anomalies(
    destination_id: int,
    days: int = Query(30, ge=7, le=365)
):
    """Detect sentiment anomalies for a destination."""
    try:
        model = get_anomaly_model()
        result = model.detect_sentiment_anomalies(destination_id, days)
        return result
    except Exception as e:
        logger.error(f"Error detecting sentiment anomalies: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/anomaly/city/{city}", tags=["Anomaly"])
async def detect_city_anomalies(
    city: str,
    days: int = Query(30, ge=7, le=365)
):
    """Detect anomalies across all destinations in a city."""
    try:
        model = get_anomaly_model()
        result = model.detect_city_anomalies(city, days)
        return result
    except Exception as e:
        logger.error(f"Error detecting city anomalies: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Event Correlation Endpoints

class EventCorrelationRequest(BaseModel):
    """Request for event correlation analysis."""
    event_name: str
    city: str
    start_date: str  # ISO format
    end_date: str  # ISO format
    destination_ids: Optional[List[int]] = None


@router.post("/events/correlate", tags=["Events"])
async def correlate_event_impact(request: EventCorrelationRequest):
    """Analyze impact of an event on destination traffic."""
    try:
        model = get_event_model()
        start_date = datetime.fromisoformat(request.start_date)
        end_date = datetime.fromisoformat(request.end_date)
        
        result = model.correlate_event_impact(
            request.event_name,
            request.city,
            (start_date, end_date),
            request.destination_ids
        )
        return result
    except Exception as e:
        logger.error(f"Error correlating event impact: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/events/recommendations/{city}", tags=["Events"])
async def get_event_recommendations(
    city: str,
    date: str = Query(..., description="ISO format date")
):
    """Get destination recommendations based on upcoming events."""
    try:
        model = get_event_model()
        event_date = datetime.fromisoformat(date)
        result = model.get_event_recommendations(city, event_date)
        return result
    except Exception as e:
        logger.error(f"Error getting event recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/events/enhance-forecast", tags=["Events"])
async def enhance_forecast_with_events(
    destination_id: int,
    city: str,
    forecast_dates: List[str]  # ISO format dates
):
    """Enhance demand forecast with event information."""
    try:
        model = get_event_model()
        dates = [datetime.fromisoformat(d) for d in forecast_dates]
        result = model.enhance_forecast_with_events(destination_id, dates, city)
        return result
    except Exception as e:
        logger.error(f"Error enhancing forecast with events: {e}")
        raise HTTPException(status_code=500, detail=str(e))

