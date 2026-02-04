"""Sequence models for browsing patterns and user behavior prediction."""

from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime
from pathlib import Path
import json
import asyncio
from collections import defaultdict, Counter

from app.utils.logger import get_logger
from app.utils.database import get_db_connection

logger = get_logger(__name__)


class SequenceModel:
    """
    Model browsing patterns and predict next actions.
    
    Uses Markov chains and pattern matching to predict user behavior.
    """

    def __init__(self):
        """Initialize sequence model."""
        self.transition_matrix: Dict[Tuple[str, ...], Dict[str, float]] = {}
        self.sequence_counts: Dict[Tuple[str, ...], int] = defaultdict(int)
        self.trained_at: Optional[datetime] = None

    def train(self, sequences: List[List[str]], order: int = 2):
        """
        Train sequence model on browsing patterns.
        
        Args:
            sequences: List of action sequences (e.g., [view, save, click])
            order: Order of Markov chain (n-gram size)
        """
        try:
            logger.info(f"Training sequence model on {len(sequences)} sequences (order={order})")

            # Build transition matrix
            for sequence in sequences:
                if len(sequence) < order + 1:
                    continue

                # Create n-grams
                for i in range(len(sequence) - order):
                    context = tuple(sequence[i:i+order])
                    next_action = sequence[i+order]

                    # Count transitions
                    self.sequence_counts[context] += 1

                    if context not in self.transition_matrix:
                        self.transition_matrix[context] = defaultdict(float)

                    self.transition_matrix[context][next_action] += 1

            # Normalize to probabilities
            for context in self.transition_matrix:
                total = sum(self.transition_matrix[context].values())
                for action in self.transition_matrix[context]:
                    self.transition_matrix[context][action] /= total

            self.trained_at = datetime.utcnow()
            logger.info(f"Sequence model trained: {len(self.transition_matrix)} contexts")

        except Exception as e:
            logger.error(f"Error training sequence model: {e}")

    def export_state(self) -> Dict[str, Any]:
        """Serialize the trained model for persistence."""
        return {
            'trained_at': self.trained_at.isoformat() if self.trained_at else None,
            'transition_matrix': [
                {
                    'context': list(context),
                    'transitions': {
                        action: float(prob)
                        for action, prob in transitions.items()
                    },
                }
                for context, transitions in self.transition_matrix.items()
            ],
            'sequence_counts': [
                {
                    'context': list(context),
                    'count': int(count)
                }
                for context, count in self.sequence_counts.items()
            ],
        }

    def predict_next(
        self,
        current_sequence: List[str],
        top_n: int = 3
    ) -> List[Dict]:
        """
        Predict next actions given current sequence.
        
        Args:
            current_sequence: Current sequence of actions
            top_n: Number of predictions to return
        
        Returns:
            List of predicted actions with probabilities
        """
        if not self.transition_matrix:
            return []

        # Get context (last n actions)
        if len(current_sequence) == 0:
            return []

        # Try different context sizes
        predictions = []
        
        for order in range(len(current_sequence), 0, -1):
            context = tuple(current_sequence[-order:])
            
            if context in self.transition_matrix:
                transitions = self.transition_matrix[context]
                
                # Sort by probability
                sorted_transitions = sorted(
                    transitions.items(),
                    key=lambda x: x[1],
                    reverse=True
                )[:top_n]

                predictions = [
                    {
                        'action': action,
                        'probability': float(prob),
                        'context': list(context),
                    }
                    for action, prob in sorted_transitions
                ]
                break

        return predictions

    def predict_browsing_path(
        self,
        start_action: str,
        max_length: int = 5
    ) -> List[str]:
        """
        Predict a complete browsing path from a starting action.
        
        Args:
            start_action: Starting action
            max_length: Maximum path length
        
        Returns:
            Predicted sequence of actions
        """
        path = [start_action]
        current_context = [start_action]

        for _ in range(max_length - 1):
            next_predictions = self.predict_next(current_context, top_n=1)
            
            if not next_predictions:
                break

            next_action = next_predictions[0]['action']
            path.append(next_action)
            current_context.append(next_action)

            # Keep context size manageable
            if len(current_context) > 3:
                current_context = current_context[-3:]

        return path


class BrowsingPatternAnalyzer:
    """
    Analyze user browsing patterns and predict behavior.
    """

    def __init__(self):
        """Initialize browsing pattern analyzer."""
        self.sequence_model = SequenceModel()
        self.model_state_path = (
            Path(__file__).resolve().parent.parent / "data" / "sequence_model_state.json"
        )

    def analyze_user_session(
        self,
        user_id: str,
        session_actions: List[Dict]
    ) -> Dict:
        """
        Analyze a user's browsing session.
        
        Args:
            user_id: User ID
            session_actions: List of actions with timestamps
        
        Returns:
            Analysis results with patterns and predictions
        """
        try:
            # Extract action sequence
            actions = [a.get('action', 'unknown') for a in session_actions]
            
            # Analyze patterns
            patterns = self._extract_patterns(actions)
            
            # Predict next actions
            predictions = self.sequence_model.predict_next(actions, top_n=3)
            
            return {
                'user_id': user_id,
                'session_length': len(actions),
                'patterns': patterns,
                'predictions': predictions,
                'analyzed_at': datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.error(f"Error analyzing user session: {e}")
            return {
                'user_id': user_id,
                'error': str(e),
            }

    def _extract_patterns(self, actions: List[str]) -> Dict:
        """Extract patterns from action sequence."""
        patterns = {
            'most_common_action': Counter(actions).most_common(1)[0][0] if actions else None,
            'action_transitions': {},
            'session_type': self._classify_session_type(actions),
        }

        # Count transitions
        for i in range(len(actions) - 1):
            transition = f"{actions[i]} -> {actions[i+1]}"
            patterns['action_transitions'][transition] = patterns['action_transitions'].get(transition, 0) + 1

        return patterns

    def _classify_session_type(self, actions: List[str]) -> str:
        """Classify session type based on actions."""
        if not actions:
            return 'unknown'

        action_counts = Counter(actions)
        
        if action_counts.get('save', 0) > 2:
            return 'planning'
        elif action_counts.get('view', 0) > 5:
            return 'browsing'
        elif action_counts.get('click', 0) > 3:
            return 'exploring'
        else:
            return 'casual'

    async def train_on_historical_data(self, days: int = 30) -> Dict[str, Any]:
        """Asynchronously train the sequence model on historical browsing data."""
        try:
            loop = asyncio.get_running_loop()
            return await loop.run_in_executor(None, self._train_and_persist, days)
        except RuntimeError:
            # Fallback for synchronous contexts (e.g., scripts)
            return self._train_and_persist(days)

    def _train_and_persist(self, days: int) -> Dict[str, Any]:
        """Fetch sequences, train the model, and persist the state."""
        sequences = self._fetch_browsing_sequences(days)

        metadata: Dict[str, Any] = {
            'days': days,
            'sequence_count': len(sequences),
            'context_count': 0,
            'status': 'no_data',
            'model_path': None,
            'trained_at': None,
        }

        if not sequences:
            logger.warning("No browsing sequences found for training")
            return metadata

        # Train a fresh model so counts reflect only this batch
        self.sequence_model = SequenceModel()
        self.sequence_model.train(sequences, order=2)

        metadata['context_count'] = len(self.sequence_model.transition_matrix)
        metadata['status'] = 'trained'
        metadata['trained_at'] = self.sequence_model.trained_at.isoformat() if self.sequence_model.trained_at else None
        metadata['model_path'] = str(self.model_state_path)

        self._persist_model_state(metadata)
        logger.info(
            "Trained sequence model on %s sequences (%s contexts)",
            metadata['sequence_count'],
            metadata['context_count'],
        )
        return metadata

    def _persist_model_state(self, metadata: Dict[str, Any]) -> None:
        """Persist the trained transition matrix and metadata to disk."""
        try:
            self.model_state_path.parent.mkdir(parents=True, exist_ok=True)
            state = {
                'metadata': metadata,
                **self.sequence_model.export_state(),
            }
            with self.model_state_path.open('w', encoding='utf-8') as f:
                json.dump(state, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to persist sequence model state: {e}")

    def _fetch_browsing_sequences(self, days: int) -> List[List[str]]:
        """Fetch browsing sequences from database."""
        try:
            query = """
            WITH filtered_interactions AS (
                SELECT
                    user_id,
                    COALESCE(interaction_type, 'unknown') AS action,
                    created_at
                FROM user_interactions
                WHERE user_id IS NOT NULL
                  AND interaction_type = ANY(%s)
                  AND created_at >= NOW() - (%s || ' days')::interval
            ),
            sessionized AS (
                SELECT
                    user_id,
                    action,
                    created_at,
                    SUM(session_boundary) OVER (
                        PARTITION BY user_id
                        ORDER BY created_at
                        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                    ) AS session_id
                FROM (
                    SELECT
                        *,
                        CASE
                            WHEN LAG(created_at) OVER (PARTITION BY user_id ORDER BY created_at) IS NULL THEN 1
                            WHEN created_at - LAG(created_at) OVER (PARTITION BY user_id ORDER BY created_at) > INTERVAL '30 minutes' THEN 1
                            ELSE 0
                        END AS session_boundary
                    FROM filtered_interactions
                ) ordered
            )
            SELECT
                user_id,
                session_id,
                MIN(created_at) AS session_start,
                ARRAY_AGG(action ORDER BY created_at) AS actions
            FROM sessionized
            GROUP BY user_id, session_id
            ORDER BY session_start DESC
            """

            actions = ['view', 'save', 'click', 'favorite']

            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, (actions, str(days)))
                    rows = cur.fetchall()

            sequences = [row[3] for row in rows if row[3]]
            logger.info("Fetched %s browsing sessions for training", len(sequences))
            return sequences
        except Exception as e:
            logger.error(f"Error fetching browsing sequences: {e}")
            return []


# Global instance
_browsing_analyzer_instance = None


def get_browsing_analyzer() -> BrowsingPatternAnalyzer:
    """Get or create the global browsing analyzer instance."""
    global _browsing_analyzer_instance
    if _browsing_analyzer_instance is None:
        _browsing_analyzer_instance = BrowsingPatternAnalyzer()
    return _browsing_analyzer_instance

