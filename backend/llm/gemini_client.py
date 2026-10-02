"""Gemini JSON calls behind the queue and cache. Disabled (offline brain only) when no key is set."""
from __future__ import annotations

import json
import os
import time

from ..db import DB
from .cache import LLMCache
from .request_queue import QuotaExhausted, RequestQueue


class LLMError(Exception):
    pass


class LLM:
    def __init__(self, db: DB):
        self.api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        self.model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
        self._blocked_until = 0.0
        self.cache = LLMCache(db)
        self.queue = RequestQueue(float(os.environ.get("GEMINI_MIN_INTERVAL", "4.5")))
        self._client = None

    @property
    def enabled(self) -> bool:
        """False without a key, and for a while after the quota runs out (agents then use the offline brain)."""
        return bool(self.api_key) and time.monotonic() >= self._blocked_until

    def _get_client(self):
        if self._client is None:
            from google import genai
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    async def json(self, system: str, prompt: str, stats: dict) -> dict:
        """Returns the parsed JSON object, or raises LLMError."""
        key = self.cache.key(self.model, system, prompt)
        if (hit := self.cache.get(key)) is not None:
            stats["cache_hits"] = stats.get("cache_hits", 0) + 1
            return json.loads(hit)

        from google.genai import types

        async def call() -> str:
            resp = await self._get_client().aio.models.generate_content(
                model=self.model, contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system, response_mime_type="application/json", temperature=0.4),
            )
            return resp.text or ""

        stats["llm_calls"] = stats.get("llm_calls", 0) + 1
        try:
            text = await self.queue.run(call)
            data = json.loads(text)
            if not isinstance(data, dict):
                raise ValueError("expected a JSON object")
        except QuotaExhausted as e:
            # Stop asking for ten minutes: every further call would fail and count against the quota.
            self._blocked_until = time.monotonic() + 600
            stats["llm_failures"] = stats.get("llm_failures", 0) + 1
            raise LLMError("quota exhausted: " + str(e)[:200]) from e
        except Exception as e:  # noqa: BLE001
            stats["llm_failures"] = stats.get("llm_failures", 0) + 1
            raise LLMError(str(e)) from e
        self.cache.set(key, json.dumps(data))
        return data
