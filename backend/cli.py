"""Agents in the terminal, before they get bodies:  python -m backend.cli [--interactive]"""
from __future__ import annotations

import asyncio
import sys
import tempfile

from dotenv import load_dotenv

from .db import DB
from .demo import demo_human, demo_quest_file
from .llm.gemini_client import LLM
from .messaging.event_emitter import EventHub
from .orchestrator.quest_graph import run_quest
from .orchestrator.runtime import QuestRuntime

ICON = {"INTENT": "💭", "MOVE": "🚶", "SPEAK": "💬", "ACTIVITY": "⚙️ ", "RESULT": "✅", "HANDOFF": "📁",
        "ASK_HUMAN": "❓", "IDLE": "🪑", "ERROR": "⚠️ ", "STAGE": "📋", "QUEST_DONE": "🎉"}


def show(ev: dict) -> None:
    if ev["event"] == "IDLE":
        return
    who = ev["agent"] + (f" → {ev['to']}" if ev.get("to") else "")
    text = ev.get("text") or ev.get("status") or ""
    if ev.get("progress") is not None:
        text += f" [{int(ev['progress'] * 100)}%]"
    print(f"{ICON[ev['event']]} {ev['event']:<10} {who:<38} {text}")


async def interactive_human(prompt: dict) -> str:
    return await asyncio.to_thread(input, f"\n   ❓ {prompt['question']}\n   > ")


async def main() -> None:
    load_dotenv()
    db = DB(tempfile.mkdtemp(prefix="offerquest_"))
    hub = EventHub(db)
    queue = hub.subscribe()
    human = interactive_human if "--interactive" in sys.argv else demo_human
    rt = QuestRuntime(demo_quest_file(), db, hub, LLM(db), human)
    print(f"Brain: {'Gemini ' + rt.llm.model if rt.llm.enabled else 'offline (set GEMINI_API_KEY to use Gemini)'}\n")

    async def printer() -> None:
        while True:
            show(await queue.get())

    task = asyncio.create_task(printer())
    await run_quest(rt)
    await asyncio.sleep(0.05)
    task.cancel()

    qf = rt.qf
    print("\n" + "=" * 70 + f"\nPREP KIT — {qf.quest.role} at {qf.quest.company}\n" + "=" * 70)
    print(f"Match score: {qf.resume['score_before']} → {qf.resume['score_after']}")
    print("Changes:")
    for c in qf.resume["changes"]:
        print(f"  - {c}")
    print(f"Faithfulness flags: {qf.resume['faithfulness_flags'] or 'none'}")
    print(f"DSA plan: {len(qf.dsa['plan'])} days, {qf.dsa['total_problems']} problems. Day 1: {qf.dsa['plan'][0]['dsa_problems']}")
    print(f"Mock interview: {qf.mock.get('overall', 'skipped')}/10")
    print(f"Readiness: {qf.readiness['score']}/100  {qf.readiness['breakdown']}")
    print(f"Resume files: {qf.resume['pdf']}")
    s = qf.stats
    print(f"Stats: {s['events']} events, {s['actions']} actions ({s['announced']} announced first), "
          f"{s['send_backs']} send-backs, {s['llm_calls']} Gemini calls, {s['steps']} steps")


if __name__ == "__main__":
    asyncio.run(main())
