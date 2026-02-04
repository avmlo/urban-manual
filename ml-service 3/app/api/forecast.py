"""Demand forecasting API endpoints."""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

from app.models.demand_forecast import get_forecast_model
from app.services.forecast_training import get_forecast_training_pipeline
from app.utils.database import get_db_connection
from app.utils.logger import get_logger
from app.config import get_settings

router = APIRouter()
logger = get_logger(__name__)
settings = get_settings()


class ForecastRequest(BaseModel):
    """Request model for demand forecast."""
    destination_id: int = Field(..., description="Destination ID to forecast")
    periods: int = Field(30, ge=1, le=90, description="Number of days to forecast")


class ForecastPoint(BaseModel):
    """Single forecast data point."""
    date: str
    demand: float
    lower_bound: float
    upper_bound: float


class ForecastResponse(BaseModel):
    """Response model for forecast."""
    destination_id: int
    forecast: List[ForecastPoint]
    generated_at: str


class TrendingDestination(BaseModel):
    """Trending destination model."""
    destination_id: int
    slug: str
    name: str
    city: str
    category: str
    growth_rate: float
    current_demand: float
    forecast_demand: float
    image: Optional[str] = None


class TrendingResponse(BaseModel):
    """Response for trending destinations."""
    trending: List[TrendingDestination]
    total: int
    generated_at: str


class PeakTimesResponse(BaseModel):
    """Response for peak times."""
    destination_id: int
    peak_date: str
    peak_demand: float
    low_date: str
    low_demand: float
    average_demand: float
    forecast_period_days: int
    recommendation: str


class TrainForecastRequest(BaseModel):
    """Request for training forecast models."""
    top_n: int = Field(200, ge=10, le=500, description="Number of top destinations")
    historical_days: int = Field(180, ge=30, le=365, description="Days of historical data")


class TrainForecastResponse(BaseModel):
    """Response for training."""
    status: str
    message: str
    stats: Optional[Dict] = None


@router.post("/demand", response_model=ForecastResponse, tags=["Forecasting"])
async def get_demand_forecast(request: ForecastRequest):
    """
    Get demand forecast for a specific destination.

    Uses Prophet time-series forecasting to predict future demand.

    Args:
        request: Forecast request parameters

    Returns:
        Demand forecast for the specified period
    """
    logger.info(f"Getting demand forecast for destination {request.destination_id}")

    try:
        pipeline = get_forecast_training_pipeline()
        pipeline.ensure_fresh_models()
        model = get_forecast_model()

        # Check if model is trained for this destination
        if request.destination_id not in model.models:
            raise HTTPException(
                status_code=404,
                detail=f"No forecast model for destination {request.destination_id}. Train the model first."
            )

        # Generate forecast
        forecast_df = model.forecast_destination(
            destination_id=request.destination_id,
            periods=request.periods
        )

        if forecast_df is None:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate forecast"
            )

        # Get only future predictions
        future_forecast = forecast_df.tail(request.periods)

        # Format response
        forecast_points = [
            ForecastPoint(
                date=row['ds'].isoformat(),
                demand=float(row['yhat']),
                lower_bound=float(row['yhat_lower']),
                upper_bound=float(row['yhat_upper'])
            )
            for _, row in future_forecast.iterrows()
        ]

        return ForecastResponse(
            destination_id=request.destination_id,
            forecast=forecast_points,
            generated_at=datetime.utcnow().isoformat()
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating forecast: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/demand/{destination_id}", response_model=ForecastResponse, tags=["Forecasting"])
async def get_destination_forecast(
    destination_id: int,
    periods: int = Query(30, ge=1, le=90)
):
    """
    Get demand forecast for a destination (GET endpoint).

    Args:
        destination_id: Destination ID
        periods: Number of days to forecast

    Returns:
        Demand forecast
    """
    request = ForecastRequest(
        destination_id=destination_id,
        periods=periods
    )

    return await get_demand_forecast(request)


@router.get("/trending", response_model=TrendingResponse, tags=["Forecasting"])
async def get_trending_destinations(
    top_n: int = Query(20, ge=1, le=100),
    forecast_days: int = Query(7, ge=1, le=30)
):
    """
    Get trending destinations based on forecast growth.

    Identifies destinations with increasing demand in the near future.

    Args:
        top_n: Number of trending destinations
        forecast_days: Days ahead to analyze for trends

    Returns:
        List of trending destinations
    """
    logger.info(f"Getting top {top_n} trending destinations")

    try:
        pipeline = get_forecast_training_pipeline()
        pipeline.ensure_fresh_models()
        model = get_forecast_model()

        if not model.models:
            raise HTTPException(
                status_code=503,
                detail="Forecast models not trained yet. Train the model first."
            )

        # Get trending destinations
        trending = model.get_trending_destinations(
            top_n=top_n,
            forecast_days=forecast_days
        )

        # Enrich with destination details
        enriched_trending = _enrich_trending(trending)

        return TrendingResponse(
            trending=enriched_trending,
            total=len(enriched_trending),
            generated_at=datetime.utcnow().isoformat()
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting trending destinations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/peak-times/{destination_id}", response_model=PeakTimesResponse, tags=["Forecasting"])
async def get_peak_times(
    destination_id: int,
    forecast_days: int = Query(30, ge=7, le=90)
):
    """
    Get peak and low demand times for a destination.

    Helps users plan visits during optimal times.

    Args:
        destination_id: Destination ID
        forecast_days: Days to analyze

    Returns:
        Peak and low demand periods
    """
    logger.info(f"Getting peak times for destination {destination_id}")

    try:
        pipeline = get_forecast_training_pipeline()
        pipeline.ensure_fresh_models()
        model = get_forecast_model()

        if destination_id not in model.models:
            raise HTTPException(
                status_code=404,
                detail=f"No forecast model for destination {destination_id}"
            )

        # Get peak times
        peak_info = model.get_peak_times(
            destination_id=destination_id,
            forecast_days=forecast_days
        )

        if peak_info is None:
            raise HTTPException(
                status_code=500,
                detail="Failed to calculate peak times"
            )

        # Generate recommendation
        peak_date = datetime.fromisoformat(peak_info['peak_date'])
        low_date = datetime.fromisoformat(peak_info['low_date'])

        recommendation = f"Visit during {low_date.strftime('%B %d')} for a quieter experience, or {peak_date.strftime('%B %d')} for peak activity."

        return PeakTimesResponse(
            destination_id=peak_info['destination_id'],
            peak_date=peak_info['peak_date'],
            peak_demand=peak_info['peak_demand'],
            low_date=peak_info['low_date'],
            low_demand=peak_info['low_demand'],
            average_demand=peak_info['average_demand'],
            forecast_period_days=peak_info['forecast_period_days'],
            recommendation=recommendation
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting peak times: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/train", response_model=TrainForecastResponse, tags=["Model Management"])
async def train_forecast_models(
    background_tasks: BackgroundTasks,
    request: TrainForecastRequest = TrainForecastRequest()
):
    """
    Train forecast models for top destinations.

    This is a long-running operation that runs in the background.

    Args:
        request: Training parameters

    Returns:
        Training status
    """
    logger.info("Received forecast training request")

    # Add training task to background
    background_tasks.add_task(
        _train_forecast_task,
        top_n=request.top_n,
        historical_days=request.historical_days
    )

    return TrainForecastResponse(
        status="training_started",
        message=f"Forecast training started for top {request.top_n} destinations. Check /forecast/status for progress."
    )


@router.get("/status", tags=["Model Management"])
async def get_forecast_status():
    """
    Get forecast model status.

    Returns:
        Model status and metadata
    """
    model = get_forecast_model()
    pipeline = get_forecast_training_pipeline()
    pipeline_status = pipeline.status()

    num_models = len(model.models)
    is_trained = num_models > 0

    return {
        "is_trained": is_trained,
        "trained_at": model.trained_at.isoformat() if model.trained_at else None,
        "num_destinations": num_models,
        "model_type": "Prophet",
        "status": "ready" if is_trained else "not_trained",
        "pipeline_last_refresh": pipeline_status["last_refresh"],
        "pipeline_refreshing": pipeline_status["refresh_in_progress"],
        "cached_summaries": pipeline_status["cached_summaries"],
    }


def _train_forecast_task(top_n: int, historical_days: int):
    """Background task for forecast model training."""
    try:
        logger.info(f"Starting forecast training for top {top_n} destinations")
        pipeline = get_forecast_training_pipeline()
        stats = pipeline.run_training(top_n=top_n, historical_days=historical_days)

        logger.info(f"Forecast training completed: {stats}")

    except Exception as e:
        logger.error(f"Error in forecast training task: {e}")


def _enrich_trending(trending: List[dict]) -> List[TrendingDestination]:
    """
    Enrich trending destinations with details.

    Args:
        trending: List of trending destinations with IDs and growth rates

    Returns:
        List of enriched trending destinations
    """
    if not trending:
        return []

    destination_ids = [t['destination_id'] for t in trending]

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Fetch destination details including image
                cur.execute("""
                    SELECT id, slug, name, city, category, image
                    FROM destinations
                    WHERE id = ANY(%s)
                """, (destination_ids,))

                destinations = {row[0]: row for row in cur.fetchall()}

        enriched = []
        for trend in trending:
            dest_id = trend['destination_id']
            if dest_id in destinations:
                dest = destinations[dest_id]
                enriched.append(TrendingDestination(
                    destination_id=dest_id,
                    slug=dest[1],
                    name=dest[2],
                    city=dest[3],
                    category=dest[4],
                    growth_rate=trend['growth_rate'],
                    current_demand=trend['current_demand'],
                    forecast_demand=trend['forecast_demand'],
                    image=dest[5] if len(dest) > 5 else None
                ))

        return enriched

    except Exception as e:
        logger.error(f"Error enriching trending destinations: {e}")
        return []
