"""Agents take turns: one Gemini call at a time, spaced out, retried only when retrying can help."""
from __future__ import annotations

import asyncio
import re
import time
from typing import Awaitable, Callable, TypeVar

T = TypeVar("T")


class QuotaExhausted(Exception):
    """The free tier's daily allowance is used up: retrying only burns more of it."""


def retry_delay(error: str) -> float | None:
    """Seconds to wait before trying again, or None if the error is not worth retrying."""
    if "503" in error or "UNAVAILABLE" in error:
        return 3.0
    if "429" in error or "RESOURCE_EXHAUSTED" in error:
        hint = re.search(r"retry in ([\d.]+)s", error)          # a per-minute limit says when to come back
        return min(float(hint.group(1)) + 1, 45.0) if hint else None
    return None


class RequestQueue:
    def __init__(self, min_interval: float = 4.5, max_retries: int = 2):
        self.min_interval = min_interval
        self.max_retries = max_retries
        self._lock = asyncio.Lock()
        self._last = 0.0

    async def run(self, call: Callable[[], Awaitable[T]]) -> T:
        async with self._lock:
            for attempt in range(self.max_retries + 1):
                wait = self.min_interval - (time.monotonic() - self._last)
                if wait > 0:
                    await asyncio.sleep(wait)
                self._last = time.monotonic()
                try:
                    return await call()
                except Exception as e:  # noqa: BLE001 - the SDK raises several types for 429/503
                    delay = retry_delay(str(e))
                    quota = "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)
                    if delay is None or attempt == self.max_retries:
                        if quota:
                            raise QuotaExhausted(str(e)) from e
                        raise
                    await asyncio.sleep(delay)
        raise RuntimeError("unreachable")
