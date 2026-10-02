"""Everything one running quest needs: the Quest File, the crew, the bus, the guardrails."""
from __future__ import annotations

from typing import Any, Awaitable, Callable

from ..db import DB
from ..llm.gemini_client import LLM
from ..messaging.event_emitter import EventHub, now_iso
from ..messaging.message_bus import MessageBus
from ..models import QuestFile
from ..tools.knowledge import Knowledge
from .guardrails import Guardrails

# prompt dict -> the student's answer ("" means skipped)
HumanProvider = Callable[[dict], Awaitable[str]]


class QuestRuntime:
    def __init__(self, qf: QuestFile, db: DB, hub: EventHub, llm: LLM, human: HumanProvider):
        from ..agents import build_agents

        self.qf, self.db, self.hub, self.llm, self.human = qf, db, hub, llm, human
        self.kb = Knowledge.for_dir(db.data_dir)
        self.guard = Guardrails()
        self.bus = MessageBus(self)
        self.stats: dict[str, Any] = {"actions": 0, "announced": 0, "llm_calls": 0, "llm_failures": 0,
                                      "cache_hits": 0, "events": 0, "send_backs": 0, "human_asks": 0}
        self.agents = build_agents(self)
        self._prompt_n = 0

    def emit(self, **fields: Any) -> dict:
        self.stats["events"] += 1
        return self.hub.emit(self.qf.quest.id, **fields)

    def set_stage(self, stage: str) -> None:
        self.qf.quest.stage = stage  # type: ignore[assignment]
        self.emit(event="STAGE", agent="counselor", status=stage)
        self.save()

    def save(self) -> None:
        self.qf.stats = dict(self.stats, steps=self.guard.steps,
                             brain="gemini" if self.llm.enabled else "offline")
        self.db.save_quest(self.qf, now_iso())

    def next_prompt_id(self) -> str:
        self._prompt_n += 1
        return f"{self.qf.quest.id}_p{self._prompt_n}"
