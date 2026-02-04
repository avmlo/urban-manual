"""Anomaly detection for traffic spikes, sentiment changes, and unusual patterns."""

from typing import List, Dict, Optional
from datetime import datetime
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from app.config import get_settings
from app.utils.logger import get_logger
from app.utils.database import get_db_connection

logger = get_logger(__name__)
settings = get_settings()


class AnomalyDetectionModel:
    """
    Detect anomalies in destination traffic, sentiment, and engagement metrics.
    
    Uses Isolation Forest for unsupervised anomaly detection.
    """

    def __init__(self):
        """Initialize the anomaly detection model."""
        self.model = None
        self.scaler = StandardScaler()
        self.trained_at = None

    def detect_traffic_anomalies(
        self,
        destination_id: int,
        days: Optional[int] = None,
        contamination: Optional[float] = None
    ) -> Dict:
        """
        Detect traffic anomalies for a destination.
        
        Args:
            destination_id: Destination ID
            days: Number of days to analyze
            contamination: Expected proportion of anomalies (0.0 to 0.5)
        
        Returns:
            Anomaly detection results
        """
        try:
            days = days or settings.anomaly_traffic_lookback_days
            contamination = (
                contamination
                if contamination is not None
                else settings.anomaly_traffic_contamination
            )

            logger.info(
                "Running traffic anomaly detection",
                extra={
                    'destination_id': destination_id,
                    'days': days,
                    'contamination': contamination,
                }
            )

            # Fetch traffic metrics
            metrics = self._fetch_traffic_metrics(destination_id, days)

            if len(metrics) < 7:  # Need at least a week of data
                return {
                    'destination_id': destination_id,
                    'anomalies': [],
                    'anomaly_count': 0,
                    'status': 'insufficient_data',
                }

            # Prepare features
            df = pd.DataFrame(metrics)
            features = ['views', 'saves', 'clicks', 'visits']
            available_features = [f for f in features if f in df.columns]
            
            if not available_features:
                return {
                    'destination_id': destination_id,
                    'anomalies': [],
                    'anomaly_count': 0,
                    'status': 'no_features',
                }

            # Scale features and enforce consistent schemas
            X = df[available_features].fillna(0).astype(float).values
            X_scaled = self.scaler.fit_transform(X)

            # Train Isolation Forest
            self.model = IsolationForest(
                contamination=min(max(contamination, 0.001), 0.5),
                random_state=42,
                n_estimators=100
            )
            self.model.fit(X_scaled)

            # Predict anomalies
            predictions = self.model.predict(X_scaled)
            anomaly_scores = self.model.score_samples(X_scaled)

            # Identify anomalies
            anomalies = []
            for i, (pred, score) in enumerate(zip(predictions, anomaly_scores)):
                if pred == -1:  # Anomaly
                    anomalies.append({
                        'date': df.iloc[i]['date'].isoformat() if 'date' in df.columns else None,
                        'metrics': {f: float(df.iloc[i][f]) for f in available_features},
                        'anomaly_score': float(score),
                        'type': self._classify_anomaly_type(df.iloc[i], available_features),
                    })

            self.trained_at = datetime.utcnow()

            return {
                'destination_id': destination_id,
                'anomalies': anomalies,
                'anomaly_count': len(anomalies),
                'total_days': len(metrics),
                'detected_at': self.trained_at.isoformat(),
            }

        except Exception as e:
            logger.error(f"Error detecting traffic anomalies: {e}")
            return {
                'destination_id': destination_id,
                'status': 'error',
                'error': str(e),
            }

    def detect_sentiment_anomalies(
        self,
        destination_id: int,
        days: Optional[int] = None
    ) -> Dict:
        """
        Detect sudden sentiment changes.
        
        Args:
            destination_id: Destination ID
            days: Number of days to analyze
        
        Returns:
            Sentiment anomaly results
        """
        try:
            days = days or settings.anomaly_sentiment_lookback_days

            logger.info(
                "Running sentiment anomaly detection",
                extra={
                    'destination_id': destination_id,
                    'days': days,
                }
            )

            # Fetch sentiment history
            sentiment_history = self._fetch_sentiment_history(destination_id, days)
            
            if len(sentiment_history) < 7:
                return {
                    'destination_id': destination_id,
                    'anomalies': [],
                    'status': 'insufficient_data',
                }

            df = pd.DataFrame(sentiment_history)
            
            # Calculate sentiment change rate
            if 'sentiment_score' in df.columns:
                df['sentiment_change'] = df['sentiment_score'].diff().abs().fillna(0)
                df['sentiment_volatility'] = df['sentiment_score'].rolling(window=7).std()

                # Identify anomalies (sudden drops or spikes)
                change_series = df['sentiment_change'].fillna(0)
                rolling_threshold = change_series.mean() + change_series.std(ddof=0)
                rolling_threshold = float(np.nan_to_num(rolling_threshold))
                quantile_threshold = float(np.nan_to_num(change_series.quantile(0.95)))
                threshold = max(rolling_threshold, quantile_threshold)
                anomalies = df[change_series >= threshold].to_dict('records')
                
                return {
                    'destination_id': destination_id,
                    'anomalies': [
                        {
                            'date': a.get('date'),
                            'sentiment_score': a.get('sentiment_score'),
                            'change': float(a.get('sentiment_change', 0)),
                            'type': 'sentiment_spike' if a.get('sentiment_score', 0) > 0 else 'sentiment_drop',
                        }
                        for a in anomalies
                    ],
                    'anomaly_count': len(anomalies),
                }

            return {
                'destination_id': destination_id,
                'anomalies': [],
                'status': 'no_sentiment_data',
            }

        except Exception as e:
            logger.error(f"Error detecting sentiment anomalies: {e}")
            return {
                'destination_id': destination_id,
                'status': 'error',
                'error': str(e),
            }

    def detect_city_anomalies(
        self,
        city: str,
        days: Optional[int] = None,
        contamination: Optional[float] = None
    ) -> Dict:
        """
        Detect anomalies across all destinations in a city.
        
        Useful for identifying city-wide events or trends.
        """
        try:
            days = days or settings.anomaly_city_lookback_days
            contamination = (
                contamination
                if contamination is not None
                else settings.anomaly_city_contamination
            )

            logger.info(
                "Running city anomaly detection",
                extra={
                    'city': city,
                    'days': days,
                    'contamination': contamination,
                }
            )

            # Fetch aggregated city metrics
            city_metrics = self._fetch_city_metrics(city, days)
            
            if len(city_metrics) < 7:
                return {
                    'city': city,
                    'anomalies': [],
                    'status': 'insufficient_data',
                }

            # Similar to destination detection but aggregated
            df = pd.DataFrame(city_metrics)
            features = ['total_views', 'total_saves', 'total_visits']
            available_features = [f for f in features if f in df.columns]
            
            if not available_features:
                return {
                    'city': city,
                    'anomalies': [],
                    'status': 'no_features',
                }

            X = df[available_features].fillna(0).astype(float).values
            X_scaled = self.scaler.fit_transform(X)

            self.model = IsolationForest(
                contamination=min(max(contamination, 0.001), 0.5),
                random_state=42,
                n_estimators=100
            )
            self.model.fit(X_scaled)
            
            predictions = self.model.predict(X_scaled)
            anomaly_scores = self.model.score_samples(X_scaled)
            
            anomalies = []
            for i, (pred, score) in enumerate(zip(predictions, anomaly_scores)):
                if pred == -1:
                    anomalies.append({
                        'date': df.iloc[i]['date'].isoformat() if 'date' in df.columns else None,
                        'metrics': {f: float(df.iloc[i][f]) for f in available_features},
                        'anomaly_score': float(score),
                    })

            return {
                'city': city,
                'anomalies': anomalies,
                'anomaly_count': len(anomalies),
            }

        except Exception as e:
            logger.error(f"Error detecting city anomalies: {e}")
            return {
                'city': city,
                'status': 'error',
                'error': str(e),
            }

    def _classify_anomaly_type(self, row: pd.Series, features: List[str]) -> str:
        """Classify the type of anomaly based on metrics."""
        # Simple heuristic: check which metric is unusually high
        if 'views' in features and row['views'] > row.get('views', 0) * 2:
            return 'traffic_spike'
        elif 'saves' in features and row['saves'] > row.get('saves', 0) * 2:
            return 'popularity_spike'
        elif 'visits' in features and row['visits'] > row.get('visits', 0) * 2:
            return 'visit_spike'
        else:
            return 'general_anomaly'

    def _fetch_traffic_metrics(
        self,
        destination_id: int,
        days: int
    ) -> List[Dict]:
        """Fetch daily traffic metrics for a destination."""
        try:
            window = max(days - 1, 0)
            query = f"""
            WITH date_series AS (
                SELECT generate_series(
                    DATE(NOW()) - INTERVAL '{window} days',
                    DATE(NOW()),
                    '1 day'
                )::date AS date
            ),
            views AS (
                SELECT DATE(created_at) as date, COUNT(*) as view_count
                FROM user_interactions
                WHERE destination_id = %s
                AND interaction_type = 'view'
                AND created_at >= NOW() - INTERVAL '{window} days'
                GROUP BY DATE(created_at)
            ),
            clicks AS (
                SELECT DATE(created_at) as date, COUNT(*) as click_count
                FROM user_interactions
                WHERE destination_id = %s
                AND interaction_type = 'click'
                AND created_at >= NOW() - INTERVAL '{window} days'
                GROUP BY DATE(created_at)
            ),
            saves AS (
                SELECT DATE(sp.saved_at) as date, COUNT(*) as save_count
                FROM saved_places sp
                JOIN destinations d ON d.slug = sp.destination_slug
                WHERE d.id = %s
                AND sp.saved_at >= NOW() - INTERVAL '{window} days'
                GROUP BY DATE(sp.saved_at)
            ),
            visits AS (
                SELECT DATE(vp.visited_at) as date, COUNT(*) as visit_count
                FROM visited_places vp
                JOIN destinations d ON d.slug = vp.destination_slug
                WHERE d.id = %s
                AND vp.visited_at >= NOW() - INTERVAL '{window} days'
                GROUP BY DATE(vp.visited_at)
            )
            SELECT
                ds.date,
                COALESCE(views.view_count, 0) as views,
                COALESCE(saves.save_count, 0) as saves,
                COALESCE(clicks.click_count, 0) as clicks,
                COALESCE(visits.visit_count, 0) as visits
            FROM date_series ds
            LEFT JOIN views ON views.date = ds.date
            LEFT JOIN saves ON saves.date = ds.date
            LEFT JOIN clicks ON clicks.date = ds.date
            LEFT JOIN visits ON visits.date = ds.date
            ORDER BY ds.date
            """

            with get_db_connection() as conn:
                df = pd.read_sql_query(
                    query,
                    conn,
                    params=(destination_id, destination_id, destination_id, destination_id)
                )

            if df.empty:
                logger.info(
                    "No traffic metrics returned",
                    extra={'destination_id': destination_id, 'days': days}
                )
                return []

            df['date'] = pd.to_datetime(df['date'])
            for column in ['views', 'saves', 'clicks', 'visits']:
                if column not in df.columns:
                    df[column] = 0.0
                df[column] = df[column].fillna(0).astype(float)

            records = df.to_dict('records')
            logger.info(
                "Fetched traffic metrics",
                extra={'destination_id': destination_id, 'rows': len(records)}
            )
            return records
        except Exception as e:
            logger.error(f"Error fetching traffic metrics: {e}")
            return []

    def _fetch_sentiment_history(
        self,
        destination_id: int,
        days: int
    ) -> List[Dict]:
        """Fetch sentiment history for a destination."""
        try:
            window = max(days - 1, 0)
            query = f"""
            WITH date_series AS (
                SELECT generate_series(
                    DATE(NOW()) - INTERVAL '{window} days',
                    DATE(NOW()),
                    '1 day'
                )::date AS date
            ),
            sentiment AS (
                SELECT
                    DATE(calculated_at) as date,
                    AVG(sentiment_score) as avg_sentiment
                FROM destination_sentiment
                WHERE destination_id = %s
                AND calculated_at >= NOW() - INTERVAL '{window} days'
                GROUP BY DATE(calculated_at)
            )
            SELECT
                ds.date,
                sentiment.avg_sentiment as sentiment_score
            FROM date_series ds
            LEFT JOIN sentiment ON sentiment.date = ds.date
            ORDER BY ds.date
            """

            with get_db_connection() as conn:
                df = pd.read_sql_query(query, conn, params=(destination_id,))

            if df.empty:
                logger.info(
                    "No sentiment history",
                    extra={'destination_id': destination_id, 'days': days}
                )
                return []

            df['date'] = pd.to_datetime(df['date'])
            df['sentiment_score'] = (
                df['sentiment_score']
                .fillna(method='ffill')
                .fillna(0)
                .astype(float)
            )

            records = df.to_dict('records')
            logger.info(
                "Fetched sentiment history",
                extra={'destination_id': destination_id, 'rows': len(records)}
            )
            return records
        except Exception as e:
            logger.error(f"Error fetching sentiment history: {e}")
            return []

    def _fetch_city_metrics(self, city: str, days: int) -> List[Dict]:
        """Fetch aggregated metrics for a city."""
        try:
            window = max(days - 1, 0)
            query = f"""
            WITH date_series AS (
                SELECT generate_series(
                    DATE(NOW()) - INTERVAL '{window} days',
                    DATE(NOW()),
                    '1 day'
                )::date AS date
            ),
            city_destinations AS (
                SELECT id
                FROM destinations
                WHERE LOWER(city) = LOWER(%s)
            ),
            views AS (
                SELECT DATE(ui.created_at) as date, COUNT(*) as view_count
                FROM user_interactions ui
                WHERE ui.destination_id IN (SELECT id FROM city_destinations)
                AND ui.interaction_type = 'view'
                AND ui.created_at >= NOW() - INTERVAL '{window} days'
                GROUP BY DATE(ui.created_at)
            ),
            saves AS (
                SELECT DATE(sp.saved_at) as date, COUNT(*) as save_count
                FROM saved_places sp
                JOIN destinations d ON d.slug = sp.destination_slug
                WHERE d.id IN (SELECT id FROM city_destinations)
                AND sp.saved_at >= NOW() - INTERVAL '{window} days'
                GROUP BY DATE(sp.saved_at)
            ),
            visits AS (
                SELECT DATE(vp.visited_at) as date, COUNT(*) as visit_count
                FROM visited_places vp
                JOIN destinations d ON d.slug = vp.destination_slug
                WHERE d.id IN (SELECT id FROM city_destinations)
                AND vp.visited_at >= NOW() - INTERVAL '{window} days'
                GROUP BY DATE(vp.visited_at)
            )
            SELECT
                ds.date,
                COALESCE(views.view_count, 0) as total_views,
                COALESCE(saves.save_count, 0) as total_saves,
                COALESCE(visits.visit_count, 0) as total_visits
            FROM date_series ds
            LEFT JOIN views ON views.date = ds.date
            LEFT JOIN saves ON saves.date = ds.date
            LEFT JOIN visits ON visits.date = ds.date
            ORDER BY ds.date
            """

            with get_db_connection() as conn:
                df = pd.read_sql_query(query, conn, params=(city,))

            if df.empty:
                logger.info(
                    "No city metrics",
                    extra={'city': city, 'days': days}
                )
                return []

            df['date'] = pd.to_datetime(df['date'])
            for column in ['total_views', 'total_saves', 'total_visits']:
                if column not in df.columns:
                    df[column] = 0.0
                df[column] = df[column].fillna(0).astype(float)

            records = df.to_dict('records')
            logger.info(
                "Fetched city metrics",
                extra={'city': city, 'rows': len(records)}
            )
            return records
        except Exception as e:
            logger.error(f"Error fetching city metrics: {e}")
            return []


# Global model instance
_anomaly_model_instance = None


def get_anomaly_model() -> AnomalyDetectionModel:
    """Get or create the global anomaly detection model instance."""
    global _anomaly_model_instance
    if _anomaly_model_instance is None:
        _anomaly_model_instance = AnomalyDetectionModel()
    return _anomaly_model_instance

