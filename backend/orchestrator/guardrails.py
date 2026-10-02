"""Stops agents from running forever: step limit, send-back cap, ping-pong detector (spec §6.4)."""
from __future__ import annotations

from collections import Counter

MAX_STEPS = 150
MAX_SEND_BACKS = 2
MAX_REPEATS = 2


class QuestLimitError(RuntimeError):
    pass


class Guardrails:
    def __init__(self) -> None:
        self.steps = 0
        self.send_backs: Counter[str] = Counter()
        self._seen: Counter[tuple] = Counter()

    def step(self) -> None:
        self.steps += 1
        if self.steps > MAX_STEPS:
            raise QuestLimitError(f"Quest stopped: more than {MAX_STEPS} agent steps.")

    def can_send_back(self, item: str) -> bool:
        return self.send_backs[item] < MAX_SEND_BACKS

    def record_send_back(self, item: str) -> None:
        self.send_backs[item] += 1

    def check_message(self, sender: str, receiver: str, mtype: str, content: str) -> None:
        """The same agent saying the same thing to the same teammate again and again is a loop."""
        key = (sender, receiver, mtype, content.strip().lower())
        self._seen[key] += 1
        if self._seen[key] > MAX_REPEATS:
            raise QuestLimitError(f"Loop detected: {sender} keeps sending the same {mtype} to {receiver}.")
