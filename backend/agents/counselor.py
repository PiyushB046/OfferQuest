"""Maya, Career Counselor: runs intake, opens the Quest File, coordinates the team."""
from __future__ import annotations

import re
from datetime import date

from ..models import PrepKit
from ..tools.lexicon import find_skills
from .base_agent import Agent

ROUND_HINTS = r"interview (process|rounds?)|online assessment|coding (test|round)|technical round|hr round|aptitude"


class Counselor(Agent):
    id, name, title, room = "counselor", "Maya", "Career Counselor", "reception"

    async def intake(self) -> None:
        qf, q = self.qf, self.qf.quest
        self.intent("New quest! Let's get your details.")
        self.activity("clipboard", "Opening the Quest File…", 0.2)

        # Never guess the important things: pause and ask (spec §5.1).
        tries = 0
        while len(q.job_description.strip()) < 40 and tries < 2:
            tries += 1
            q.job_description = await self.ask_human(
                f"I need the job description for {q.role} at {q.company}. Please paste it here.",
                kind="longtext", optional=False)
        if len(q.job_description.strip()) < 40:
            qf.intake_notes["jd"] = "No job description given: the company profile is based on the role only."

        if q.days_available is None and q.deadline:
            try:
                q.days_available = max(1, (date.fromisoformat(q.deadline) - date.today()).days)
            except ValueError:
                pass
        if q.days_available is None:
            ans = await self.ask_human("How many days do you have until the interview?", kind="number")
            q.days_available = int(m.group()) if (m := re.search(r"\d+", ans)) else 14
        if q.hours_per_day is None:
            q.hours_per_day = 2.0

        if not re.search(ROUND_HINTS, q.job_description, re.I) and "rounds_asked" not in qf.intake_notes:
            qf.intake_notes["rounds_asked"] = "yes"
            ans = await self.ask_human(
                "The JD doesn't mention interview rounds. Do you know them? (e.g. 'OA, 2 technical, HR')",
                kind="text")
            if ans and ans.lower() not in ("no", "nope", "not sure", "idk", "don't know"):
                qf.intake_notes["interview_rounds"] = ans

        if qf.resume_text:
            self.activity("read", "Reading your resume…", 0.6)
            found = await self.use_tool("Reading your resume", find_skills, qf.resume_text)
            self.result(f"Found {len(qf.student.projects)} projects, {len(found)} skills")
        else:
            self.activity("clipboard", "Building your profile from your answers…", 0.6)
            await self.use_tool("Checking your profile", lambda: None)

        self.result("Profile ready!")
        self.rt.save()
        self.handoff("company_analyst",
                     f"Quest {q.id.split('_')[-1]} intake done: {q.role} at {q.company}. Build the company profile.",
                     f"{q.id}/quest_file")
        self.idle()

    async def huddle(self) -> None:
        """Team huddle in the Meeting Room: merge everyone's work into the Prep Kit."""
        qf, rt = self.qf, self.rt
        self.intent("Team meeting! Everyone to the Meeting Room.")
        crew = ["counselor", "company_analyst", "resume_doctor", "project_advisor", "dsa_coach",
                "interview_coach", "opportunity_scout", "progress_manager"]
        for a in crew:
            rt.emit(event="MOVE", agent=a, to="room:meeting")
        lines = {
            "resume_doctor": f"Resume: match {qf.resume.get('score_before', 0)} → {qf.resume.get('score_after', 0)}.",
            "dsa_coach": f"DSA plan: {qf.dsa.get('total_problems', 0)} problems over {len(qf.dsa.get('plan', []))} days.",
            "interview_coach": ("Mock interview skipped." if qf.mock.get("skipped")
                                else f"Mock interview: {qf.mock.get('overall', 0)}/10."),
            "opportunity_scout": f"{len(qf.opportunities.get('leads', []))} search leads ready.",
        }
        for a, text in lines.items():
            rt.emit(event="SPEAK", agent=a, to="counselor", text=text, status="inform")
        self.activity("clipboard", "Assembling the Prep Kit…", 0.8)

        def assemble() -> PrepKit:
            adv = qf.project_advice
            return PrepKit(
                quest_id=qf.quest.id,
                tailored_resume_path=qf.resume.get("pdf", ""),
                resume_changes=qf.resume.get("changes", []),
                match_score_before=qf.resume.get("score_before", 0),
                match_score_after=qf.resume.get("score_after", 0),
                project_advice=adv.get("advice", []) + adv.get("build_next", []),
                dsa_plan=qf.dsa.get("plan", []),
                theory_checklist=qf.dsa.get("theory_checklist", []),
                mock_interview_report=qf.mock,
            )

        qf.kit = await self.use_tool("Assembling the Prep Kit", assemble)
        self.result("Prep Kit assembled")
        rt.save()

    async def answer(self, asker: str, question: str) -> str:
        q = self.qf.quest
        return f"{self.qf.student.name} is preparing for {q.role} at {q.company}, {q.days_available} days left."

    async def solo(self, text: str) -> None:
        self.intent("Let me check where your quest stands.")
        status = await self.consult("quest status, progress and readiness", f"Where are we on {self.qf.quest.company}?",
                                    "progress_manager")
        self.result(status, status="info")
