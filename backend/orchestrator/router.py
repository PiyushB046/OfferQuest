"""Who acts next (spec §6.4).

The quest's stage order is fixed by `quest_graph.py`: that part stays simple and reliable.
Inside a stage, agents are not told who to talk to. They describe what they need, and the router
picks the teammate whose skill card fits best. A task nobody owns goes to the Counselor, who
coordinates.

OFFERQUEST_ROUTING = dynamic (default, skill cards) | llm (Gemini picks) | fixed (hard-wired).
"""
from __future__ import annotations

import os
import re
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..agents.base_agent import Agent
    from .runtime import QuestRuntime

COORDINATOR = "counselor"

# What each teammate can help with. Order breaks ties.
TEAM: dict[str, str] = {
    "company_analyst": "company job description jd requirement skill value culture round pattern focus want "
                       "keyword probe emphasise emphasis",
    "resume_doctor": "resume cv bullet tailor rewrite summary match wording format top",
    "project_advisor": "project github repo portfolio build highlight fit best",
    "dsa_coach": "dsa coding practice problem plan leetcode algorithm structure schedule study going",
    "interview_coach": "mock interview question answer hr behavioural speaking",
    "opportunity_scout": "opening job internship apply deadline similar opportunity scout",
    "progress_manager": "review quality readiness score progress approve track status stand",
    "counselor": "profile detail intake coordinate overview help",
}


def _stems(text: str) -> set[str]:
    return {re.sub(r"(ies|ing|ed|es|s|'s)$", "", w) or w for w in re.findall(r"[a-z']+", text.lower())}


def route_by_skills(need: str, exclude: str | None = None) -> str | None:
    """The teammate whose skill card overlaps most with `need`; None if nobody fits."""
    want = _stems(need)
    best, best_score = None, 0
    for agent_id, card in TEAM.items():
        if agent_id == exclude:
            continue
        score = len(want & _stems(card))
        if score > best_score:
            best, best_score = agent_id, score
    return best


def after_review(state: dict) -> str:
    return "resume_fix" if state.get("issues") else "prep_review"


async def choose_teammate(agent: "Agent", need: str, default: str) -> str:
    mode = os.environ.get("OFFERQUEST_ROUTING", "dynamic")
    if mode == "fixed":
        return default
    if mode == "llm" and agent.rt.llm.enabled:
        cards = "\n".join(f"- {k}: {v}" for k, v in TEAM.items() if k != agent.id)
        data, brain = await agent.think(
            "Deciding who to ask",
            f"You need: {need}\nTeammates and what they know:\n{cards}\nKeys: teammate (one id from the list).",
            dict)
        pick = data.get("teammate")
        if brain == "gemini" and pick in TEAM and pick != agent.id:
            return pick
    return route_by_skills(need, exclude=agent.id) or COORDINATOR


async def run_task(rt: "QuestRuntime", agent_id: str, text: str) -> str:
    """A task the student gave to one agent. Returns the id of the agent who ended up owning it.

    If the task belongs to someone else, the clicked agent hands it over; if it belongs to nobody,
    the Counselor takes it. Whoever owns it still consults a teammate (Rule 1).
    """
    clicked = rt.agents[agent_id]
    owner_id = agent_id
    if text.strip():
        owner_id = route_by_skills(text) or COORDINATOR
    if owner_id != agent_id:
        owner = rt.agents[owner_id]
        clicked.intent(f"That's {owner.name}'s area" if owner_id != COORDINATOR or route_by_skills(text)
                       else "Not sure who owns this. Maya will coordinate.")
        rt.bus.send(agent_id, owner_id, "HANDOFF", text.strip()[:160], [f"{rt.qf.quest.id}/task"])
    if not rt.qf.company_profile and owner_id != "company_analyst":
        # Rule 2: nothing is done without knowing the company.
        await rt.agents["company_analyst"].run()  # type: ignore[attr-defined]
    await rt.agents[owner_id].solo(text)  # type: ignore[attr-defined]
    for a in rt.agents:
        rt.emit(event="IDLE", agent=a)
    rt.save()
    return owner_id


run_solo = run_task
