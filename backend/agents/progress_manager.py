"""Mr. Desai, Progress Manager: reviews work, sends it back when it's weak, computes readiness."""
from __future__ import annotations

from ..tools.jd_matcher import has_number
from ..tools.lexicon import has_term, implied_skills
from .base_agent import Agent

WEIGHTS = {"resume_match": 30, "skill_coverage": 20, "dsa": 20, "mock_interview": 20, "projects": 10}


class ProgressManager(Agent):
    id, name, title, room = "progress_manager", "Mr. Desai", "Progress Manager", "cabin"

    def _resume_issues(self) -> list[dict]:
        qf, cp = self.qf, self.qf.company_profile
        assert cp
        r = qf.resume["tailored"]
        declined = set(qf.resume.get("declined_metrics", []))
        issues: list[dict] = []
        for p in r["projects"][:2]:
            if p["name"] not in declined and not any(has_number(b["text"]) for b in p["bullets"]):
                issues.append({"kind": "no_metric", "project": p["name"],
                               "text": f"'{p['name']}' has no numbers. Add a measurable result."})
        mine = qf.student.skills + [t for p in qf.student.projects for t in p.tech_stack]
        have = " ".join(mine + list(implied_skills(mine)) + [p.description for p in qf.student.projects])
        top = " ".join([r["summary"]] + r["skills"][:10])
        for s in cp.must_have_skills[:5]:
            if has_term(have, s) and not has_term(top, s):
                issues.append({"kind": "summary_skill", "skill": s,
                               "text": f"{s} is a must-have and the student has it, but it's missing from the top."})
        return issues[:2]

    async def review_resume(self) -> list[dict]:
        """Returns the issues that were sent back; an empty list means approved."""
        qf, item = self.qf, "resume"
        self.intent("Let me check this")
        self.move("room:cabin")
        self.activity("inspect", "Reviewing the tailored resume…", 0.5)
        issues = await self.use_tool("Reviewing the resume", self._resume_issues)
        can = self.rt.guard.can_send_back(item)
        verdict = "send_back" if issues and can else "approved"
        qf.reviews.append({"item": item, "round": len(qf.reviews) + 1, "verdict": verdict,
                           "issues": [i["text"] for i in issues],
                           "note": "" if can or not issues else "Send-back limit reached: approved with open notes."})
        if verdict == "send_back":
            self.rt.guard.record_send_back(item)
            self.rt.stats["send_backs"] += 1
            self.intent("This needs fixing")
            self.rt.bus.send(self.id, "resume_doctor", "SEND_BACK", " ".join(i["text"] for i in issues),
                             [f"{qf.quest.id}/resume"])
            self.rt.save()
            return issues
        self.result("Resume approved ✅" if not issues else "Approved with notes ✅")
        self.rt.save()
        return []

    async def review_loop(self) -> None:
        while issues := await self.review_resume():
            await self.peer("resume_doctor").fix(issues)  # type: ignore[attr-defined]

    async def review_prep(self) -> None:
        qf, cp = self.qf, self.qf.company_profile
        assert cp
        self.intent("Now the prep plan")
        self.activity("inspect", "Checking the DSA plan against the company's focus…", 0.5)

        def check() -> list[str]:
            plan_text = " ".join(p for d in qf.dsa.get("plan", []) for p in d["dsa_problems"])
            return [t for t in cp.dsa_focus[:4] if t not in plan_text]

        missing = await self.use_tool("Checking the DSA plan", check)
        qf.reviews.append({"item": "dsa_plan", "round": 1, "verdict": "approved",
                           "issues": [f"{t} is in the company's focus but not in the plan yet." for t in missing]})
        self.result("Prep plan approved ✅" if not missing else f"Plan approved. Note: add {', '.join(missing)} if time allows.")
        self.rt.save()

    def _readiness(self) -> dict:
        qf, cp = self.qf, self.qf.company_profile
        assert cp
        mine = qf.student.skills + [t for p in qf.student.projects for t in p.tech_stack]
        have = " ".join(mine + list(implied_skills(mine)) + [p.description for p in qf.student.projects])
        must = cp.must_have_skills or ["_"]
        coverage = round(100 * sum(1 for s in must if has_term(have, s)) / len(must))
        days = qf.quest.days_available or 14
        conf = qf.confidence.get("dsa", 3)
        # Confidence today plus whether there is enough time for the plan to move it.
        plan_days = len(qf.dsa.get("plan", [])) or 1
        practised = len(qf.dsa.get("done", {})) / plan_days          # days of the plan actually ticked off
        dsa = min(100, round(conf * 12 + min(days, 21) * 1.5 + 35 * practised))
        mock = 0 if qf.mock.get("skipped", True) else round(qf.mock.get("overall", 0) * 10)
        ranked = qf.project_advice.get("ranked", [])
        projects = min(100, 25 * sum(1 for r in ranked[:2] if r["shows"])
                       + 15 * sum(1 for r in ranked[:2] if r["has_link"])
                       + 10 * sum(1 for r in ranked[:2] if r["has_metrics"]))
        b = {"resume_match": qf.resume.get("score_after", 0), "skill_coverage": coverage, "dsa": dsa,
             "mock_interview": mock, "projects": projects}
        score = round(sum(b[k] * w for k, w in WEIGHTS.items()) / 100)
        notes = []
        if qf.mock.get("skipped", True):
            notes.append("Mock interview not done yet: that part counts as 0 until you take it.")
        if not qf.dsa.get("done"):
            notes.append("Tick off practice days as you finish them: the DSA part of this score rises with real practice.")
        if gaps := qf.project_advice.get("gaps"):
            notes.append(f"Skill gaps vs. the JD: {', '.join(gaps)}.")
        notes.append("This score is guidance to focus your prep, not a prediction of selection.")
        return {"score": score, "breakdown": b, "weights": WEIGHTS, "notes": notes}

    def _overlaps(self) -> list[str]:
        """Prep that pays off for more than one of the student's quests (spec §5.4)."""
        qf, cp = self.qf, self.qf.company_profile
        assert cp
        out = []
        for other in self.rt.db.quest_files(qf.quest.student_id):
            ocp = other.company_profile
            if other.quest.id == qf.quest.id or not ocp or other.quest.company == qf.quest.company:
                continue
            shared = [t for t in cp.dsa_focus + cp.theory_focus if t in ocp.dsa_focus + ocp.theory_focus]
            skills = [s for s in cp.must_have_skills if s in ocp.must_have_skills]
            if shared or skills:
                what = ", ".join((shared + skills)[:4])
                out.append(f"{what} {'help' if len(shared + skills) > 1 else 'helps'} for both "
                           f"{qf.quest.company} and {other.quest.company}!")
        return out

    async def readiness(self) -> None:
        self.intent("Time to add it all up")
        self.activity("inspect", "Computing the Readiness Score…", 0.7)
        r = await self.use_tool("Computing the Readiness Score", self._readiness)
        self.activity("inspect", "Looking at your other quests for shared prep…", 0.9)
        r["overlaps"] = await self.use_tool("Looking for shared prep", self._overlaps)
        if r["overlaps"]:
            self.rt.emit(event="SPEAK", agent=self.id, to="student", status="inform", text=r["overlaps"][0])
        self.qf.readiness = r
        if self.qf.kit:
            self.qf.kit.readiness_score = r["score"]
            self.qf.kit.readiness_breakdown = r["breakdown"]
        self.result(f"Readiness: {r['score']}/100")
        self.rt.save()

    async def answer(self, asker: str, question: str) -> str:
        qf = self.qf
        self.activity("inspect", "Checking the Quest Board…")
        await self.use_tool("Checking the Quest Board", lambda: None)
        if qf.readiness:
            return f"Stage: {qf.quest.stage}. Readiness {qf.readiness['score']}/100."
        return f"Stage: {qf.quest.stage}. {len(qf.reviews)} reviews done so far."

    async def solo(self, text: str) -> None:
        await self.consult("how the coding practice plan is going", "How is the practice plan looking?", "dsa_coach")
        await self.readiness()
        self.inform("counselor", f"Readiness is {self.qf.readiness['score']}/100.")
