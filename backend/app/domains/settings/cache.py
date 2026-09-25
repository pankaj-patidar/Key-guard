import time
from typing import Any

_cache: dict[str, tuple[Any, float]] = {}
TTL = 60.0


def get(key: str) -> Any | None:
    if key in _cache:
        value, ts = _cache[key]
        if time.monotonic() - ts < TTL:
            return value
        del _cache[key]
    return None


def set(key: str, value: Any) -> None:
    _cache[key] = (value, time.monotonic())


def invalidate(key: str) -> None:
    _cache.pop(key, None)


def invalidate_all() -> None:
    _cache.clear()
