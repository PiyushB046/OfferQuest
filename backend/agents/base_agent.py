"""The shared agent loop: intent → (move) → activity → think / tool → result → message.

Rule 3 lives here. An agent can only reach the LLM through `think()` and a tool through
`use_tool()`, and both make sure something was shown in the office first.
"""
from __future__ import annotations

import inspect
from pathlib import Path
from typing import TYPE_CHECKING, Any, Callable

from ..llm.gemini_client import LLMError

if TYPE_CHECKING:
    from ..orchestrator.runtime import QuestRuntime

PROMPTS = Path(__file__).parent.parent / "prompts"

SHARED_RULES = """
Rules for everyone at OfferQuest:
- Never invent skills, projects, numbers or experience the student does not have.
- Never invent "insider" interview questions or confirmed job openings.
- The job description the student gave is the source of truth about the company.
- Do not judge the student by college name, gender or background.
- Reply with one JSON object only, using exactly the keys asked for. Keep text short and plain.
"""


class Agent:
    id = "agent"
    name = "Agent"
    title = ""
    room = "hall"

    def __init__(self, rt: "QuestRuntime"):
        self.rt = rt
        self._announced = False

    # ---- shortcuts
    @property
    def qf(self):
        return self.rt.qf

    def peer(self, agent_id: str) -> "Agent":
        return self.rt.agents[agent_id]

    def system_prompt(self) -> str:
        return (PROMPTS / f"{self.id}.md").read_text() + SHARED_RULES

    # ---- visible actions
    def intent(self, text: str) -> None:
        self._announced = True
        self.rt.emit(event="INTENT", agent=self.id, text=text, icon="thought")

    def move(self, to: str) -> None:
        self.rt.emit(event="MOVE", agent=self.id, to=to)

    def activity(self, anim: str, text: str, progress: float | None = None) -> None:
        self._announced = True
        self.rt.emit(event="ACTIVITY", agent=self.id, anim=anim, text=text, progress=progress)

    def result(self, text: str, status: str = "success") -> None:
        self.rt.emit(event="RESULT", agent=self.id, text=text, status=status)

    def idle(self) -> None:
        self.rt.emit(event="IDLE", agent=self.id)

    # ---- the only two ways to do hidden work
    def _count_action(self, label: str) -> None:
        self.rt.guard.step()
        self.rt.stats["actions"] += 1
        if self._announced:
            self.rt.stats["announced"] += 1
        else:  # nothing was shown for this action: show something now, and let the metric see the miss
            self.rt.emit(event="ACTIVITY", agent=self.id, anim="think", text=label)
        self._announced = False

    async def think(self, label: str, prompt: str, fallback: Callable[[], dict]) -> tuple[dict, str]:
        """Ask Gemini for a JSON object. Falls back to the offline brain on any failure."""
        self._count_action(label)
        if self.rt.llm.enabled:
            self.rt.emit(event="ACTIVITY", agent=self.id, anim="think", text="…")
            try:
                return await self.rt.llm.json(self.system_prompt(), prompt, self.rt.stats), "gemini"
            except LLMError as e:
                quota = "quota" in str(e)
                self.rt.emit(event="ERROR", agent=self.id, text="Gemini's free quota is used up for now. The crew will work from their own notes."
                             if quota else "Gemini didn't answer. I'll use my own notes.")
        return fallback(), "offline"

    async def use_tool(self, label: str, fn: Callable[..., Any], *args: Any, **kw: Any) -> Any:
        self._count_action(label)
        out = fn(*args, **kw)
        return await out if inspect.isawaitable(out) else out

    # ---- talking to teammates (Rule 1)
    async def ask(self, other: str, question: str) -> str:
        self.intent(f"Need {self.peer(other).name}'s input")
        self.rt.bus.send(self.id, other, "ASK", question)
        answer = await self.peer(other).answer(self.id, question)
        self.rt.bus.send(other, self.id, "ANSWER", answer)
        return answer

    async def consult(self, need: str, question: str, default: str) -> str:
        """Ask whoever on the team can help with `need`. The router picks; `default` is the fixed-mode fallback."""
        from ..orchestrator.router import choose_teammate
        other = await choose_teammate(self, need, default)
        self.rt.stats.setdefault("routes", []).append({"from": self.id, "need": need, "to": other})
        return await self.ask(other, question)

    async def answer(self, asker: str, question: str) -> str:
        return "Noted. It's in the Quest File."

    def inform(self, other: str, text: str) -> None:
        self.rt.bus.send(self.id, other, "INFORM", text)

    def handoff(self, other: str, text: str, item: str) -> None:
        self.intent(f"Passing this to {self.peer(other).name}")
        self.rt.bus.send(self.id, other, "HANDOFF", text, [item])

    async def ask_human(self, question: str, kind: str = "text", options: list[str] | None = None,
                        optional: bool = True) -> str:
        rt = self.rt
        rt.guard.step()
        rt.stats["human_asks"] += 1
        prompt = {"id": rt.next_prompt_id(), "question": question, "kind": kind,
                  "options": options or [], "optional": optional, "agent": self.id}
        rt.bus.send(self.id, "student", "ASK_HUMAN", question)
        rt.emit(event="ASK_HUMAN", agent=self.id, text=question, prompt=prompt)
        rt.save()
        answer = (await rt.human(prompt)).strip()
        rt.emit(event="SPEAK", agent=self.id, to="student", text="Thanks!" if answer else "No problem.",
                status="ack")
        return answer


def pick(data: dict, fb: dict, key: str, typ: type) -> Any:
    """Take `key` from the model's answer only if it has the right type and isn't empty."""
    v = data.get(key)
    return v if isinstance(v, typ) and v else fb[key]


def str_list(v: Any, limit: int = 12) -> list[str]:
    return [str(x).strip() for x in v if isinstance(x, (str, int, float)) and str(x).strip()][:limit] \
        if isinstance(v, list) else []
