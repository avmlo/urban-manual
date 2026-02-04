from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from datetime import datetime, timedelta
import math

app = FastAPI(title="Urban Manual Forecasting Service")

class SeriesPoint(BaseModel):
    ds: str  # ISO date
    y: float

class ForecastRequest(BaseModel):
    city: str
    series: List[SeriesPoint]
    periods: int = 28

class ForecastResponse(BaseModel):
    city: str
    interest_score: float
    trend_direction: str
    forecast: List[SeriesPoint]

def holt_linear_forecast(values: List[float], periods: int, alpha: float = 0.3, beta: float = 0.1):
    """
    Holt's Linear Exponential Smoothing for trend forecasting.
    More sophisticated than simple moving average.

    Args:
        values: Historical time series values
        periods: Number of periods to forecast
        alpha: Smoothing parameter for level (0-1)
        beta: Smoothing parameter for trend (0-1)

    Returns:
        List of forecasted values
    """
    if len(values) < 2:
        # Not enough data, return simple average
        avg = values[0] if values else 0
        return [avg] * periods

    # Initialize level and trend
    level = values[0]
    trend = (values[-1] - values[0]) / max(len(values) - 1, 1)

    # Smooth the historical data
    for value in values[1:]:
        prev_level = level
        level = alpha * value + (1 - alpha) * (level + trend)
        trend = beta * (level - prev_level) + (1 - beta) * trend

    # Generate forecast
    forecast = []
    for i in range(1, periods + 1):
        forecast_value = level + i * trend
        # Ensure non-negative forecasts
        forecast_value = max(0, forecast_value)
        forecast.append(forecast_value)

    return forecast

def detect_trend(values: List[float]) -> tuple[str, float]:
    """
    Detect trend direction and strength using linear regression.

    Returns:
        (direction, slope) where direction is 'up', 'down', or 'flat'
    """
    if len(values) < 2:
        return ("flat", 0.0)

    n = len(values)
    # Simple linear regression
    x_mean = (n - 1) / 2
    y_mean = sum(values) / n

    numerator = sum((i - x_mean) * (values[i] - y_mean) for i in range(n))
    denominator = sum((i - x_mean) ** 2 for i in range(n))

    if denominator == 0:
        return ("flat", 0.0)

    slope = numerator / denominator

    # Calculate significance threshold (5% of mean)
    threshold = abs(y_mean * 0.05) if y_mean != 0 else 0.5

    if abs(slope) < threshold:
        return ("flat", slope)
    elif slope > 0:
        return ("up", slope)
    else:
        return ("down", slope)

def calculate_interest_score(values: List[float], forecast: List[float]) -> float:
    """
    Calculate an interest score based on recent trend and forecasted growth.
    Score from 0-100, higher means more interest.
    """
    if not values or not forecast:
        return 50.0  # neutral

    recent_avg = sum(values[-min(7, len(values)):]) / min(7, len(values))
    forecast_avg = sum(forecast[:7]) / min(7, len(forecast))

    # Calculate growth rate
    if recent_avg > 0:
        growth_rate = (forecast_avg - recent_avg) / recent_avg
    else:
        growth_rate = 0

    # Convert to 0-100 scale
    # -50% to +50% growth maps to 0-100
    score = 50 + (growth_rate * 100)
    score = max(0, min(100, score))  # Clamp to 0-100

    # Boost score based on absolute values
    if recent_avg > 10:  # High baseline activity
        score = min(100, score * 1.1)

    return round(score, 2)

def parse_date(ds: str) -> Optional[datetime]:
    """Parse ISO date string to datetime."""
    try:
        return datetime.fromisoformat(ds.replace('Z', '+00:00'))
    except:
        return None

def generate_forecast_dates(last_date: Optional[datetime], periods: int) -> List[str]:
    """Generate forecast dates starting from the last historical date."""
    if last_date is None:
        # Use relative dates
        return [f"day+{i+1}" for i in range(periods)]

    forecast_dates = []
    for i in range(1, periods + 1):
        forecast_date = last_date + timedelta(days=i)
        forecast_dates.append(forecast_date.isoformat())

    return forecast_dates

@app.post("/forecast", response_model=ForecastResponse)
def forecast(req: ForecastRequest):
    """
    Generate time series forecast using Holt's Linear Exponential Smoothing.

    This replaces the previous naive stub implementation with a proper
    statistical forecasting method.
    """
    if not req.series:
        return ForecastResponse(
            city=req.city,
            interest_score=50.0,
            trend_direction="flat",
            forecast=[]
        )

    # Extract values and dates
    values = [p.y for p in req.series]

    # Detect trend
    trend_direction, slope = detect_trend(values)

    # Generate forecast using Holt's method
    forecast_values = holt_linear_forecast(values, req.periods)

    # Calculate interest score
    interest_score = calculate_interest_score(values, forecast_values)

    # Generate forecast dates
    last_date = parse_date(req.series[-1].ds) if req.series else None
    forecast_dates = generate_forecast_dates(last_date, req.periods)

    # Build forecast response
    forecast_points = [
        SeriesPoint(ds=date, y=round(value, 2))
        for date, value in zip(forecast_dates, forecast_values)
    ]

    return ForecastResponse(
        city=req.city,
        interest_score=interest_score,
        trend_direction=trend_direction,
        forecast=forecast_points
    )

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "forecasting"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
