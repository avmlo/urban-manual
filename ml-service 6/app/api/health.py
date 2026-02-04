"""Health check endpoint."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
import psycopg2

from app.config import get_settings
from app.utils.database import get_db_connection
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)
settings = get_settings()


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    timestamp: str
    service: str
    version: str
    database: str


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Health check endpoint.

    Returns service status and database connectivity.
    """
    db_status = "disconnected"

    # Check database connection
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                result = cur.fetchone()
                if result and result[0] == 1:
                    db_status = "connected"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = f"error: {str(e)[:50]}"

    return HealthResponse(
        status="healthy" if db_status == "connected" else "unhealthy",
        timestamp=datetime.utcnow().isoformat(),
        service=settings.app_name,
        version=settings.app_version,
        database=db_status
    )


@router.get("/", tags=["Health"])
async def root():
    """Root endpoint with service information."""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "openapi": "/openapi.json"
        }
    }
