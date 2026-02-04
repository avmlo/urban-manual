"""Graph-based sequencing API endpoints."""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

from app.models.graph_sequencing import get_graph_model, GraphSequencingModel
from app.utils.database import get_db_connection
from app.utils.logger import get_logger
from app.config import get_settings

router = APIRouter()
logger = get_logger(__name__)
settings = get_settings()


class SuggestNextRequest(BaseModel):
    """Request model for next place suggestions."""
    destination_id: int = Field(..., description="Current destination ID")
    limit: int = Field(5, ge=1, le=20, description="Number of suggestions")
    exclude_ids: Optional[List[int]] = Field(None, description="Destination IDs to exclude")
    max_distance_km: Optional[float] = Field(10.0, ge=0, description="Maximum distance in km")


class SuggestNextResponse(BaseModel):
    """Response model for next place suggestions."""
    destination_id: int
    suggestions: List[Dict]
    total: int
    generated_at: str


class CompleteDayRequest(BaseModel):
    """Request model for complete day suggestions."""
    starting_place_id: int = Field(..., description="Starting destination ID")
    categories: Optional[List[str]] = Field(None, description="Preferred categories")
    max_places: int = Field(5, ge=2, le=10, description="Maximum places in sequence")


class OptimizeItineraryRequest(BaseModel):
    """Request model for itinerary optimization."""
    destination_ids: List[int] = Field(..., description="List of destination IDs to include")
    max_days: int = Field(3, ge=1, le=7, description="Maximum number of days")


class TrainGraphRequest(BaseModel):
    """Request model for training graph."""
    min_weight: int = Field(2, ge=1, description="Minimum edge weight to include")
    historical_days: int = Field(180, ge=30, le=365, description="Days of historical data")


@router.post("/suggest-next", response_model=SuggestNextResponse, tags=["Graph Sequencing"])
async def suggest_next_places(request: SuggestNextRequest):
    """
    Suggest next places based on co-visitation graph.
    
    Uses graph traversal to find places commonly visited after the current destination.
    """
    logger.info(f"Getting next place suggestions for destination {request.destination_id}")

    try:
        model = get_graph_model()

        # Try to load from database first
        if not model.graph:
            model.load_from_database()

        # If still no graph, return empty
        if not model.graph:
            raise HTTPException(
                status_code=503,
                detail="Graph not built yet. Please train the graph first."
            )

        suggestions = model.suggest_next_places(
            current_place_id=request.destination_id,
            limit=request.limit,
            exclude_ids=request.exclude_ids,
            consider_distance=request.max_distance_km > 0,
            max_distance_km=request.max_distance_km
        )

        return SuggestNextResponse(
            destination_id=request.destination_id,
            suggestions=suggestions,
            total=len(suggestions),
            generated_at=datetime.utcnow().isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error suggesting next places: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/complete-day", tags=["Graph Sequencing"])
async def suggest_complete_day(request: CompleteDayRequest):
    """
    Suggest a complete day itinerary starting from a place.
    
    Uses graph traversal to find common sequences (e.g., breakfast → lunch → dinner).
    """
    logger.info(f"Getting complete day suggestions starting from {request.starting_place_id}")

    try:
        model = get_graph_model()

        if not model.graph:
            model.load_from_database()

        if not model.graph:
            raise HTTPException(
                status_code=503,
                detail="Graph not built yet. Please train the graph first."
            )

        sequence = model.suggest_complete_day(
            starting_place_id=request.starting_place_id,
            categories=request.categories,
            max_places=request.max_places
        )

        return {
            "starting_place_id": request.starting_place_id,
            "sequence": sequence,
            "total_places": len(sequence),
            "generated_at": datetime.utcnow().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error suggesting complete day: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/optimize-itinerary", tags=["Graph Sequencing"])
async def optimize_itinerary(request: OptimizeItineraryRequest):
    """
    Optimize a multi-day itinerary using graph and geographic data.
    
    Groups destinations by graph sequences and minimizes travel distance.
    """
    logger.info(f"Optimizing itinerary for {len(request.destination_ids)} destinations")

    try:
        model = get_graph_model()

        if not model.graph:
            model.load_from_database()

        if not model.graph:
            raise HTTPException(
                status_code=503,
                detail="Graph not built yet. Please train the graph first."
            )

        optimized = model.optimize_itinerary(
            destination_ids=request.destination_ids,
            max_days=request.max_days
        )

        return {
            **optimized,
            "generated_at": datetime.utcnow().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error optimizing itinerary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/train", tags=["Graph Sequencing"])
async def train_graph(
    request: TrainGraphRequest,
    background_tasks: BackgroundTasks
):
    """
    Build co-visitation graph from visit history.
    
    This is a long-running operation, so it runs in the background.
    """
    logger.info("Received graph training request")

    try:
        background_tasks.add_task(
            _train_graph_task,
            request.min_weight,
            request.historical_days
        )

        return {
            "status": "started",
            "message": f"Graph training started. Building graph from last {request.historical_days} days.",
        }

    except Exception as e:
        logger.error(f"Error starting graph training: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status", tags=["Graph Sequencing"])
async def get_graph_status():
    """Get graph model status."""
    try:
        model = get_graph_model()

        # Try to load if not already loaded
        if not model.graph:
            model.load_from_database()

        if not model.graph:
            return {
                "status": "not_trained",
                "message": "Graph not built yet",
                "nodes": 0,
                "edges": 0,
            }

        return {
            "status": "ready",
            "nodes": model.stats.get("nodes", 0),
            "edges": model.stats.get("edges", 0),
            "trained_at": model.trained_at.isoformat() if model.trained_at else None,
            "stats": model.stats,
        }

    except Exception as e:
        logger.error(f"Error getting graph status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _train_graph_task(min_weight: int, historical_days: int):
    """Background task for graph training."""
    try:
        logger.info(f"Starting graph training (min_weight={min_weight}, days={historical_days})")
        model = get_graph_model()

        # Build graph
        graph = model.build_co_visitation_graph(min_weight=min_weight)

        if graph.number_of_nodes() == 0:
            logger.warning("Graph is empty - no sequences found")
            return

        # Save to database
        success = model.save_to_database()

        if success:
            logger.info(
                f"Graph training complete: {model.stats['nodes']} nodes, "
                f"{model.stats['edges']} edges"
            )
        else:
            logger.error("Failed to save graph to database")

    except Exception as e:
        logger.error(f"Error in graph training task: {e}")

