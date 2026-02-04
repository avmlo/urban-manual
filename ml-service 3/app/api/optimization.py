"""API endpoints for Phase 4: Optimization & Polish features."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

from app.models.explainable_ai import get_xai
from app.models.bandit_algorithms import get_prompt_bandit
from app.models.sequence_models import get_browsing_analyzer
from app.utils.performance import get_performance_monitor
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


# Explainable AI Endpoints

class ExplanationRequest(BaseModel):
    """Request for model explanation."""
    user_id: str
    destination_id: int
    method: str = Field("shap", description="Explanation method: 'shap', 'lime', or 'simple'")


@router.post("/explain/recommendation", tags=["Explainable AI"])
async def explain_recommendation(request: ExplanationRequest):
    """Explain why a destination was recommended to a user."""
    try:
        xai = get_xai()
        explanation = xai.explain_recommendation(
            request.user_id,
            request.destination_id,
            method=request.method
        )
        return explanation
    except Exception as e:
        logger.error(f"Error explaining recommendation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/explain/forecast/{destination_id}", tags=["Explainable AI"])
async def explain_forecast(
    destination_id: int,
    forecast_date: str = Query(..., description="ISO format date")
):
    """Explain demand forecast for a destination."""
    try:
        xai = get_xai()
        forecast_dt = datetime.fromisoformat(forecast_date)
        explanation = xai.explain_forecast(destination_id, forecast_dt)
        return explanation
    except Exception as e:
        logger.error(f"Error explaining forecast: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Bandit Algorithm Endpoints

@router.get("/bandit/prompt/select", tags=["Bandit Algorithms"])
async def select_prompt(
    user_segment: str = Query("default", description="User segment"),
    algorithm: str = Query("epsilon_greedy", description="Bandit algorithm")
):
    """Select a discovery prompt using bandit algorithm."""
    try:
        bandit = get_prompt_bandit()
        prompt = bandit.select_prompt(user_segment, algorithm)
        return {
            'user_segment': user_segment,
            'selected_prompt': prompt,
            'algorithm': algorithm,
            'selected_at': datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error(f"Error selecting prompt: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bandit/prompt/reward", tags=["Bandit Algorithms"])
async def record_prompt_reward(
    user_segment: str,
    prompt: str,
    reward: float = Field(..., ge=0.0, le=1.0, description="Reward value (0.0 to 1.0)")
):
    """Record reward for a prompt selection."""
    try:
        bandit = get_prompt_bandit()
        bandit.record_reward(user_segment, prompt, reward)
        return {
            'status': 'success',
            'message': 'Reward recorded',
            'user_segment': user_segment,
            'prompt': prompt,
            'reward': reward,
        }
    except Exception as e:
        logger.error(f"Error recording reward: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bandit/prompt/statistics", tags=["Bandit Algorithms"])
async def get_prompt_statistics(
    user_segment: Optional[str] = Query(None, description="Optional user segment filter")
):
    """Get bandit statistics for prompt selection."""
    try:
        bandit = get_prompt_bandit()
        stats = bandit.get_statistics(user_segment)
        return stats
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Sequence Model Endpoints

class SessionAnalysisRequest(BaseModel):
    """Request for session analysis."""
    user_id: str
    session_actions: List[Dict] = Field(..., description="List of actions with timestamps")


@router.post("/sequence/analyze-session", tags=["Sequence Models"])
async def analyze_session(request: SessionAnalysisRequest):
    """Analyze user browsing session and predict next actions."""
    try:
        analyzer = get_browsing_analyzer()
        analysis = analyzer.analyze_user_session(request.user_id, request.session_actions)
        return analysis
    except Exception as e:
        logger.error(f"Error analyzing session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sequence/predict-next", tags=["Sequence Models"])
async def predict_next_actions(
    current_sequence: List[str] = Field(..., description="Current sequence of actions"),
    top_n: int = Query(3, ge=1, le=10)
):
    """Predict next actions given current sequence."""
    try:
        analyzer = get_browsing_analyzer()
        predictions = analyzer.sequence_model.predict_next(current_sequence, top_n)
        return {
            'current_sequence': current_sequence,
            'predictions': predictions,
            'generated_at': datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error(f"Error predicting next actions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sequence/train", tags=["Sequence Models"])
async def train_sequence_model(
    days: int = Query(30, ge=1, le=365, description="Days of historical data")
):
    """Train sequence model on historical browsing data."""
    try:
        analyzer = get_browsing_analyzer()
        metadata = await analyzer.train_on_historical_data(days)
        status = metadata.get('status', 'success')
        message = (
            'Sequence model trained successfully'
            if status == 'trained'
            else 'No browsing sequences available for training'
        )
        return {
            'status': status,
            'message': message,
            'metadata': metadata,
            'generated_at': datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error(f"Error training sequence model: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Performance Monitoring Endpoints

@router.get("/performance/statistics", tags=["Performance"])
async def get_performance_statistics(
    operation: Optional[str] = Query(None, description="Optional operation filter")
):
    """Get performance statistics."""
    try:
        monitor = get_performance_monitor()
        if operation:
            stats = monitor.get_statistics(operation)
            return stats
        else:
            stats = monitor.get_all_statistics()
            return stats
    except Exception as e:
        logger.error(f"Error getting performance statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

