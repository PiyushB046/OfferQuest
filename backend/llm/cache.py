"""The same JD or question is never sent to Gemini twice."""
from __future__ import annotations

import hashlib

from ..db import DB


class LLMCache:
    def __init__(self, db: DB):
        self.db = db

    @staticmethod
    def key(model: str, system: str, prompt: str) -> str:
        return hashlib.sha256(f"{model}\x00{system}\x00{prompt}".encode()).hexdigest()

    def get(self, key: str) -> str | None:
        return self.db.cache_get(key)

    def set(self, key: str, value: str) -> None:
        self.db.cache_set(key, value)
