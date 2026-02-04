"""Sentiment analysis model using transformers."""

from typing import List, Dict, Optional
from datetime import datetime, timedelta
from transformers import pipeline
import numpy as np
import re
from html import unescape

from app.config import get_settings
from app.utils.logger import get_logger
from app.utils.data_fetcher import DataFetcher

logger = get_logger(__name__)
settings = get_settings()


class SentimentAnalysisModel:
    """
    Sentiment analysis for user notes, reviews, and social mentions.
    
    Uses RoBERTa-based model for accurate sentiment classification.
    """

    TEXT_PAGE_SIZE = 100
    MAX_TEXTS = 500
    TEXT_MAX_LENGTH = 500

    def __init__(self):
        """Initialize the sentiment analyzer."""
        self.analyzer = None
        self._load_model()

    def _load_model(self):
        """Load the sentiment analysis model."""
        try:
            logger.info("Loading sentiment analysis model...")
            self.analyzer = pipeline(
                "sentiment-analysis",
                model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                device=-1  # Use CPU (-1) or GPU (0+)
            )
            logger.info("Sentiment analysis model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading sentiment model: {e}")
            # Fallback to basic model
            try:
                self.analyzer = pipeline("sentiment-analysis")
                logger.warning("Using fallback sentiment model")
            except Exception as e2:
                logger.error(f"Failed to load fallback model: {e2}")

    def analyze_texts(self, texts: List[str]) -> List[Dict]:
        """
        Analyze sentiment for a list of texts.
        
        Args:
            texts: List of text strings to analyze
        
        Returns:
            List of sentiment results with label and score
        """
        if not self.analyzer:
            logger.error("Sentiment analyzer not loaded")
            return []

        if not texts:
            return []

        try:
            results = self.analyzer(texts, batch_size=32, truncation=True)
            
            sentiment_results = []
            for i, result in enumerate(results):
                # Map model labels to our format
                label = result['label'].lower()
                score = float(result['score'])
                
                # Normalize labels: POSITIVE/NEGATIVE/NEUTRAL
                if 'positive' in label or 'pos' in label:
                    normalized_label = 'positive'
                elif 'negative' in label or 'neg' in label:
                    normalized_label = 'negative'
                else:
                    normalized_label = 'neutral'
                
                sentiment_results.append({
                    'text': texts[i][:500],  # Truncate for storage
                    'label': normalized_label,
                    'score': score,
                    'raw_label': result['label']
                })

            return sentiment_results

        except Exception as e:
            logger.error(f"Error analyzing sentiment: {e}")
            return []

    def analyze_destination_sentiment(
        self,
        destination_id: int,
        days: int = 30
    ) -> Dict:
        """
        Analyze sentiment for a specific destination from user notes.
        
        Args:
            destination_id: Destination ID
            days: Number of days to look back
        
        Returns:
            Aggregated sentiment statistics
        """
        try:
            # Fetch user notes for this destination
            # This would query saved_destinations.notes or user_reviews
            # For now, we'll use a placeholder query structure
            
            # Get texts from database
            texts = self._fetch_destination_texts(destination_id, days)
            
            if not texts:
                return {
                    'destination_id': destination_id,
                    'positive_count': 0,
                    'negative_count': 0,
                    'neutral_count': 0,
                    'average_score': 0.0,
                    'total_reviews': 0,
                    'sentiment_score': 0.0,  # -1 to 1 scale
                }

            # Analyze sentiments
            results = self.analyze_texts(texts)
            
            # Aggregate statistics
            positive_count = sum(1 for r in results if r['label'] == 'positive')
            negative_count = sum(1 for r in results if r['label'] == 'negative')
            neutral_count = sum(1 for r in results if r['label'] == 'neutral')
            
            # Calculate average score (weighted)
            if results:
                # Convert to -1 (negative) to +1 (positive) scale
                scores = []
                for r in results:
                    if r['label'] == 'positive':
                        scores.append(r['score'])
                    elif r['label'] == 'negative':
                        scores.append(-r['score'])
                    else:
                        scores.append(0.0)
                
                sentiment_score = np.mean(scores) if scores else 0.0
                average_score = np.mean([r['score'] for r in results])
            else:
                sentiment_score = 0.0
                average_score = 0.0

            return {
                'destination_id': destination_id,
                'positive_count': positive_count,
                'negative_count': negative_count,
                'neutral_count': neutral_count,
                'average_score': float(average_score),
                'total_reviews': len(results),
                'sentiment_score': float(sentiment_score),  # -1 to 1
                'analyzed_at': datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.error(f"Error analyzing destination sentiment: {e}")
            return {
                'destination_id': destination_id,
                'error': str(e),
            }

    def calculate_momentum(
        self,
        current_week_sentiment: float,
        previous_week_sentiment: float
    ) -> float:
        """
        Calculate week-over-week sentiment momentum.
        
        Args:
            current_week_sentiment: Average sentiment this week
            previous_week_sentiment: Average sentiment last week
        
        Returns:
            Momentum percentage change
        """
        if previous_week_sentiment == 0:
            return 0.0
        
        momentum = ((current_week_sentiment - previous_week_sentiment) / abs(previous_week_sentiment)) * 100
        return float(momentum)

    def _fetch_destination_texts(
        self,
        destination_id: int,
        days: int
    ) -> List[str]:
        """
        Fetch text data for a destination from database.
        
        This is a placeholder - actual implementation would query:
        - saved_destinations.notes
        - user_reviews (if exists)
        - social_mentions (if exists)
        """
        texts: List[str] = []
        seen: set[str] = set()
        offset = 0

        while len(texts) < self.MAX_TEXTS:
            try:
                df = DataFetcher.fetch_destination_texts(
                    destination_id=destination_id,
                    days=days,
                    limit=self.TEXT_PAGE_SIZE,
                    offset=offset,
                )
            except Exception as e:
                logger.error(f"Error fetching destination texts: {e}")
                break

            if df is None or df.empty:
                break

            for raw_text in df['text'].tolist():
                cleaned = self._normalize_text(raw_text, max_length=self.TEXT_MAX_LENGTH)
                if cleaned and cleaned not in seen:
                    texts.append(cleaned)
                    seen.add(cleaned)
                    if len(texts) >= self.MAX_TEXTS:
                        break

            if len(df) < self.TEXT_PAGE_SIZE:
                break

            offset += self.TEXT_PAGE_SIZE

        return texts

    @staticmethod
    def _normalize_text(text: Optional[str], max_length: int = 500) -> str:
        """Normalize markdown/HTML text into a clean sentence."""
        if not text:
            return ""

        normalized = unescape(str(text))
        normalized = re.sub(r'<[^>]+>', ' ', normalized)
        normalized = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', normalized)
        normalized = re.sub(r'https?://\S+', ' ', normalized)
        normalized = re.sub(r'[\*`_>#~\-]', ' ', normalized)
        normalized = re.sub(r'\s+', ' ', normalized).strip()

        if not normalized:
            return ""

        if len(normalized) > max_length:
            normalized = normalized[:max_length].strip()

        return normalized


# Global model instance
_sentiment_model_instance = None


def get_sentiment_model() -> SentimentAnalysisModel:
    """Get or create the global sentiment model instance."""
    global _sentiment_model_instance
    if _sentiment_model_instance is None:
        _sentiment_model_instance = SentimentAnalysisModel()
    return _sentiment_model_instance

