"""Event correlation and enhancement for contextual recommendations."""

from typing import List, Dict, Optional
from datetime import datetime, timedelta
import pandas as pd

from app.config import get_settings
from app.utils.logger import get_logger
from app.utils.data_fetcher import DataFetcher

logger = get_logger(__name__)
settings = get_settings()


class EventCorrelationModel:
    """
    Correlate external events (festivals, exhibitions, weather) with destination traffic.
    
    Enhances recommendations and forecasts with event context.
    """

    def __init__(self):
        """Initialize the event correlation model."""
        self.event_destination_mappings = {}
        self.historical_correlations = {}

    def correlate_event_impact(
        self,
        event_name: str,
        city: str,
        event_dates: tuple,
        destination_ids: Optional[List[int]] = None
    ) -> Dict:
        """
        Analyze impact of an event on destination traffic.
        
        Args:
            event_name: Name of the event
            city: City where event occurs
            event_dates: (start_date, end_date) tuple
            destination_ids: Optional list of destination IDs to analyze
        
        Returns:
            Correlation analysis results
        """
        try:
            start_date, end_date = event_dates
            
            # Fetch traffic data before, during, and after event
            before_period = self._fetch_traffic_period(
                city,
                start_date - timedelta(days=30),
                start_date,
                destination_ids
            )
            
            during_period = self._fetch_traffic_period(
                city,
                start_date,
                end_date,
                destination_ids
            )
            
            after_period = self._fetch_traffic_period(
                city,
                end_date,
                end_date + timedelta(days=30),
                destination_ids
            )

            # Calculate impact metrics
            before_avg = self._calculate_average_traffic(before_period)
            during_avg = self._calculate_average_traffic(during_period)
            after_avg = self._calculate_average_traffic(after_period)

            # Calculate percentage changes
            during_change = ((during_avg - before_avg) / before_avg * 100) if before_avg > 0 else 0
            after_change = ((after_avg - before_avg) / before_avg * 100) if before_avg > 0 else 0

            # Identify most impacted destinations
            impacted_destinations = self._identify_impacted_destinations(
                before_period,
                during_period,
                destination_ids
            )

            return {
                'event_name': event_name,
                'city': city,
                'event_dates': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat(),
                },
                'traffic_impact': {
                    'before_avg': float(before_avg),
                    'during_avg': float(during_avg),
                    'after_avg': float(after_avg),
                    'during_change_pct': float(during_change),
                    'after_change_pct': float(after_change),
                },
                'impacted_destinations': impacted_destinations[:10],  # Top 10
                'analyzed_at': datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.error(f"Error correlating event impact: {e}")
            return {
                'event_name': event_name,
                'status': 'error',
                'error': str(e),
            }

    def get_event_recommendations(
        self,
        city: str,
        event_date: datetime
    ) -> Dict:
        """
        Get destination recommendations based on upcoming events.
        
        Args:
            city: City name
            event_date: Date of interest
        
        Returns:
            Event-aware recommendations
        """
        try:
            # Find events around this date
            events = self._find_events(city, event_date)
            
            if not events:
                return {
                    'city': city,
                    'date': event_date.isoformat(),
                    'events': [],
                    'recommendations': [],
                }

            recommendations = []
            
            for event in events:
                # Get destinations correlated with this event type
                correlated_destinations = self._get_event_destinations(
                    event['type'],
                    city
                )
                
                recommendations.extend(correlated_destinations)

            # Deduplicate and rank
            unique_recommendations = self._deduplicate_recommendations(recommendations)
            
            return {
                'city': city,
                'date': event_date.isoformat(),
                'events': events,
                'recommendations': unique_recommendations[:20],  # Top 20
            }

        except Exception as e:
            logger.error(f"Error getting event recommendations: {e}")
            return {
                'city': city,
                'status': 'error',
                'error': str(e),
            }

    def enhance_forecast_with_events(
        self,
        destination_id: int,
        forecast_dates: List[datetime],
        city: str
    ) -> Dict:
        """
        Enhance demand forecast with event information.
        
        Args:
            destination_id: Destination ID
            forecast_dates: List of dates to forecast
            city: City name
        
        Returns:
            Enhanced forecast with event adjustments
        """
        try:
            # Get base forecast (from Prophet model)
            # This would call the demand forecasting model
            
            # Find events during forecast period
            events = []
            for date in forecast_dates:
                date_events = self._find_events(city, date)
                events.extend(date_events)

            # Calculate event impact adjustments
            adjustments = {}
            for event in events:
                event_date = datetime.fromisoformat(event['date'])
                impact = self._estimate_event_impact(
                    event['type'],
                    destination_id
                )
                
                if event_date in forecast_dates:
                    adjustments[event_date.isoformat()] = {
                        'event': event,
                        'impact_multiplier': impact,
                        'adjustment_pct': (impact - 1.0) * 100,
                    }

            return {
                'destination_id': destination_id,
                'forecast_dates': [d.isoformat() for d in forecast_dates],
                'event_adjustments': adjustments,
                'enhanced_at': datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.error(f"Error enhancing forecast with events: {e}")
            return {
                'destination_id': destination_id,
                'status': 'error',
                'error': str(e),
            }

    def _fetch_traffic_period(
        self,
        city: str,
        start_date: datetime,
        end_date: datetime,
        destination_ids: Optional[List[int]]
    ) -> List[Dict]:
        """Fetch traffic data for a time period."""
        try:
            # Placeholder: Query traffic metrics
            return []
        except Exception as e:
            logger.error(f"Error fetching traffic period: {e}")
            return []

    def _calculate_average_traffic(self, period_data: List[Dict]) -> float:
        """Calculate average traffic from period data."""
        if not period_data:
            return 0.0
        
        total_views = sum(d.get('views', 0) for d in period_data)
        return total_views / len(period_data) if period_data else 0.0

    def _identify_impacted_destinations(
        self,
        before_period: List[Dict],
        during_period: List[Dict],
        destination_ids: Optional[List[int]]
    ) -> List[Dict]:
        """Identify destinations most impacted by event."""
        # Placeholder: Calculate impact per destination
        return []

    def _find_events(self, city: str, date: datetime) -> List[Dict]:
        """Find events in a city around a date."""
        try:
            # Placeholder: Query events database or external API
            # This would integrate with seasonality service
            return []
        except Exception as e:
            logger.error(f"Error finding events: {e}")
            return []

    def _get_event_destinations(
        self,
        event_type: str,
        city: str
    ) -> List[Dict]:
        """Get destinations correlated with an event type."""
        # Placeholder: Return destinations based on event type
        return []

    def _deduplicate_recommendations(
        self,
        recommendations: List[Dict]
    ) -> List[Dict]:
        """Deduplicate and rank recommendations."""
        # Simple deduplication by destination_id
        seen = set()
        unique = []
        for rec in recommendations:
            dest_id = rec.get('destination_id')
            if dest_id and dest_id not in seen:
                seen.add(dest_id)
                unique.append(rec)
        return unique

    def _estimate_event_impact(
        self,
        event_type: str,
        destination_id: int
    ) -> float:
        """Estimate traffic impact multiplier for an event."""
        # Placeholder: Return impact multiplier (1.0 = no change, 1.5 = 50% increase)
        return 1.0


# Global model instance
_event_model_instance = None


def get_event_model() -> EventCorrelationModel:
    """Get or create the global event correlation model instance."""
    global _event_model_instance
    if _event_model_instance is None:
        _event_model_instance = EventCorrelationModel()
    return _event_model_instance

