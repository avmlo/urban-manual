"""Performance optimization utilities: caching, batching, async operations."""

from typing import List, Dict, Optional, Callable, Any
from datetime import datetime, timedelta
from functools import wraps
import asyncio
from collections import OrderedDict
import hashlib
import json

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


class LRUCache:
    """Least Recently Used cache implementation."""

    def __init__(self, max_size: int = 1000, ttl_seconds: Optional[int] = None):
        """
        Initialize LRU cache.
        
        Args:
            max_size: Maximum number of items in cache
            ttl_seconds: Time-to-live in seconds (None for no expiration)
        """
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self.cache: OrderedDict = OrderedDict()
        self.timestamps: Dict[str, datetime] = {}

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        if key not in self.cache:
            return None

        # Check TTL
        if self.ttl_seconds:
            if key in self.timestamps:
                age = (datetime.utcnow() - self.timestamps[key]).total_seconds()
                if age > self.ttl_seconds:
                    self.delete(key)
                    return None

        # Move to end (most recently used)
        self.cache.move_to_end(key)
        return self.cache[key]

    def set(self, key: str, value: Any):
        """Set value in cache."""
        if key in self.cache:
            # Update existing
            self.cache.move_to_end(key)
        else:
            # Add new
            if len(self.cache) >= self.max_size:
                # Remove least recently used
                oldest_key = next(iter(self.cache))
                self.delete(oldest_key)

        self.cache[key] = value
        self.timestamps[key] = datetime.utcnow()

    def delete(self, key: str):
        """Delete key from cache."""
        if key in self.cache:
            del self.cache[key]
        if key in self.timestamps:
            del self.timestamps[key]

    def clear(self):
        """Clear all cache entries."""
        self.cache.clear()
        self.timestamps.clear()

    def size(self) -> int:
        """Get current cache size."""
        return len(self.cache)


class BatchProcessor:
    """Batch processing for efficient bulk operations."""

    def __init__(self, batch_size: int = 100, delay_seconds: float = 0.1):
        """
        Initialize batch processor.
        
        Args:
            batch_size: Maximum batch size
            delay_seconds: Delay between batches
        """
        self.batch_size = batch_size
        self.delay_seconds = delay_seconds
        self.pending_items: List[Any] = []

    async def add(self, item: Any):
        """Add item to batch."""
        self.pending_items.append(item)

    async def process_batch(self, processor: Callable[[List[Any]], Any]) -> List[Any]:
        """
        Process items in batches.
        
        Args:
            processor: Function to process a batch of items
        
        Returns:
            List of results
        """
        results = []

        while self.pending_items:
            batch = self.pending_items[:self.batch_size]
            self.pending_items = self.pending_items[self.batch_size:]

            try:
                batch_results = await processor(batch)
                results.extend(batch_results)
            except Exception as e:
                logger.error(f"Error processing batch: {e}")

            # Delay between batches
            if self.pending_items:
                await asyncio.sleep(self.delay_seconds)

        return results


def cache_result(ttl_seconds: int = 3600, max_size: int = 1000):
    """
    Decorator to cache function results.
    
    Args:
        ttl_seconds: Cache TTL in seconds
        max_size: Maximum cache size
    """
    cache = LRUCache(max_size=max_size, ttl_seconds=ttl_seconds)

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            cache_key = _create_cache_key(func.__name__, args, kwargs)

            # Check cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {func.__name__}")
                return cached_result

            # Execute function
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)

            # Store in cache
            cache.set(cache_key, result)
            return result

        wrapper.cache = cache  # Expose cache for clearing
        return wrapper

    return decorator


def _create_cache_key(func_name: str, args: tuple, kwargs: dict) -> str:
    """Create a cache key from function name and arguments."""
    key_data = {
        'func': func_name,
        'args': str(args),
        'kwargs': json.dumps(kwargs, sort_keys=True, default=str),
    }
    key_string = json.dumps(key_data, sort_keys=True)
    return hashlib.md5(key_string.encode()).hexdigest()


class PerformanceMonitor:
    """Monitor and log performance metrics."""

    def __init__(self):
        """Initialize performance monitor."""
        self.metrics: Dict[str, List[float]] = defaultdict(list)

    def record_timing(self, operation: str, duration_seconds: float):
        """Record timing for an operation."""
        self.metrics[operation].append(duration_seconds)

    def get_statistics(self, operation: str) -> Dict:
        """Get statistics for an operation."""
        if operation not in self.metrics or not self.metrics[operation]:
            return {
                'operation': operation,
                'count': 0,
                'mean': 0.0,
                'min': 0.0,
                'max': 0.0,
            }

        timings = self.metrics[operation]
        return {
            'operation': operation,
            'count': len(timings),
            'mean': float(np.mean(timings)),
            'min': float(np.min(timings)),
            'max': float(np.max(timings)),
            'p95': float(np.percentile(timings, 95)),
            'p99': float(np.percentile(timings, 99)),
        }

    def get_all_statistics(self) -> Dict:
        """Get statistics for all operations."""
        return {
            operation: self.get_statistics(operation)
            for operation in self.metrics.keys()
        }


def timing_decorator(monitor: PerformanceMonitor):
    """
    Decorator to measure function execution time.
    
    Args:
        monitor: PerformanceMonitor instance
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start = datetime.utcnow()
            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                duration = (datetime.utcnow() - start).total_seconds()
                monitor.record_timing(func.__name__, duration)

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start = datetime.utcnow()
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                duration = (datetime.utcnow() - start).total_seconds()
                monitor.record_timing(func.__name__, duration)

        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


# Global instances
_performance_monitor = PerformanceMonitor()


def get_performance_monitor() -> PerformanceMonitor:
    """Get global performance monitor."""
    return _performance_monitor

