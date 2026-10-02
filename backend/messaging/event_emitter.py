"""Every agent step becomes a visual event: stored, then fanned out to whoever is watching."""
from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any

from ..db import DB
from ..models import VisualEvent


def now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


class EventHub:
    def __init__(self, db: DB):
        self.db = db
        self._subscribers: set[asyncio.Queue] = set()

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        self._subscribers.discard(q)

    def emit(self, quest_id: str, **fields: Any) -> dict:
        ev = VisualEvent(**fields).model_dump(exclude_none=True)
        ev["quest_id"] = quest_id
        ev["ts"] = now_iso()
        if ev["event"] == "HANDOFF":
            ev["from"] = ev["agent"]  # spec §7.4 names the giver `from`
        ev["seq"] = self.db.add_event(quest_id, ev)
        for q in self._subscribers:
            q.put_nowait(ev)
        return ev
