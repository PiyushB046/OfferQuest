"""Agent-to-agent messages (spec §6.2). Sending a message is always visible in the office."""
from __future__ import annotations

from typing import TYPE_CHECKING

from ..models import AgentMessage
from .event_emitter import now_iso

if TYPE_CHECKING:
    from ..orchestrator.runtime import QuestRuntime


class MessageBus:
    def __init__(self, rt: "QuestRuntime"):
        self.rt = rt
        self._n = 0

    def send(self, sender: str, receiver: str, mtype: str, content: str,
             attachments: list[str] | None = None) -> AgentMessage:
        rt = self.rt
        rt.guard.step()
        rt.guard.check_message(sender, receiver, mtype, content)
        self._n += 1
        qid = rt.qf.quest.id
        msg = AgentMessage(id=f"{qid}_msg_{self._n:04d}", quest_id=qid, sender=sender, receiver=receiver,
                           type=mtype, content=content, attachments=attachments or [],  # type: ignore[arg-type]
                           timestamp=now_iso())
        rt.db.add_message(msg.id, qid, msg.model_dump())
        item = (attachments or [None])[0]

        if mtype in ("ASK", "INFORM"):
            rt.emit(event="MOVE", agent=sender, to=f"agent:{receiver}")
            rt.emit(event="SPEAK", agent=sender, to=receiver, text=content, status=mtype.lower())
        elif mtype in ("HANDOFF", "REVIEW_REQUEST"):
            rt.emit(event="HANDOFF", agent=sender, to=receiver, item=item or "file", text=content,
                    status=mtype.lower())
        elif mtype == "SEND_BACK":
            rt.emit(event="HANDOFF", agent=sender, to=receiver, item=item or "file", text=content,
                    status="send_back")
        elif mtype in ("ANSWER", "DONE"):
            rt.emit(event="SPEAK", agent=sender, to=receiver, text=content, status=mtype.lower())
        # ASK_HUMAN is emitted by the agent itself, with the prompt attached.
        return msg
