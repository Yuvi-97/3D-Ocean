"""
Thread-safe in-memory LRU Cache for Ocean Visualizer Backend.

Caches repetitive model slices and profile responses in RAM to provide
sub-millisecond repeat queries without external services (e.g. Redis).
"""

from collections import OrderedDict
import threading
from typing import Any, Optional
import logging

logger = logging.getLogger(__name__)


class SimpleLRUCache:
    """Lightweight bounded in-memory LRU cache."""

    def __init__(self, max_entries: int = 128, enabled: bool = True):
        self.max_entries = max_entries
        self.enabled = enabled
        self._cache: OrderedDict = OrderedDict()
        self._lock = threading.Lock()
        self.hits = 0
        self.misses = 0

    def get(self, key: str) -> Optional[Any]:
        """Retrieves an item from cache. Returns None on cache miss."""
        if not self.enabled:
            return None

        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
                self.hits += 1
                return self._cache[key]
            self.misses += 1
            return None

    def set(self, key: str, value: Any) -> None:
        """Sets an item in cache, evicting oldest item if exceeding max_entries."""
        if not self.enabled:
            return

        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
            self._cache[key] = value
            if len(self._cache) > self.max_entries:
                self._cache.popitem(last=False)

    def clear(self) -> None:
        """Clears all entries in the cache."""
        with self._lock:
            self._cache.clear()
            self.hits = 0
            self.misses = 0

    def stats(self) -> dict:
        """Returns cache statistics."""
        with self._lock:
            total = self.hits + self.misses
            ratio = round((self.hits / total) * 100, 1) if total > 0 else 0.0
            return {
                "size": len(self._cache),
                "max_entries": self.max_entries,
                "hits": self.hits,
                "misses": self.misses,
                "hit_ratio_percent": ratio,
            }


# Global in-memory cache instance
cache = SimpleLRUCache(max_entries=128, enabled=True)
