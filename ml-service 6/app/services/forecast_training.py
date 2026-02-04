"""Background pipeline for Prophet demand forecasting."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from threading import Lock, Thread
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
from psycopg2.extras import Json, execute_batch

from app.config import get_settings
from app.models.demand_forecast import get_forecast_model
from app.utils.database import get_db_connection
from app.utils.logger import get_logger


logger = get_logger(__name__)
settings = get_settings()


@dataclass
class ForecastSummary:
    """Structured summary for a destination forecast."""

    destination_id: int
    interest_score: float
    trend_direction: str
    peak_date: datetime
    peak_demand: float
    low_date: datetime
    low_demand: float
    wait_time_minutes: float
    generated_at: datetime


class ForecastTrainingPipeline:
    """Coordinates fetching, training and persistence for demand forecasts."""

    def __init__(self):
        self._model = get_forecast_model()
        self._lock = Lock()
        self._background_thread: Optional[Thread] = None
        self._last_refresh: Optional[datetime] = None
        self._last_summary_count: int = 0
        self._default_top_n = 200
        self._default_historical_days = 180

    def run_training(
        self,
        top_n: Optional[int] = None,
        historical_days: Optional[int] = None,
        forecast_days: int = 30,
    ) -> Dict[str, int]:
        """Train Prophet models and persist refreshed summaries."""

        with self._lock:
            top_n = top_n or self._default_top_n
            historical_days = historical_days or self._default_historical_days

            logger.info(
                "Running forecast pipeline (top_n=%s, historical_days=%s)",
                top_n,
                historical_days,
            )

            training_stats = self._model.train_top_destinations(
                top_n=top_n,
                historical_days=historical_days,
            )

            summaries = self._build_summaries(forecast_days=forecast_days)
            self._persist_forecast_metadata(summaries)
            self._persist_status_updates(summaries, ttl_days=forecast_days)

            self._last_refresh = datetime.utcnow()
            self._last_summary_count = len(summaries)

            logger.info(
                "Forecast pipeline completed. Trained %s, persisted %s summaries",
                training_stats.get("trained", 0),
                self._last_summary_count,
            )

            return {
                "trained": training_stats.get("trained", 0),
                "skipped": training_stats.get("skipped", 0),
                "failed": training_stats.get("failed", 0),
                "summaries": self._last_summary_count,
            }

    def ensure_fresh_models(self) -> bool:
        """Kick off a refresh if cached models are stale."""

        ttl = max(1, settings.cache_ttl_hours)
        if self._last_refresh and datetime.utcnow() - self._last_refresh < timedelta(hours=ttl):
            return False

        if self._background_thread and self._background_thread.is_alive():
            return False

        logger.info("Forecast cache stale. Starting background refresh thread.")
        self._background_thread = Thread(
            target=self.run_training,
            kwargs={
                "top_n": self._default_top_n,
                "historical_days": self._default_historical_days,
            },
            daemon=True,
        )
        self._background_thread.start()
        return True

    def status(self) -> Dict[str, Optional[str]]:
        """Expose current pipeline status for diagnostics."""

        return {
            "last_refresh": self._last_refresh.isoformat() if self._last_refresh else None,
            "refresh_in_progress": bool(
                self._background_thread and self._background_thread.is_alive()
            ),
            "cached_summaries": self._last_summary_count,
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _build_summaries(self, forecast_days: int) -> List[ForecastSummary]:
        """Generate peak/low summaries for every trained destination."""

        summaries: List[ForecastSummary] = []
        for destination_id in list(self._model.models.keys()):
            forecast_df = self._model.forecast_destination(
                destination_id=destination_id,
                periods=forecast_days,
            )

            if forecast_df is None or forecast_df.empty:
                continue

            summary = self._summarize_forecast(
                destination_id=destination_id,
                forecast_df=forecast_df,
                forecast_days=forecast_days,
            )

            if summary:
                summaries.append(summary)

        return summaries

    def _summarize_forecast(
        self,
        destination_id: int,
        forecast_df: pd.DataFrame,
        forecast_days: int,
    ) -> Optional[ForecastSummary]:
        """Extract trend and best-time metadata from a Prophet forecast."""

        future = forecast_df.tail(forecast_days)
        if future.empty:
            return None

        peak_idx = future["yhat"].idxmax()
        low_idx = future["yhat"].idxmin()
        peak_row = future.loc[peak_idx]
        low_row = future.loc[low_idx]

        start_value = future["yhat"].iloc[0]
        end_value = future["yhat"].iloc[-1]
        growth = 0.0 if start_value == 0 else (end_value - start_value) / start_value

        if growth > 0.1:
            trend = "rising"
        elif growth < -0.1:
            trend = "falling"
        else:
            trend = "stable"

        demand_range = max(1.0, future["yhat"].max() - future["yhat"].min())
        volatility_bonus = min(20.0, demand_range)
        interest_score = np.clip(50 + growth * 100 + volatility_bonus, 0, 100)

        # Approximate wait time from the 75th percentile of demand.
        wait_time_minutes = float(
            np.clip(np.percentile(future["yhat"], 75) / 2.0, 5, 120)
        )

        return ForecastSummary(
            destination_id=destination_id,
            interest_score=float(interest_score),
            trend_direction=trend,
            peak_date=pd.Timestamp(peak_row["ds"]).to_pydatetime(),
            peak_demand=float(peak_row["yhat"]),
            low_date=pd.Timestamp(low_row["ds"]).to_pydatetime(),
            low_demand=float(low_row["yhat"]),
            wait_time_minutes=wait_time_minutes,
            generated_at=datetime.utcnow(),
        )

    def _persist_forecast_metadata(self, summaries: List[ForecastSummary]) -> None:
        """Upsert summary metrics into forecasting_data."""

        if not summaries:
            return

        query = """
            INSERT INTO forecasting_data (
                destination_id,
                interest_score,
                trend_direction,
                forecast_date,
                last_updated
            ) VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (destination_id, forecast_date)
            DO UPDATE SET
                interest_score = EXCLUDED.interest_score,
                trend_direction = EXCLUDED.trend_direction,
                last_updated = EXCLUDED.last_updated
        """

        params = [
            (
                summary.destination_id,
                summary.interest_score,
                summary.trend_direction,
                summary.generated_at.date(),
                summary.generated_at,
            )
            for summary in summaries
        ]

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                execute_batch(cur, query, params, page_size=500)

    def _persist_status_updates(
        self,
        summaries: List[ForecastSummary],
        ttl_days: int,
    ) -> None:
        """Persist best-time and wait-time predictions to destination_status."""

        if not summaries:
            return

        expires_at = datetime.utcnow() + timedelta(days=ttl_days)

        best_time_records = [
            (
                s.destination_id,
                "best_time_forecast",
                Json(
                    {
                        "best_date": s.low_date.date().isoformat(),
                        "best_demand": round(s.low_demand, 2),
                        "peak_date": s.peak_date.date().isoformat(),
                        "peak_demand": round(s.peak_demand, 2),
                    }
                ),
                "prophet_forecast",
                0.65,
                expires_at,
            )
            for s in summaries
        ]

        wait_time_records = [
            (
                s.destination_id,
                "wait_time_forecast",
                Json(
                    {
                        "predicted_minutes": round(s.wait_time_minutes, 1),
                        "reference_peak": s.peak_date.date().isoformat(),
                    }
                ),
                "prophet_forecast",
                0.55,
                expires_at,
            )
            for s in summaries
        ]

        insert_query = """
            INSERT INTO destination_status (
                destination_id,
                status_type,
                status_value,
                data_source,
                confidence_score,
                expires_at
            ) VALUES (%s, %s, %s, %s, %s, %s)
        """

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                execute_batch(cur, insert_query, best_time_records, page_size=500)
                execute_batch(cur, insert_query, wait_time_records, page_size=500)


_forecast_pipeline: Optional[ForecastTrainingPipeline] = None


def get_forecast_training_pipeline() -> ForecastTrainingPipeline:
    """Singleton accessor for the forecast pipeline."""

    global _forecast_pipeline
    if _forecast_pipeline is None:
        _forecast_pipeline = ForecastTrainingPipeline()
    return _forecast_pipeline

