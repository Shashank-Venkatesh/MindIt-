"""Lightweight in-process cache with randomized TTL.

Why randomized TTL?
-------------------
When many users authenticate around the same time, a fixed TTL causes the
cache entries to expire simultaneously, producing a synchronized "thundering
herd" of recomputation/DB hits that can crash the server under load. By
jittering the expiration window per entry, expirations spread out over time
so regeneration happens in a staggered fashion instead of all at once.

This cache is intentionally simple (no external dependency). It is used for
short-lived, non-critical data such as decoded JWT payloads and profile
lookups. It is *not* a source of truth — a cache miss simply falls back to
the underlying computation.
"""

from __future__ import annotations

import random
import threading
import time
from typing import Any, Callable, Dict, Optional, Tuple


class RandomTTLCache:
    """Thread-safe cache where each entry gets a randomized lifetime.

    Parameters
    ----------
    base_ttl:
        Minimum lifetime in seconds for any entry.
    jitter:
        Maximum extra seconds added on top of ``base_ttl``. The actual TTL
        for an entry is ``base_ttl + random.uniform(0, jitter)``.
    max_size:
        Soft cap on the number of entries. When exceeded, the oldest
        entries (by insertion time) are evicted to keep memory bounded.
    """

    def __init__(self, base_ttl: float = 30.0, jitter: float = 30.0, max_size: int = 1000):
        if base_ttl < 0:
            raise ValueError("base_ttl must be non-negative")
        if jitter < 0:
            raise ValueError("jitter must be non-negative")
        if max_size < 1:
            raise ValueError("max_size must be at least 1")

        self._base_ttl = float(base_ttl)
        self._jitter = float(jitter)
        self._max_size = int(max_size)

        # key -> (value, expires_at)
        self._store: Dict[str, Tuple[Any, float]] = {}
        self._lock = threading.Lock()

    def _random_ttl(self) -> float:
        """Return a randomized TTL in seconds for a single entry."""
        return self._base_ttl + random.uniform(0.0, self._jitter)

    def _evict_locked(self) -> None:
        """Drop expired entries and enforce max_size. Caller must hold the lock."""
        now = time.monotonic()
        # Evict expired entries first.
        expired = [k for k, (_, exp) in self._store.items() if exp <= now]
        for k in expired:
            self._store.pop(k, None)

        # If still over capacity, evict the soonest-expiring entries.
        if len(self._store) > self._max_size:
            # Sort by expiration ascending and drop the surplus.
            sorted_items = sorted(self._store.items(), key=lambda item: item[1][1])
            surplus = len(self._store) - self._max_size
            for k, _ in sorted_items[:surplus]:
                self._store.pop(k, None)

    def get(self, key: str) -> Optional[Any]:
        """Return the cached value for ``key`` or ``None`` if missing/expired."""
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, expires_at = entry
            if time.monotonic() >= expires_at:
                # Lazy eviction on read.
                self._store.pop(key, None)
                return None
            return value

    def set(self, key: str, value: Any) -> None:
        """Store ``value`` under ``key`` with a fresh randomized TTL."""
        with self._lock:
            self._store[key] = (value, time.monotonic() + self._random_ttl())
            self._evict_locked()

    def get_or_set(self, key: str, factory: Callable[[], Any]) -> Any:
        """Return the cached value, computing it via ``factory`` on a miss.

        ``factory`` is called outside the lock so that expensive computation
        (e.g. DB queries, JWT decoding) does not block other readers.
        """
        cached = self.get(key)
        if cached is not None:
            return cached

        value = factory()
        if value is not None:
            self.set(key, value)
        return value

    def invalidate(self, key: str) -> None:
        """Force-remove a single entry (e.g. on logout or token revocation)."""
        with self._lock:
            self._store.pop(key, None)

    def clear(self) -> None:
        """Remove all entries."""
        with self._lock:
            self._store.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._store)


# Shared instances used across the app.
#
# - token_cache: caches decoded JWT payloads keyed by the raw token string.
#   Short base TTL with jitter so mass re-decode storms are spread out.
# - profile_cache: caches profile row lookups keyed by user id.
token_cache = RandomTTLCache(base_ttl=30.0, jitter=45.0, max_size=2000)
profile_cache = RandomTTLCache(base_ttl=60.0, jitter=60.0, max_size=1000)
