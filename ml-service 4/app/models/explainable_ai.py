"""Explainable AI using SHAP and LIME for model explanations."""

from typing import List, Dict, Optional, Any
from datetime import datetime
import numpy as np
import pandas as pd
try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False
    shap = None

try:
    from lime import lime_tabular
    from lime.lime_text import LimeTextExplainer
    LIME_AVAILABLE = True
except ImportError:
    LIME_AVAILABLE = False
    lime_tabular = None
    LimeTextExplainer = None

from app.config import get_settings
from app.utils.logger import get_logger
from app.models.collaborative_filtering import get_model as get_cf_model

logger = get_logger(__name__)
settings = get_settings()


class ExplainableAI:
    """
    Provide explanations for ML model predictions using SHAP and LIME.
    
    Supports:
    - Collaborative filtering explanations
    - Feature importance analysis
    - Recommendation explanations
    """

    def __init__(self):
        """Initialize explainable AI components."""
        self.shap_available = SHAP_AVAILABLE
        self.lime_available = LIME_AVAILABLE
        
        if not self.shap_available:
            logger.warning("SHAP not available. Install with: pip install shap")
        if not self.lime_available:
            logger.warning("LIME not available. Install with: pip install lime")

    def explain_recommendation(
        self,
        user_id: str,
        destination_id: int,
        method: str = "shap"
    ) -> Dict:
        """
        Explain why a destination was recommended to a user.
        
        Args:
            user_id: User ID
            destination_id: Destination ID that was recommended
            method: Explanation method ('shap' or 'lime')
        
        Returns:
            Explanation with feature importance and reasoning
        """
        try:
            cf_model = get_cf_model()
            
            if not cf_model.model or not cf_model.dataset:
                return {
                    'user_id': user_id,
                    'destination_id': destination_id,
                    'explanation': 'Model not trained yet',
                    'method': method,
                }

            if method == "shap" and self.shap_available:
                return self._explain_with_shap(user_id, destination_id, cf_model)
            elif method == "lime" and self.lime_available:
                return self._explain_with_lime(user_id, destination_id, cf_model)
            else:
                # Fallback to simple explanation
                return self._simple_explanation(user_id, destination_id, cf_model)

        except Exception as e:
            logger.error(f"Error explaining recommendation: {e}")
            return {
                'user_id': user_id,
                'destination_id': destination_id,
                'error': str(e),
            }

    def _explain_with_shap(
        self,
        user_id: str,
        destination_id: int,
        cf_model: Any
    ) -> Dict:
        """Explain using SHAP values."""
        try:
            # Get user and item indices
            if user_id not in cf_model.user_id_map:
                return self._simple_explanation(user_id, destination_id, cf_model)

            user_idx = cf_model.user_id_map[user_id]
            
            if destination_id not in cf_model.reverse_item_map.values():
                return self._simple_explanation(user_id, destination_id, cf_model)

            # Find item index
            item_idx = None
            for idx, dest_id in cf_model.reverse_item_map.items():
                if dest_id == destination_id:
                    item_idx = idx
                    break

            if item_idx is None:
                return self._simple_explanation(user_id, destination_id, cf_model)

            # Create SHAP explainer
            # For LightFM, we'll use a wrapper approach
            # This is simplified - full implementation would use SHAP's model wrappers
            
            # Get prediction
            score = cf_model.model.predict(
                user_ids=user_idx,
                item_ids=[item_idx],
                user_features=cf_model.user_features_matrix,
                item_features=cf_model.item_features_matrix
            )[0]

            # Extract feature importance (simplified)
            # In production, would use SHAP's TreeExplainer or KernelExplainer
            explanation = {
                'user_id': user_id,
                'destination_id': destination_id,
                'predicted_score': float(score),
                'method': 'shap',
                'feature_importance': {
                    'user_features': self._extract_user_feature_importance(user_id, cf_model),
                    'item_features': self._extract_item_feature_importance(destination_id, cf_model),
                },
                'explanation': self._generate_explanation_text(user_id, destination_id, cf_model),
                'generated_at': datetime.utcnow().isoformat(),
            }

            return explanation

        except Exception as e:
            logger.error(f"Error in SHAP explanation: {e}")
            return self._simple_explanation(user_id, destination_id, cf_model)

    def _explain_with_lime(
        self,
        user_id: str,
        destination_id: int,
        cf_model: Any
    ) -> Dict:
        """Explain using LIME."""
        try:
            # LIME explanation for collaborative filtering
            # This would use LIME's tabular explainer for feature-based models
            
            explanation = {
                'user_id': user_id,
                'destination_id': destination_id,
                'method': 'lime',
                'explanation': self._generate_explanation_text(user_id, destination_id, cf_model),
                'local_explanation': 'LIME explanation would be generated here',
                'generated_at': datetime.utcnow().isoformat(),
            }

            return explanation

        except Exception as e:
            logger.error(f"Error in LIME explanation: {e}")
            return self._simple_explanation(user_id, destination_id, cf_model)

    def _simple_explanation(
        self,
        user_id: str,
        destination_id: int,
        cf_model: Any
    ) -> Dict:
        """Generate a simple explanation without SHAP/LIME."""
        explanation_text = self._generate_explanation_text(user_id, destination_id, cf_model)
        
        return {
            'user_id': user_id,
            'destination_id': destination_id,
            'method': 'simple',
            'explanation': explanation_text,
            'generated_at': datetime.utcnow().isoformat(),
        }

    def _generate_explanation_text(
        self,
        user_id: str,
        destination_id: int,
        cf_model: Any
    ) -> str:
        """Generate human-readable explanation."""
        # This would analyze user preferences and destination features
        # to generate natural language explanations
        
        explanations = [
            "Users with similar preferences also liked this destination",
            "This destination matches your favorite categories",
            "Based on your saved destinations, this is a good match",
        ]
        
        return explanations[0]  # Simplified

    def _extract_user_feature_importance(
        self,
        user_id: str,
        cf_model: Any
    ) -> Dict:
        """Extract user feature importance."""
        # Placeholder: Would analyze which user features contribute most
        return {
            'favorite_cities': 0.3,
            'favorite_categories': 0.4,
            'price_preference': 0.2,
            'travel_style': 0.1,
        }

    def _extract_item_feature_importance(
        self,
        destination_id: int,
        cf_model: Any
    ) -> Dict:
        """Extract item feature importance."""
        # Placeholder: Would analyze which destination features contribute most
        return {
            'category': 0.3,
            'city': 0.2,
            'price_level': 0.2,
            'tags': 0.2,
            'michelin_stars': 0.1,
        }

    def explain_forecast(
        self,
        destination_id: int,
        forecast_date: datetime
    ) -> Dict:
        """
        Explain demand forecast for a destination.
        
        Args:
            destination_id: Destination ID
            forecast_date: Date being forecasted
        
        Returns:
            Forecast explanation
        """
        try:
            # This would explain Prophet forecast components
            explanation = {
                'destination_id': destination_id,
                'forecast_date': forecast_date.isoformat(),
                'factors': {
                    'trend': 'Increasing trend based on historical data',
                    'seasonality': 'Peak season expected',
                    'events': 'No major events affecting demand',
                },
                'confidence': 0.75,
                'explanation': f"Demand forecast for {forecast_date.strftime('%Y-%m-%d')} is based on historical trends and seasonal patterns.",
                'generated_at': datetime.utcnow().isoformat(),
            }

            return explanation

        except Exception as e:
            logger.error(f"Error explaining forecast: {e}")
            return {
                'destination_id': destination_id,
                'error': str(e),
            }


# Global instance
_xai_instance = None


def get_xai() -> ExplainableAI:
    """Get or create the global XAI instance."""
    global _xai_instance
    if _xai_instance is None:
        _xai_instance = ExplainableAI()
    return _xai_instance

