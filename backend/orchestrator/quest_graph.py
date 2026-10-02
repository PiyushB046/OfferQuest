"""The Company Quest as a fixed LangGraph workflow (spec §6.4, phase 1).

intake → company_intel → [resume ∥ dsa ∥ scout] → review ⇄ resume_fix → prep_review → mock
       → huddle → readiness → done
"""
from __future__ import annotations

import operator
from typing import Annotated, Any, TypedDict

from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.graph import END, START, StateGraph

from .guardrails import QuestLimitError
from .router import after_review
from .runtime import QuestRuntime


class QuestState(TypedDict, total=False):
    trail: Annotated[list[str], operator.add]   # nodes visited; safe for parallel branches
    issues: list[dict[str, Any]]


def build_graph(rt: QuestRuntime, checkpointer=None):
    a = rt.agents

    async def intake(_: QuestState) -> QuestState:
        rt.set_stage("intake")
        await a["counselor"].intake()
        return {"trail": ["intake"]}

    async def company_intel(_: QuestState) -> QuestState:
        rt.set_stage("company_intel")
        await a["company_analyst"].run()
        a["company_analyst"].brief_team()
        rt.set_stage("resume")
        return {"trail": ["company_intel"]}

    async def resume(_: QuestState) -> QuestState:
        await a["resume_doctor"].run()
        return {"trail": ["resume"]}

    async def dsa(_: QuestState) -> QuestState:
        await a["dsa_coach"].run()
        return {"trail": ["dsa"]}

    async def scout(_: QuestState) -> QuestState:
        await a["opportunity_scout"].run()
        return {"trail": ["scout"]}

    async def review(_: QuestState) -> QuestState:
        return {"trail": ["review"], "issues": await a["progress_manager"].review_resume()}

    async def resume_fix(state: QuestState) -> QuestState:
        await a["resume_doctor"].fix(state["issues"])
        return {"trail": ["resume_fix"]}

    async def prep_review(_: QuestState) -> QuestState:
        rt.set_stage("prep")
        await a["progress_manager"].review_prep()
        return {"trail": ["prep_review"]}

    async def mock(_: QuestState) -> QuestState:
        rt.set_stage("mock")
        await a["interview_coach"].run()
        return {"trail": ["mock"]}

    async def huddle(_: QuestState) -> QuestState:
        rt.set_stage("review")
        await a["counselor"].huddle()
        await a["progress_manager"].readiness()
        return {"trail": ["huddle"]}

    g = StateGraph(QuestState)
    for name, fn in [("intake", intake), ("company_intel", company_intel), ("resume", resume), ("dsa", dsa),
                     ("scout", scout), ("review", review), ("resume_fix", resume_fix),
                     ("prep_review", prep_review), ("mock", mock), ("huddle", huddle)]:
        g.add_node(name, fn)
    g.add_edge(START, "intake")
    g.add_edge("intake", "company_intel")
    for branch in ("resume", "dsa", "scout"):
        g.add_edge("company_intel", branch)
    g.add_edge(["resume", "dsa", "scout"], "review")
    g.add_conditional_edges("review", after_review, ["resume_fix", "prep_review"])
    g.add_edge("resume_fix", "review")
    g.add_edge("prep_review", "mock")
    g.add_edge("mock", "huddle")
    g.add_edge("huddle", END)
    return g.compile(checkpointer=checkpointer)


async def run_quest(rt: QuestRuntime) -> None:
    """Runs the quest, or picks it up from its last finished step if the server was restarted.

    LangGraph checkpoints the workflow after every step, so a restart repeats at most the step that
    was in flight (its events play again; the Quest File keeps what was already written).
    """
    qf = rt.qf
    cfg = {"configurable": {"thread_id": qf.quest.id}, "recursion_limit": 40}
    try:
        async with AsyncSqliteSaver.from_conn_string(str(rt.db.data_dir / "checkpoints.db")) as saver:
            graph = build_graph(rt, saver)
            resuming = bool((await graph.aget_state(cfg)).next)
            if resuming:
                rt.emit(event="SPEAK", agent="counselor", to="student", status="inform",
                        text="We're back! Picking up your quest where we left off.")
            await graph.ainvoke(None if resuming else {"trail": []}, config=cfg)
        qf.status = "done"
        rt.set_stage("done")
        for agent in rt.agents:
            rt.emit(event="IDLE", agent=agent)
        rt.emit(event="QUEST_DONE", agent="progress_manager", status="success",
                text=f"Readiness: {qf.readiness.get('score', 0)}/100")
    except QuestLimitError as e:
        qf.status, qf.error = "failed", str(e)
        rt.emit(event="ERROR", agent="counselor", text=str(e))
        rt.emit(event="QUEST_DONE", agent="counselor", status="failed", text=str(e))
    except Exception as e:  # noqa: BLE001 - a quest must never die silently (Rule 3)
        qf.status, qf.error = "failed", f"{type(e).__name__}: {e}"
        rt.emit(event="ERROR", agent="counselor", text="Something broke on our side. The quest was stopped.")
        rt.emit(event="QUEST_DONE", agent="counselor", status="failed", text=qf.error)
        raise
    finally:
        rt.save()
