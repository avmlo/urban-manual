"""Collaborative filtering recommendation endpoints."""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

from app.models.collaborative_filtering import get_model, CollaborativeFilteringModel
from app.utils.database import get_db_connection
from app.utils.logger import get_logger
from app.config import get_settings

router = APIRouter()
logger = get_logger(__name__)
settings = get_settings()


class RecommendationRequest(BaseModel):
    """Request model for recommendations."""
    user_id: str = Field(..., description="User ID to get recommendations for")
    top_n: int = Field(10, ge=1, le=50, description="Number of recommendations")
    exclude_visited: bool = Field(True, description="Exclude visited destinations")
    exclude_saved: bool = Field(True, description="Exclude saved destinations")


class RecommendationItem(BaseModel):
    """Single recommendation item."""
    destination_id: int
    slug: str
    name: str
    city: str
    category: str
    score: float
    reason: str


class RecommendationResponse(BaseModel):
    """Response model for recommendations."""
    user_id: str
    recommendations: List[RecommendationItem]
    total: int
    model_version: str
    generated_at: str
    from_cache: bool = False


class TrainRequest(BaseModel):
    """Request model for training."""
    epochs: Optional[int] = None
    num_threads: Optional[int] = None


class TrainResponse(BaseModel):
    """Response model for training."""
    status: str
    message: str
    trained_at: Optional[str] = None


@router.post("/collaborative", response_model=RecommendationResponse, tags=["Recommendations"])
async def get_collaborative_recommendations(request: RecommendationRequest):
    """
    Get collaborative filtering recommendations for a user.

    Uses LightFM hybrid model combining user-item interactions with features.

    Args:
        request: Recommendation request parameters

    Returns:
        List of personalized recommendations
    """
    logger.info(f"Getting recommendations for user {request.user_id}")

    try:
        # Get model instance
        model = get_model()

        if not model.model:
            raise HTTPException(
                status_code=503,
                detail="Model not trained yet. Please train the model first."
            )

        # Get user's excluded destinations
        exclude_ids = []
        if request.exclude_visited or request.exclude_saved:
            exclude_ids = _get_user_interactions(
                request.user_id,
                include_visited=request.exclude_visited,
                include_saved=request.exclude_saved
            )

        # Generate recommendations
        recommendations = model.predict_for_user(
            user_id=request.user_id,
            top_n=request.top_n,
            exclude_ids=exclude_ids
        )

        # Enrich with destination details
        enriched_recommendations = _enrich_recommendations(recommendations)

        return RecommendationResponse(
            user_id=request.user_id,
            recommendations=enriched_recommendations,
            total=len(enriched_recommendations),
            model_version="lightfm-v1",
            generated_at=datetime.utcnow().isoformat(),
            from_cache=False
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/collaborative/{user_id}", response_model=RecommendationResponse, tags=["Recommendations"])
async def get_user_recommendations(
    user_id: str,
    top_n: int = Query(10, ge=1, le=50),
    exclude_visited: bool = Query(True),
    exclude_saved: bool = Query(True)
):
    """
    Get collaborative filtering recommendations for a user (GET endpoint).

    Args:
        user_id: User ID to get recommendations for
        top_n: Number of recommendations
        exclude_visited: Exclude visited destinations
        exclude_saved: Exclude saved destinations

    Returns:
        List of personalized recommendations
    """
    request = RecommendationRequest(
        user_id=user_id,
        top_n=top_n,
        exclude_visited=exclude_visited,
        exclude_saved=exclude_saved
    )

    return await get_collaborative_recommendations(request)


@router.post("/train", response_model=TrainResponse, tags=["Model Management"])
async def train_model(
    background_tasks: BackgroundTasks,
    request: TrainRequest = TrainRequest()
):
    """
    Train the collaborative filtering model (enhanced).

    This is a long-running operation that runs in the background.
    Includes recency weighting, temporal features, and evaluation.

    Args:
        request: Training parameters

    Returns:
        Training status
    """
    logger.info("Received training request (enhanced)")

    # Add training task to background
    background_tasks.add_task(
        _train_model_task,
        epochs=request.epochs,
        num_threads=request.num_threads
    )

    return TrainResponse(
        status="training_started",
        message="Enhanced model training started in background. Includes recency weighting and temporal features. Check /model/status for progress."
    )


@router.get("/model/status", tags=["Model Management"])
async def get_model_status():
    """
    Get current model training status with evaluation metrics.

    Returns:
        Model status and metadata
    """
    model = get_model()

    is_trained = model.model is not None

    status = {
        "is_trained": is_trained,
        "trained_at": model.trained_at.isoformat() if model.trained_at else None,
        "num_users": len(model.user_id_map) if is_trained else 0,
        "num_items": len(model.item_id_map) if is_trained else 0,
        "model_type": "LightFM WARP (Enhanced)",
        "status": "ready" if is_trained else "not_trained",
        "evaluation_metrics": model.get_evaluation_metrics() if is_trained else {},
        "cache_size": len(model.recommendation_cache),
    }

    return status


def _train_model_task(epochs: Optional[int] = None, num_threads: Optional[int] = None):
    """Background task for model training (enhanced)."""
    try:
        logger.info("Starting enhanced model training task")
        model = get_model()
        success = model.train(epochs=epochs, num_threads=num_threads, evaluate=True)

        if success:
            metrics = model.get_evaluation_metrics()
            logger.info(f"Model training completed successfully. Metrics: {metrics}")
        else:
            logger.error("Model training failed")

    except Exception as e:
        logger.error(f"Error in training task: {e}")


@router.post("/cache/clear", tags=["Model Management"])
async def clear_cache():
    """
    Clear recommendation cache.
    
    Useful after model retraining or when cache becomes stale.
    """
    try:
        model = get_model()
        model.clear_cache()
        return {
            "status": "success",
            "message": "Recommendation cache cleared"
        }
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _get_user_interactions(
    user_id: str,
    include_visited: bool = True,
    include_saved: bool = True
) -> List[int]:
    """
    Get list of destination IDs user has interacted with.

    Args:
        user_id: User ID
        include_visited: Include visited destinations
        include_saved: Include saved destinations

    Returns:
        List of destination IDs
    """
    destination_ids = []

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if include_visited:
                    cur.execute("""
                        SELECT DISTINCT d.id
                        FROM visited_places vp
                        JOIN destinations d ON d.slug = vp.destination_slug
                        WHERE vp.user_id = %s
                    """, (user_id,))
                    destination_ids.extend([row[0] for row in cur.fetchall()])

                if include_saved:
                    cur.execute("""
                        SELECT DISTINCT d.id
                        FROM saved_places sp
                        JOIN destinations d ON d.slug = sp.destination_slug
                        WHERE sp.user_id = %s
                    """, (user_id,))
                    destination_ids.extend([row[0] for row in cur.fetchall()])

        return list(set(destination_ids))

    except Exception as e:
        logger.error(f"Error fetching user interactions: {e}")
        return []


def _enrich_recommendations(recommendations: List[dict]) -> List[RecommendationItem]:
    """
    Enrich recommendations with destination details.

    Args:
        recommendations: List of basic recommendations with destination_id and score

    Returns:
        List of enriched recommendation items
    """
    if not recommendations:
        return []

    destination_ids = [r['destination_id'] for r in recommendations]

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Fetch destination details
                cur.execute("""
                    SELECT id, slug, name, city, category
                    FROM destinations
                    WHERE id = ANY(%s)
                """, (destination_ids,))

                destinations = {row[0]: row for row in cur.fetchall()}

        enriched = []
        for rec in recommendations:
            dest_id = rec['destination_id']
            if dest_id in destinations:
                dest = destinations[dest_id]
                enriched.append(RecommendationItem(
                    destination_id=dest_id,
                    slug=dest[1],
                    name=dest[2],
                    city=dest[3],
                    category=dest[4],
                    score=rec['score'],
                    reason=rec.get('reason', 'Recommended for you')
                ))

        return enriched

    except Exception as e:
        logger.error(f"Error enriching recommendations: {e}")
        return []


@router.post("/batch", tags=["Recommendations"])
async def get_batch_recommendations(
    user_ids: List[str] = Query(..., description="List of user IDs"),
    top_n: int = Query(10, ge=1, le=50)
):
    """
    Get recommendations for multiple users in batch.

    Args:
        user_ids: List of user IDs
        top_n: Number of recommendations per user

    Returns:
        Dictionary mapping user_id to recommendations
    """
    logger.info(f"Batch recommendations for {len(user_ids)} users")

    try:
        model = get_model()

        if not model.model:
            raise HTTPException(
                status_code=503,
                detail="Model not trained yet."
            )

        # Generate batch recommendations
        batch_results = model.predict_batch(user_ids, top_n=top_n)

        # Enrich each user's recommendations
        enriched_results = {}
        for user_id, recs in batch_results.items():
            enriched_results[user_id] = _enrich_recommendations(recs)

        return {
            "total_users": len(user_ids),
            "recommendations": enriched_results,
            "generated_at": datetime.utcnow().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in batch recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))
