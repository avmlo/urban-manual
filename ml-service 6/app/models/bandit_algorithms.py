"""Bandit algorithms for prompt selection and A/B testing."""

from typing import List, Dict, Optional, Tuple
from datetime import datetime
import numpy as np
import random

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


class BanditAlgorithm:
    """
    Multi-armed bandit algorithms for optimizing prompt selection and recommendations.
    
    Supports:
    - ε-Greedy (simple exploration-exploitation)
    - Thompson Sampling (Bayesian approach)
    - UCB (Upper Confidence Bound)
    """

    def __init__(self, algorithm: str = "epsilon_greedy"):
        """
        Initialize bandit algorithm.
        
        Args:
            algorithm: Algorithm type ('epsilon_greedy', 'thompson', 'ucb')
        """
        self.algorithm = algorithm
        self.arms: Dict[str, Dict] = {}  # arm_id -> {rewards: [], pulls: 0, mean: 0.0}
        self.total_pulls = 0

    def add_arm(self, arm_id: str, initial_reward: float = 0.0):
        """Add a new arm (action) to the bandit."""
        if arm_id not in self.arms:
            self.arms[arm_id] = {
                'rewards': [initial_reward] if initial_reward > 0 else [],
                'pulls': 0,
                'mean': initial_reward,
                'variance': 0.0,
            }

    def select_arm(self, epsilon: float = 0.1) -> str:
        """
        Select an arm using the configured algorithm.
        
        Args:
            epsilon: Exploration rate for ε-greedy (0.0 to 1.0)
        
        Returns:
            Selected arm ID
        """
        if not self.arms:
            raise ValueError("No arms available")

        if self.algorithm == "epsilon_greedy":
            return self._epsilon_greedy_select(epsilon)
        elif self.algorithm == "thompson":
            return self._thompson_select()
        elif self.algorithm == "ucb":
            return self._ucb_select()
        else:
            return self._epsilon_greedy_select(epsilon)

    def update(self, arm_id: str, reward: float):
        """
        Update arm statistics with a reward.
        
        Args:
            arm_id: Arm that was selected
            reward: Reward received (0.0 to 1.0)
        """
        if arm_id not in self.arms:
            self.add_arm(arm_id)

        arm = self.arms[arm_id]
        arm['rewards'].append(reward)
        arm['pulls'] += 1
        self.total_pulls += 1

        # Update mean
        arm['mean'] = np.mean(arm['rewards'])

        # Update variance
        if len(arm['rewards']) > 1:
            arm['variance'] = np.var(arm['rewards'])

    def _epsilon_greedy_select(self, epsilon: float) -> str:
        """ε-Greedy selection: explore with probability ε, exploit otherwise."""
        if random.random() < epsilon:
            # Explore: select random arm
            return random.choice(list(self.arms.keys()))
        else:
            # Exploit: select arm with highest mean reward
            return max(self.arms.items(), key=lambda x: x[1]['mean'])[0]

    def _thompson_select(self) -> str:
        """Thompson Sampling: Bayesian approach."""
        # Simplified Thompson Sampling using Beta distribution
        # For each arm, sample from Beta(alpha, beta) where:
        # alpha = successes + 1, beta = failures + 1
        
        samples = {}
        for arm_id, arm in self.arms.items():
            successes = sum(1 for r in arm['rewards'] if r > 0.5)
            failures = arm['pulls'] - successes
            
            # Sample from Beta distribution
            alpha = successes + 1
            beta = failures + 1
            
            # Use normal approximation for simplicity
            # In production, use scipy.stats.beta
            if arm['pulls'] == 0:
                samples[arm_id] = 0.5  # Uniform prior
            else:
                samples[arm_id] = np.random.beta(alpha, beta)

        return max(samples.items(), key=lambda x: x[1])[0]

    def _ucb_select(self, c: float = 2.0) -> str:
        """Upper Confidence Bound selection."""
        if self.total_pulls == 0:
            return random.choice(list(self.arms.keys()))

        ucb_values = {}
        for arm_id, arm in self.arms.items():
            if arm['pulls'] == 0:
                ucb_values[arm_id] = float('inf')
            else:
                # UCB formula: mean + c * sqrt(ln(total_pulls) / arm_pulls)
                exploration = c * np.sqrt(np.log(self.total_pulls) / arm['pulls'])
                ucb_values[arm_id] = arm['mean'] + exploration

        return max(ucb_values.items(), key=lambda x: x[1])[0]

    def get_statistics(self) -> Dict:
        """Get statistics for all arms."""
        return {
            'algorithm': self.algorithm,
            'total_pulls': self.total_pulls,
            'arms': {
                arm_id: {
                    'pulls': arm['pulls'],
                    'mean_reward': float(arm['mean']),
                    'total_rewards': len(arm['rewards']),
                }
                for arm_id, arm in self.arms.items()
            },
        }

    def get_best_arm(self) -> Optional[str]:
        """Get the arm with highest mean reward."""
        if not self.arms:
            return None
        
        return max(self.arms.items(), key=lambda x: x[1]['mean'])[0]


class PromptSelectionBandit:
    """
    Bandit for optimizing discovery prompt selection.
    
    Tracks which prompts perform best for different user segments.
    """

    def __init__(self):
        """Initialize prompt selection bandit."""
        self.bandits: Dict[str, BanditAlgorithm] = {}  # segment -> bandit
        self.prompts = [
            'seasonal',
            'personalized',
            'trending',
            'popular',
            'nearby',
        ]

    def select_prompt(
        self,
        user_segment: str = "default",
        algorithm: str = "epsilon_greedy"
    ) -> str:
        """
        Select a prompt for a user segment.
        
        Args:
            user_segment: User segment identifier
            algorithm: Bandit algorithm to use
        
        Returns:
            Selected prompt type
        """
        if user_segment not in self.bandits:
            self.bandits[user_segment] = BanditAlgorithm(algorithm=algorithm)
            # Initialize all prompts as arms
            for prompt in self.prompts:
                self.bandits[user_segment].add_arm(prompt)

        bandit = self.bandits[user_segment]
        return bandit.select_arm(epsilon=0.1)

    def record_reward(
        self,
        user_segment: str,
        prompt: str,
        reward: float
    ):
        """
        Record reward for a prompt selection.
        
        Args:
            user_segment: User segment
            prompt: Prompt that was shown
            reward: Reward received (0.0 to 1.0, e.g., click-through rate)
        """
        if user_segment not in self.bandits:
            self.bandits[user_segment] = BanditAlgorithm()
            for p in self.prompts:
                self.bandits[user_segment].add_arm(p)

        self.bandits[user_segment].update(prompt, reward)

    def get_statistics(self, user_segment: Optional[str] = None) -> Dict:
        """Get bandit statistics."""
        if user_segment:
            if user_segment in self.bandits:
                return self.bandits[user_segment].get_statistics()
            return {}
        
        return {
            segment: bandit.get_statistics()
            for segment, bandit in self.bandits.items()
        }


# Global instances
_prompt_bandit_instance = None


def get_prompt_bandit() -> PromptSelectionBandit:
    """Get or create the global prompt bandit instance."""
    global _prompt_bandit_instance
    if _prompt_bandit_instance is None:
        _prompt_bandit_instance = PromptSelectionBandit()
    return _prompt_bandit_instance

