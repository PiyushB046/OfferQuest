"""Runs every quest in test_quests.json on the offline brain and reports the metrics from spec §18
that can be measured automatically.  Usage:  python eval/run_eval.py

Also runs the single-agent baseline (eval/baseline.py) on every quest for the team-vs-solo
comparison. Not measured here (they need people): human ratings of plan relevance and mock
interview quality, and user testing.
"""
from __future__ import annotations

import asyncio
import json
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.db import DB  # noqa: E402
from backend.demo import demo_human, demo_quest_file  # noqa: E402
from backend.llm.gemini_client import LLM  # noqa: E402
from backend.messaging.event_emitter import EventHub  # noqa: E402
from backend.models import Quest, QuestFile, StudentProfile  # noqa: E402
from backend.orchestrator.quest_graph import run_quest  # noqa: E402
from backend.orchestrator.runtime import QuestRuntime  # noqa: E402
from backend.tools.jd_matcher import unfaithful_claims  # noqa: E402
from backend.tools.lexicon import has_term  # noqa: E402
from baseline import single_agent  # noqa: E402


async def human(prompt: dict) -> str:
    """A student who has no extra metrics to offer and skips the mock (its quality needs a human rater)."""
    return "Skip for now" if "Ready for a short mock" in prompt["question"] else ""


def build(case: dict, i: int) -> QuestFile:
    if case.get("use_demo"):
        return demo_quest_file(f"quest_eval_{i}")
    student = StudentProfile(**case["student"])
    quest = Quest(id=f"quest_eval_{i}", student_id=student.id, company=case["company"], role=case["role"],
                  job_description=case["job_description"], days_available=case["days_available"],
                  hours_per_day=case["hours_per_day"])
    return QuestFile(quest=quest, student=student, confidence=case.get("confidence", {}))


async def run_case(case: dict, i: int, db: DB) -> dict:
    rt = QuestRuntime(build(case, i), db, EventHub(db), LLM(db), demo_human if case.get("use_demo") else human)
    t0 = time.perf_counter()
    await run_quest(rt)
    qf, cp = rt.qf, rt.qf.company_profile
    lines = [b["text"] for p in qf.resume["tailored"]["projects"] for b in p["bullets"]] + [qf.resume["tailored"]["summary"]]
    facts = qf.student.model_dump_json() + qf.resume_text
    faithful = sum(1 for line in lines if not unfaithful_claims(line, facts))
    jd_backed = [s for s in cp.must_have_skills + cp.nice_to_have_skills if has_term(qf.quest.job_description, s)]
    claimed = cp.must_have_skills + cp.nice_to_have_skills
    solo = single_agent(build(case, i), cp)
    plan_text = " ".join(p for d in qf.dsa["plan"] for p in d["dsa_problems"])
    return {
        "solo_match_after": solo["match_after"], "solo_unreviewed_weak_projects": solo["unreviewed_weak_projects"],
        "solo_plan_on_focus_pct": solo["plan_on_focus_pct"],
        "team_plan_on_focus_pct": round(100 * sum(1 for t in cp.dsa_focus[:4] if t in plan_text) / max(1, len(cp.dsa_focus[:4]))),
        "team_weak_projects_caught": sum(1 for r in qf.reviews if r["verdict"] == "send_back" for _ in r["issues"]),
        "quest": case["name"], "status": qf.status,
        "match_before": qf.resume["score_before"], "match_after": qf.resume["score_after"],
        "faithfulness_pct": round(100 * faithful / len(lines)),
        "profile_accuracy_pct": round(100 * len(jd_backed) / len(claimed)) if claimed else 100,
        "visibility_pct": round(100 * rt.stats["announced"] / rt.stats["actions"]),
        "send_backs": rt.stats["send_backs"],
        "open_review_notes": sum(len(r["issues"]) for r in qf.reviews if r["verdict"] == "approved"),
        "readiness": qf.readiness.get("score"),
        "events": rt.stats["events"], "steps": qf.stats["steps"], "gemini_calls": rt.stats["llm_calls"],
        "gemini_failures": rt.stats["llm_failures"], "seconds": round(time.perf_counter() - t0, 2),
    }


async def main() -> None:
    cases = json.loads((Path(__file__).parent / "test_quests.json").read_text())
    db = DB(tempfile.mkdtemp(prefix="offerquest_eval_"))
    rows = [await run_case(c, i, db) for i, c in enumerate(cases)]
    cols = {"match_before": "before", "solo_match_after": "solo", "match_after": "team", "faithfulness_pct": "faith%",
            "visibility_pct": "visible%", "send_backs": "sendbk", "solo_plan_on_focus_pct": "soloplan%",
            "team_plan_on_focus_pct": "teamplan%", "readiness": "ready", "events": "events"}
    print(f"{'quest':<52}" + "".join(f"{h:>10}" for h in cols.values()))
    for r in rows:
        print(f"{r['quest'][:51]:<52}" + "".join(f"{r[c]!s:>10}" for c in cols))
    mean = lambda k: round(sum(r[k] for r in rows) / len(rows), 1)  # noqa: E731
    print(f"\nMean match score   before {mean('match_before')} · single agent {mean('solo_match_after')} · team {mean('match_after')}")
    print(f"Plan on company focus   single agent {mean('solo_plan_on_focus_pct')}% · team {mean('team_plan_on_focus_pct')}%")
    print(f"Weak projects   left unflagged by single agent: {sum(r['solo_unreviewed_weak_projects'] for r in rows)} · "
          f"caught by the Progress Manager: {sum(r['team_weak_projects_caught'] for r in rows)}")
    print(f"Faithfulness {mean('faithfulness_pct')}% · visibility {mean('visibility_pct')}% · "
          f"Gemini calls {sum(r['gemini_calls'] for r in rows)} · mean time {mean('seconds')}s")
    out = Path(__file__).parent / "results.json"
    out.write_text(json.dumps(rows, indent=2))
    print(f"\nBrain: {'gemini' if LLM(db).enabled else 'offline'} · {len(rows)} quests · written to {out}")
    assert all(r["status"] == "done" for r in rows), "a quest did not finish"
    assert all(r["faithfulness_pct"] == 100 for r in rows), "faithfulness must be 100%"


if __name__ == "__main__":
    asyncio.run(main())
