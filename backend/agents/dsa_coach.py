"""Coach Vikram, DSA Coach: a day-by-day practice plan shaped by the company's focus."""
from __future__ import annotations

from datetime import date, timedelta

from ..models import DayPlan
from ..tools.problem_bank import BANK, THEORY_SUBTOPICS, problems_for
from .base_agent import Agent


class DSACoach(Agent):
    id, name, title, room = "dsa_coach", "Coach Vikram", "DSA Coach", "whiteboard"

    def _plan(self) -> dict:
        qf, cp, q = self.qf, self.qf.company_profile, self.qf.quest
        assert cp
        days = max(3, min(q.days_available or 14, 28))
        hours = q.hours_per_day or 2
        per_day = 1 if hours < 1.5 else 2 if hours < 3 else 3
        beginner = qf.confidence.get("dsa", 3) <= 2

        focus = [t for t in cp.dsa_focus if t in BANK] or ["Arrays", "Strings", "Hashing"]
        # Each focus topic's problems, easy ones first; beginners skip nothing, others start at medium sooner.
        queues = {t: sorted(problems_for(t), key=lambda p: p[1] != "E") for t in focus}
        if not beginner:
            queues = {t: ps[1:] + ps[:1] if len(ps) > 3 else ps for t, ps in queues.items()}
        theory = [f"{t}: {s}" for t in cp.theory_focus for s in THEORY_SUBTOPICS.get(t, [t])]

        plan: list[DayPlan] = []
        practice_days = days - 1 if days > 4 else days
        ti, total = 0, 0
        for d in range(1, days + 1):
            day = DayPlan(day=d, date=(date.today() + timedelta(days=d - 1)).isoformat())
            if d <= practice_days:
                topic = focus[(d - 1) % len(focus)]
                for _ in range(per_day):
                    if queues[topic]:
                        name, level = queues[topic].pop(0)
                        day.dsa_problems.append(f"{name} ({topic}, {'easy' if level == 'E' else 'medium'})")
                    else:  # topic exhausted: revise instead of padding with unrelated problems
                        day.dsa_problems.append(f"Re-solve one {topic} problem from memory, timed")
                total += len(day.dsa_problems)
                if theory:
                    day.theory_topics.append(theory[ti % len(theory)])
                    ti += 1
            else:
                day.dsa_problems.append("Timed mixed set: 2 problems in 45 minutes")
                day.other_tasks.append("Light revision only. Sleep well.")
                total += 1
            plan.append(day)

        advice = qf.project_advice
        plan[0].other_tasks.append("Read the tailored resume and be ready to explain every line")
        for i, tip in enumerate(advice.get("advice", [])[:2]):
            plan[min(i + 1, days - 1)].other_tasks.append(tip)
        plan[min(days - 1, max(1, days // 2))].other_tasks.append("Practice the 2-minute walkthrough of your top project aloud")
        return {"plan": [p.model_dump() for p in plan], "total_problems": total,
                "focus": focus, "per_day": per_day, "theory_checklist": theory}

    async def run(self) -> None:
        pattern = await self.consult("the company's interview pattern and focus",
                                     "What's the interview pattern and DSA focus for this company?", "company_analyst")
        self.intent("Planning your practice")
        self.move("room:whiteboard")
        self.activity("draw", "Drawing the plan on the whiteboard…", 0.5)
        plan = await self.use_tool("Drawing the plan", self._plan)
        plan["pattern"] = pattern
        plan["done"] = self.qf.dsa.get("done", {})   # rebuilding the plan keeps the days already ticked off
        self.qf.dsa = plan
        self.result(f"{len(plan['plan'])}-day plan ready: {plan['total_problems']} problems")
        self.rt.save()
        self.inform("progress_manager", f"Plan ready: {plan['total_problems']} problems, focus on {', '.join(plan['focus'][:3])}.")
        self.idle()

    async def answer(self, asker: str, question: str) -> str:
        d = self.qf.dsa
        return f"{d.get('total_problems', 0)} problems planned on {', '.join(d.get('focus', []))}." if d else "No plan yet."

    async def solo(self, text: str) -> None:
        await self.run()
