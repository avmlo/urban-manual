"""Demand forecasting using Prophet."""

import calendar
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
from prophet import Prophet

from app.config import get_settings
from app.utils.logger import get_logger
from app.utils.data_fetcher import DataFetcher

logger = get_logger(__name__)
settings = get_settings()


class DemandForecastModel:
    """
    Prophet-based demand forecasting for destinations.

    Forecasts daily demand (views, saves, visits) for destinations.
    """

    def __init__(self):
        """Initialize the demand forecast model."""
        self.models = {}  # destination_id -> Prophet model
        self.forecasts = {}  # destination_id -> forecast DataFrame
        self.holidays = {}  # destination_id -> holiday DataFrame
        self.trained_at = None

        # Additional multi-seasonality configuration for crowding/wait-time trends
        self.additional_seasonalities: List[Dict] = [
            {"name": "biweekly", "period": 14, "fourier_order": 5},
            {"name": "monthly", "period": 30.5, "fourier_order": 7},
            {"name": "quarterly", "period": 91.25, "fourier_order": 9},
            {"name": "semiannual", "period": 182.5, "fourier_order": 7},
        ]

        # Travel-heavy holiday anchors (US-centric but captures global peaks)
        self.holiday_definitions: List[Dict] = [
            {"name": "new_years_day", "type": "fixed", "month": 1, "day": 1, "lower_window": 0, "upper_window": 1},
            {"name": "valentines_day", "type": "fixed", "month": 2, "day": 14, "lower_window": 0, "upper_window": 0},
            {"name": "memorial_day", "type": "last_weekday", "month": 5, "weekday": 0, "lower_window": -1, "upper_window": 2},
            {"name": "independence_day", "type": "fixed", "month": 7, "day": 4, "lower_window": -1, "upper_window": 2},
            {"name": "labor_day", "type": "nth_weekday", "month": 9, "weekday": 0, "n": 1, "lower_window": -2, "upper_window": 2},
            {"name": "thanksgiving", "type": "nth_weekday", "month": 11, "weekday": 3, "n": 4, "lower_window": -1, "upper_window": 2},
            {"name": "black_friday", "type": "relative", "reference": "thanksgiving", "days_offset": 1, "lower_window": 0, "upper_window": 0},
            {"name": "christmas_eve", "type": "fixed", "month": 12, "day": 24, "lower_window": 0, "upper_window": 1},
            {"name": "christmas_day", "type": "fixed", "month": 12, "day": 25, "lower_window": 0, "upper_window": 1},
            {"name": "new_years_eve", "type": "fixed", "month": 12, "day": 31, "lower_window": 0, "upper_window": 0},
        ]

        self.holiday_buffer_days = 90

    def prepare_time_series(
        self,
        destination_id: int,
        analytics_df: pd.DataFrame
    ) -> Optional[pd.DataFrame]:
        """
        Prepare time series data for a specific destination.

        Args:
            destination_id: Destination ID to prepare data for
            analytics_df: DataFrame with analytics data

        Returns:
            DataFrame with columns [ds, y] for Prophet, or None if insufficient data
        """
        # Filter for this destination
        dest_data = analytics_df[analytics_df['destination_id'] == destination_id].copy()

        if len(dest_data) < 14:  # Need at least 2 weeks of data
            return None

        # Combine metrics into a single demand score
        # Weight: views=1, saves=3, visits=5
        dest_data['demand'] = (
            dest_data['view_count'] * 1.0 +
            dest_data['save_count'] * 3.0 +
            dest_data['visit_count'] * 5.0
        )

        # Prepare for Prophet (requires 'ds' and 'y' columns)
        ts_data = dest_data[['date', 'demand']].copy()
        ts_data.columns = ['ds', 'y']
        ts_data = ts_data.sort_values('ds')
        ts_data['ds'] = pd.to_datetime(ts_data['ds'])

        # Fill missing dates with zero demand
        date_range = pd.date_range(
            start=ts_data['ds'].min(),
            end=ts_data['ds'].max(),
            freq='D'
        )
        ts_data = ts_data.set_index('ds').reindex(date_range, fill_value=0).reset_index()
        ts_data.columns = ['ds', 'y']

        return ts_data

    @staticmethod
    def _nth_weekday_of_month(year: int, month: int, weekday: int, n: int) -> datetime:
        """Return the nth weekday (0=Monday) for a month."""
        first_day = datetime(year, month, 1)
        days_ahead = (weekday - first_day.weekday()) % 7
        day = 1 + days_ahead + 7 * (n - 1)
        return datetime(year, month, day)

    @staticmethod
    def _last_weekday_of_month(year: int, month: int, weekday: int) -> datetime:
        """Return the last weekday (0=Monday) for a month."""
        last_day = calendar.monthrange(year, month)[1]
        last_date = datetime(year, month, last_day)
        days_back = (last_date.weekday() - weekday) % 7
        return last_date - timedelta(days=days_back)

    def _resolve_holiday_date(self, year: int, holiday: Dict, references: Dict[str, datetime]) -> Optional[datetime]:
        """Resolve a holiday definition into an actual date."""
        h_type = holiday.get("type", "fixed")

        if h_type == "fixed":
            return datetime(year, holiday["month"], holiday["day"])
        if h_type == "nth_weekday":
            return self._nth_weekday_of_month(year, holiday["month"], holiday["weekday"], holiday["n"])
        if h_type == "last_weekday":
            return self._last_weekday_of_month(year, holiday["month"], holiday["weekday"])
        if h_type == "relative":
            reference = holiday.get("reference")
            if reference and reference in references:
                return references[reference] + timedelta(days=holiday.get("days_offset", 0))
        return None

    def _build_holiday_frame(self, ts_data: pd.DataFrame) -> Optional[pd.DataFrame]:
        """Create a Prophet-compatible holiday dataframe covering training/future horizons."""
        if ts_data.empty:
            return None

        start_date = ts_data['ds'].min() - timedelta(days=30)
        end_date = ts_data['ds'].max() + timedelta(days=self.holiday_buffer_days)

        holiday_rows: List[Dict] = []
        for year in range(start_date.year - 1, end_date.year + 2):
            resolved: Dict[str, datetime] = {}
            for definition in self.holiday_definitions:
                holiday_date = self._resolve_holiday_date(year, definition, resolved)
                if holiday_date is None:
                    continue

                resolved[definition["name"]] = holiday_date

                if not (start_date <= holiday_date <= end_date):
                    continue

                holiday_rows.append({
                    "holiday": definition["name"],
                    "ds": holiday_date,
                    "lower_window": definition.get("lower_window", 0),
                    "upper_window": definition.get("upper_window", 0),
                })

        if not holiday_rows:
            return None

        return pd.DataFrame(holiday_rows)

    def train_for_destination(
        self,
        destination_id: int,
        ts_data: pd.DataFrame
    ) -> bool:
        """
        Train Prophet model for a specific destination.

        Args:
            destination_id: Destination ID
            ts_data: Time series data with columns [ds, y]

        Returns:
            True if training succeeded, False otherwise
        """
        try:
            holidays = self._build_holiday_frame(ts_data)

            prophet_kwargs = dict(
                seasonality_mode=settings.prophet_seasonality_mode,
                daily_seasonality=False,
                weekly_seasonality=True,
                yearly_seasonality=True,
                changepoint_prior_scale=0.05,  # Conservative to avoid overfitting
                seasonality_prior_scale=10.0,
                holidays_prior_scale=15.0,
            )

            if holidays is not None:
                prophet_kwargs["holidays"] = holidays

            # Initialize Prophet model
            model = Prophet(**prophet_kwargs)

            # Add custom seasonalities to capture different wait-time cycles
            for seasonality in self.additional_seasonalities:
                model.add_seasonality(
                    name=seasonality["name"],
                    period=seasonality["period"],
                    fourier_order=seasonality["fourier_order"],
                    prior_scale=seasonality.get("prior_scale", 10.0),
                    mode=seasonality.get("mode", settings.prophet_seasonality_mode),
                )

            # Fit model
            with np.errstate(divide='ignore', invalid='ignore'):
                model.fit(ts_data)

            self.models[destination_id] = model
            if holidays is not None:
                self.holidays[destination_id] = holidays
            return True

        except Exception as e:
            logger.error(f"Error training model for destination {destination_id}: {e}")
            return False

    def forecast_destination(
        self,
        destination_id: int,
        periods: int = 30
    ) -> Optional[pd.DataFrame]:
        """
        Generate forecast for a destination.

        Args:
            destination_id: Destination ID
            periods: Number of days to forecast

        Returns:
            Forecast DataFrame or None if model not trained
        """
        if destination_id not in self.models:
            logger.warning(f"No model for destination {destination_id}")
            return None

        try:
            model = self.models[destination_id]

            # Create future dataframe
            future = model.make_future_dataframe(periods=periods)

            # Generate forecast
            forecast = model.predict(future)

            # Store forecast
            self.forecasts[destination_id] = forecast

            return forecast

        except Exception as e:
            logger.error(f"Error forecasting for destination {destination_id}: {e}")
            return None

    def train_top_destinations(
        self,
        top_n: int = 200,
        historical_days: int = 180
    ) -> Dict[str, int]:
        """
        Train models for top N destinations.

        Args:
            top_n: Number of top destinations to train
            historical_days: Days of historical data to use

        Returns:
            Training statistics
        """
        logger.info(f"Training forecast models for top {top_n} destinations")

        # Get top destinations
        top_destinations = DataFetcher.get_top_destinations(limit=top_n)

        # Fetch analytics data
        analytics_df = DataFetcher.fetch_analytics_data(days=historical_days)

        if analytics_df.empty:
            logger.warning("No analytics data available")
            return {"trained": 0, "skipped": top_n, "failed": 0}

        # Train models
        trained = 0
        skipped = 0
        failed = 0

        for dest_id in top_destinations:
            # Prepare time series
            ts_data = self.prepare_time_series(dest_id, analytics_df)

            if ts_data is None:
                skipped += 1
                continue

            # Train model
            success = self.train_for_destination(dest_id, ts_data)

            if success:
                trained += 1
            else:
                failed += 1

        self.trained_at = datetime.utcnow()

        logger.info(f"Training complete. Trained: {trained}, Skipped: {skipped}, Failed: {failed}")

        return {
            "trained": trained,
            "skipped": skipped,
            "failed": failed,
            "total": top_n
        }

    def get_trending_destinations(
        self,
        top_n: int = 20,
        forecast_days: int = 7
    ) -> List[Dict]:
        """
        Get trending destinations based on forecast growth.

        Args:
            top_n: Number of trending destinations to return
            forecast_days: Days ahead to consider for trend

        Returns:
            List of trending destinations with growth metrics
        """
        trending = []

        for dest_id in self.models.keys():
            # Get forecast
            forecast = self.forecast_destination(dest_id, periods=forecast_days)

            if forecast is None:
                continue

            # Calculate trend (growth in next week vs recent average)
            recent_avg = forecast.tail(14)['yhat'].mean()
            future_avg = forecast.tail(forecast_days)['yhat'].mean()

            if recent_avg > 0:
                growth_rate = (future_avg - recent_avg) / recent_avg
            else:
                growth_rate = 0

            trending.append({
                "destination_id": dest_id,
                "growth_rate": float(growth_rate),
                "current_demand": float(recent_avg),
                "forecast_demand": float(future_avg)
            })

        # Sort by growth rate
        trending.sort(key=lambda x: x['growth_rate'], reverse=True)

        return trending[:top_n]

    def get_peak_times(
        self,
        destination_id: int,
        forecast_days: int = 30
    ) -> Optional[Dict]:
        """
        Identify peak demand times for a destination.

        Args:
            destination_id: Destination ID
            forecast_days: Days to analyze

        Returns:
            Dictionary with peak time information
        """
        if destination_id not in self.forecasts:
            # Generate forecast if not available
            self.forecast_destination(destination_id, periods=forecast_days)

        if destination_id not in self.forecasts:
            return None

        forecast = self.forecasts[destination_id]
        future_forecast = forecast.tail(forecast_days)

        # Find peak day
        peak_idx = future_forecast['yhat'].idxmax()
        peak_row = future_forecast.loc[peak_idx]

        # Find low demand day
        low_idx = future_forecast['yhat'].idxmin()
        low_row = future_forecast.loc[low_idx]

        peak_holiday = None
        if destination_id in self.holidays:
            holiday_df = self.holidays[destination_id]
            matches = holiday_df[holiday_df['ds'] == peak_row['ds']]
            if not matches.empty:
                peak_holiday = matches['holiday'].tolist()

        return {
            "destination_id": destination_id,
            "peak_date": peak_row['ds'].isoformat(),
            "peak_demand": float(peak_row['yhat']),
            "peak_holiday_labels": peak_holiday,
            "low_date": low_row['ds'].isoformat(),
            "low_demand": float(low_row['yhat']),
            "average_demand": float(future_forecast['yhat'].mean()),
            "forecast_period_days": forecast_days
        }


# Global model instance
_forecast_model = None


def get_forecast_model() -> DemandForecastModel:
    """Get or create the global forecast model instance."""
    global _forecast_model

    if _forecast_model is None:
        _forecast_model = DemandForecastModel()

    return _forecast_model
