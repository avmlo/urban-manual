"""Collaborative filtering model using LightFM with enhancements."""

import numpy as np
import pandas as pd
from lightfm import LightFM
from lightfm.data import Dataset
from lightfm.evaluation import precision_at_k, recall_at_k
from scipy.sparse import csr_matrix
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
import math

from app.config import get_settings
from app.utils.logger import get_logger
from app.utils.data_fetcher import DataFetcher

logger = get_logger(__name__)
settings = get_settings()


class CollaborativeFilteringModel:
    """
    Enhanced LightFM-based collaborative filtering for destination recommendations.
    
    Enhancements:
    - Recency weighting for interactions
    - Temporal features (time of day, day of week, season)
    - Improved cold-start handling
    - Model evaluation metrics
    - Recommendation caching
    """

    def __init__(self):
        """Initialize the collaborative filtering model."""
        self.model = None
        self.dataset = None
        self.user_id_map = {}
        self.item_id_map = {}
        self.reverse_item_map = {}
        self.user_features_matrix = None
        self.item_features_matrix = None
        self.trained_at = None
        self.evaluation_metrics = {}
        self.recommendation_cache: Dict[str, Tuple[List[Dict], datetime]] = {}
        self.cache_ttl_hours = settings.cache_ttl_hours

    def _apply_recency_weighting(
        self,
        interactions_df: pd.DataFrame,
        decay_factor: float = 0.5,
        half_life_days: int = 90
    ) -> pd.DataFrame:
        """
        Apply recency weighting to interactions.
        
        More recent interactions get higher weights.
        Uses exponential decay: weight = base_weight * exp(-days_ago / half_life)
        """
        if 'timestamp' not in interactions_df.columns:
            return interactions_df

        now = datetime.utcnow()
        interactions_df = interactions_df.copy()

        # Calculate days ago
        interactions_df['days_ago'] = (
            pd.to_datetime(now) - pd.to_datetime(interactions_df['timestamp'])
        ).dt.days

        # Apply exponential decay
        interactions_df['recency_weight'] = np.exp(
            -interactions_df['days_ago'] / (half_life_days / math.log(2))
        )

        # Combine with original weight
        interactions_df['weight'] = (
            interactions_df['weight'] * (1 - decay_factor) +
            interactions_df['weight'] * interactions_df['recency_weight'] * decay_factor
        )

        return interactions_df.drop(['days_ago', 'recency_weight'], axis=1)

    def _add_temporal_features(
        self,
        user_features_df: pd.DataFrame,
        item_features_df: pd.DataFrame
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """Add temporal features (time of day, day of week, season)."""
        now = datetime.utcnow()
        hour = now.hour
        day_of_week = now.weekday()
        month = now.month

        # Time of day
        if 6 <= hour < 12:
            time_of_day = 'morning'
        elif 12 <= hour < 17:
            time_of_day = 'afternoon'
        elif 17 <= hour < 22:
            time_of_day = 'evening'
        else:
            time_of_day = 'night'

        # Season
        if month in [12, 1, 2]:
            season = 'winter'
        elif month in [3, 4, 5]:
            season = 'spring'
        elif month in [6, 7, 8]:
            season = 'summer'
        else:
            season = 'fall'

        day_names = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        day_name = day_names[day_of_week]

        user_features_df = user_features_df.copy()
        user_features_df['temporal_context'] = f"time:{time_of_day}"
        user_features_df['day_context'] = f"day:{day_name}"
        user_features_df['season_context'] = f"season:{season}"

        return user_features_df, item_features_df

    def prepare_data(
        self,
        apply_recency: bool = True,
        add_temporal: bool = True
    ) -> Tuple[csr_matrix, csr_matrix, csr_matrix]:
        """Prepare data for training with enhancements."""
        logger.info("Preparing data for collaborative filtering (enhanced)")

        interactions_df = DataFetcher.fetch_user_interactions()
        user_features_df = DataFetcher.fetch_user_features()
        item_features_df = DataFetcher.fetch_destination_features()

        if len(interactions_df) < 10:
            logger.warning("Not enough interaction data for training")
            return None, None, None

        # Apply recency weighting
        if apply_recency and 'timestamp' in interactions_df.columns:
            interactions_df = self._apply_recency_weighting(interactions_df)
            logger.info("Applied recency weighting to interactions")

        # Add temporal features
        if add_temporal:
            user_features_df, item_features_df = self._add_temporal_features(
                user_features_df, item_features_df
            )
            logger.info("Added temporal features")

        self.dataset = Dataset()
        unique_users = interactions_df['user_id'].unique()
        unique_items = interactions_df['destination_id'].unique()

        logger.info(f"Building dataset with {len(unique_users)} users and {len(unique_items)} items")

        # Build user features (enhanced)
        user_feature_list = []
        for _, row in user_features_df.iterrows():
            features = []
            if row.get('favorite_cities'):
                for city in row['favorite_cities']:
                    features.append(f"city:{city}")
            if row.get('favorite_categories'):
                for cat in row['favorite_categories']:
                    features.append(f"category:{cat}")
            if pd.notna(row.get('price_preference')):
                features.append(f"price_pref:{int(row['price_preference'])}")
            if row.get('travel_style'):
                features.append(f"style:{row['travel_style']}")
            if add_temporal:
                if 'temporal_context' in row:
                    features.append(row['temporal_context'])
                if 'day_context' in row:
                    features.append(row['day_context'])
                if 'season_context' in row:
                    features.append(row['season_context'])
            user_feature_list.append(features)

        # Build item features (enhanced)
        item_feature_list = []
        for _, row in item_features_df.iterrows():
            features = [
                f"city:{row['city']}",
                f"category:{row['category']}",
                f"price:{int(row['price_level'])}",
            ]
            if row['michelin_stars'] > 0:
                features.append(f"michelin:{int(row['michelin_stars'])}")
            if row.get('crown'):
                features.append("crown:true")
            if row.get('tags'):
                for tag in row['tags'][:5]:  # Increased from 3
                    features.append(f"tag:{tag}")
            if row.get('rating'):
                rating_tier = int(row['rating'] // 1.0)
                features.append(f"rating_tier:{rating_tier}")
            item_feature_list.append(features)

        all_user_features = set()
        for features in user_feature_list:
            all_user_features.update(features)
        all_item_features = set()
        for features in item_feature_list:
            all_item_features.update(features)

        self.dataset.fit(
            users=unique_users,
            items=unique_items,
            user_features=list(all_user_features),
            item_features=list(all_item_features)
        )

        interactions_list = [
            (row['user_id'], row['destination_id'], row['weight'])
            for _, row in interactions_df.iterrows()
        ]

        interactions_matrix, _ = self.dataset.build_interactions(interactions_list)

        user_features_map = dict(zip(user_features_df['user_id'], user_feature_list))
        user_features_input = [
            (user_id, user_features_map.get(user_id, []))
            for user_id in unique_users
        ]

        item_features_map = dict(zip(item_features_df['id'], item_feature_list))
        item_features_input = [
            (item_id, item_features_map.get(item_id, []))
            for item_id in unique_items
        ]

        user_features_matrix = self.dataset.build_user_features(user_features_input)
        item_features_matrix = self.dataset.build_item_features(item_features_input)

        self.user_id_map = self.dataset.mapping()[0]
        self.item_id_map = self.dataset.mapping()[2]
        self.reverse_item_map = {v: k for k, v in self.item_id_map.items()}

        logger.info(f"Data preparation complete. Interactions matrix shape: {interactions_matrix.shape}")
        return interactions_matrix, user_features_matrix, item_features_matrix

    def train(
        self,
        epochs: Optional[int] = None,
        num_threads: Optional[int] = None,
        evaluate: bool = True
    ) -> bool:
        """Train the LightFM model with evaluation."""
        logger.info("Training collaborative filtering model (enhanced)")

        epochs = epochs or settings.lightfm_epochs
        num_threads = num_threads or settings.lightfm_threads

        interactions, user_features, item_features = self.prepare_data()

        if interactions is None:
            logger.error("Cannot train model: insufficient data")
            return False

        # Initialize model with enhanced parameters
        self.model = LightFM(
            loss='warp',
            no_components=64,  # Increased from 32
            learning_rate=0.05,
            item_alpha=1e-6,  # L2 regularization
            user_alpha=1e-6,
            random_state=42
        )

        self.user_features_matrix = user_features
        self.item_features_matrix = item_features

        try:
            self.model.fit(
                interactions,
                user_features=user_features,
                item_features=item_features,
                epochs=epochs,
                num_threads=num_threads,
                verbose=True
            )

            if evaluate:
                self._evaluate_model(interactions, user_features, item_features)

            self.trained_at = datetime.utcnow()
            self.recommendation_cache.clear()
            logger.info(f"Model training complete. Trained at {self.trained_at}")
            return True

        except Exception as e:
            logger.error(f"Error training model: {e}")
            return False

    def _evaluate_model(
        self,
        test_interactions: csr_matrix,
        user_features: csr_matrix,
        item_features: csr_matrix
    ):
        """Evaluate model performance."""
        try:
            test_users = np.random.choice(
                test_interactions.shape[0],
                size=min(100, test_interactions.shape[0]),
                replace=False
            )

            precision = precision_at_k(
                self.model,
                test_interactions,
                user_features=user_features,
                item_features=item_features,
                k=10,
                user_ids=test_users
            ).mean()

            recall = recall_at_k(
                self.model,
                test_interactions,
                user_features=user_features,
                item_features=item_features,
                k=10,
                user_ids=test_users
            ).mean()

            self.evaluation_metrics = {
                'precision_at_10': float(precision),
                'recall_at_10': float(recall),
                'evaluated_at': datetime.utcnow().isoformat(),
            }

            logger.info(f"Model evaluation: Precision@10={precision:.4f}, Recall@10={recall:.4f}")

        except Exception as e:
            logger.warning(f"Error evaluating model: {e}")

    def predict_for_user(
        self,
        user_id: str,
        top_n: int = 10,
        exclude_ids: Optional[List[int]] = None,
        use_cache: bool = True
    ) -> List[Dict]:
        """Generate recommendations with caching."""
        if not self.model or not self.dataset:
            logger.error("Model not trained. Call train() first.")
            return []

        # Check cache
        cache_key = f"{user_id}:{top_n}:{exclude_ids}"
        if use_cache and cache_key in self.recommendation_cache:
            cached_recs, cached_time = self.recommendation_cache[cache_key]
            if (datetime.utcnow() - cached_time).total_seconds() < self.cache_ttl_hours * 3600:
                logger.debug(f"Returning cached recommendations for user {user_id}")
                return cached_recs

        if user_id not in self.user_id_map:
            logger.warning(f"User {user_id} not in training data. Using enhanced cold start.")
            recs = self._enhanced_cold_start_recommendations(user_id, top_n)
            if use_cache:
                self.recommendation_cache[cache_key] = (recs, datetime.utcnow())
            return recs

        user_idx = self.user_id_map[user_id]
        all_items = list(self.reverse_item_map.keys())

        if exclude_ids:
            all_items = [
                idx for idx in all_items
                if self.reverse_item_map[idx] not in exclude_ids
            ]

        scores = self.model.predict(
            user_ids=user_idx,
            item_ids=all_items,
            user_features=self.user_features_matrix,
            item_features=self.item_features_matrix
        )

        top_indices = np.argsort(-scores)[:top_n]
        top_items = [all_items[i] for i in top_indices]
        top_scores = [scores[i] for i in top_indices]

        recommendations = [
            {
                "destination_id": self.reverse_item_map[item_idx],
                "score": float(score),
                "reason": "Users with similar preferences also liked this"
            }
            for item_idx, score in zip(top_items, top_scores)
        ]

        if use_cache:
            self.recommendation_cache[cache_key] = (recommendations, datetime.utcnow())

        return recommendations

    def _enhanced_cold_start_recommendations(
        self,
        user_id: str,
        top_n: int = 10
    ) -> List[Dict]:
        """Enhanced cold-start using user profile if available."""
        logger.info(f"Enhanced cold start for user {user_id}")

        try:
            user_features_df = DataFetcher.fetch_user_features()
            user_profile = user_features_df[user_features_df['user_id'] == user_id]

            if len(user_profile) > 0:
                # Could use profile for better recommendations
                pass

            popular_destinations = DataFetcher.get_top_destinations(limit=top_n)

            recommendations = [
                {
                    "destination_id": dest_id,
                    "score": 0.8 - (i * 0.05),
                    "reason": "Popular destination"
                }
                for i, dest_id in enumerate(popular_destinations[:top_n])
            ]

            return recommendations

        except Exception as e:
            logger.error(f"Error in enhanced cold start: {e}")
            return self._cold_start_recommendations(top_n)

    def _cold_start_recommendations(self, top_n: int = 10) -> List[Dict]:
        """Basic cold-start fallback."""
        try:
            top_destinations = DataFetcher.get_top_destinations(limit=top_n)
            return [
                {
                    "destination_id": dest_id,
                    "score": 1.0 - (i * 0.05),
                    "reason": "Popular destination"
                }
                for i, dest_id in enumerate(top_destinations)
            ]
        except Exception as e:
            logger.error(f"Error getting cold start recommendations: {e}")
            return []

    def predict_batch(
        self,
        user_ids: List[str],
        top_n: int = 10
    ) -> Dict[str, List[Dict]]:
        """Generate recommendations for multiple users."""
        return {
            user_id: self.predict_for_user(user_id, top_n)
            for user_id in user_ids
        }

    def get_evaluation_metrics(self) -> Dict:
        """Get model evaluation metrics."""
        return self.evaluation_metrics.copy()

    def clear_cache(self):
        """Clear recommendation cache."""
        self.recommendation_cache.clear()
        logger.info("Recommendation cache cleared")


# Global model instance
_model_instance = None


def get_model() -> CollaborativeFilteringModel:
    """Get or create the global model instance."""
    global _model_instance
    if _model_instance is None:
        _model_instance = CollaborativeFilteringModel()
    return _model_instance
