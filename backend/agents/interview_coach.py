"""Ms. Iyer, Interview Coach: a short mock interview in the company's style, with honest scoring."""
from __future__ import annotations

import re
from datetime import date

from ..tools.lexicon import has_term
from .base_agent import Agent

STRUCTURE = r"\b(because|so that|therefore|trade.?off|result|learned|first|then|finally|instead|however)\b"


class InterviewCoach(Agent):
    id, name, title, room = "interview_coach", "Ms. Iyer", "Interview Coach", "interview"
    _history: list = []

    def _questions(self) -> list[dict]:
        cp, q, st = self.qf.company_profile, self.qf.quest, self.qf.student
        assert cp
        ranked = self.qf.project_advice.get("ranked", [])
        proj = ranked[0]["name"] if ranked else (st.projects[0].name if st.projects else None)
        shows = ranked[0]["shows"] if ranked else []
        # Probe the distinctive skill, not the one every candidate lists.
        skill = next((s for s in shows if s not in ("Python", "Java", "Git", "SQL")), None) \
            or (shows[0] if shows else cp.must_have_skills[0])
        topic = cp.dsa_focus[0] if cp.dsa_focus else "Arrays"
        theory = cp.theory_focus[0] if cp.theory_focus else "OOP"
        qs = []
        if proj:
            qs.append({"type": "project", "expects": [proj, skill],
                       "q": f"Walk me through {proj}. What problem did it solve, and what was the hardest part?",
                       "model": "Problem → your approach → one hard decision and why → a measured result → what you'd change."})
            qs.append({"type": "technical", "expects": [skill],
                       "q": f"You used {skill} in {proj}. Why that choice, and what are its limits?",
                       "model": f"Say what {skill} does, why it fit, one alternative you considered, and one limitation you hit."})
        else:
            qs.append({"type": "technical", "expects": [skill],
                       "q": f"Explain {skill} to me as if I were new to it, then give one real use.",
                       "model": "Plain definition → small example → where it breaks down."})
        qs.append({"type": "dsa", "expects": ["complexity", "O("],
                   "q": f"A question on {topic}: how would you approach finding duplicates in a large list? Talk through complexity.",
                   "model": "Clarify input → brute force and its cost → better approach (hash set) → time and space complexity → edge cases."})
        qs.append({"type": "theory", "expects": [theory.split()[0]],
                   "q": f"From {theory}: pick one core concept and explain it with an example.",
                   "model": "Definition in one line → concrete example → why it matters in real systems."})
        qs.append({"type": "hr", "expects": [q.company],
                   "q": f"Why {q.company}, and why this {q.role} role?",
                   "model": f"Something specific about {q.company}'s work → how your projects connect to it → what you want to learn."})
        return qs

    async def _tailor_questions(self, base: list[dict]) -> list[dict]:
        """With Gemini on, questions are written for this JD and this student's projects.

        They are practice questions typical for the role. They are never presented as the
        company's real questions.
        """
        if not self.rt.llm.enabled:
            return base
        cp, q, st = self.qf.company_profile, self.qf.quest, self.qf.student
        prompt = (f"Role: {q.role} at {q.company}. Must-have skills: {cp.must_have_skills}. "  # type: ignore[union-attr]
                  f"Rounds: {cp.interview_rounds}. DSA focus: {cp.dsa_focus}. Theory: {cp.theory_focus}.\n"  # type: ignore[union-attr]
                  f"Student's projects: {[{'name': p.name, 'tech': p.tech_stack, 'what': p.description[:200]} for p in st.projects]}\n"
                  "Write 5 mock interview questions typical for this role: types in this order: project, technical, dsa, "
                  "theory, hr. Ask about the student's real projects by name. Do not claim these are the company's actual "
                  "questions. Keys: questions (array of {type, q, expects: 2-3 keywords a good answer mentions, "
                  "model: one line on what a strong answer covers}).")
        self.activity("notes", "Writing questions for this company…", 0.4)
        data, brain = await self.think("Writing questions", prompt, dict)
        got = [x for x in data.get("questions", []) if isinstance(x, dict) and isinstance(x.get("q"), str)
               and 15 < len(x["q"]) < 400] if brain == "gemini" and isinstance(data.get("questions"), list) else []
        if len(got) < 4:
            return base
        return [{"type": str(x.get("type") or base[min(i, len(base) - 1)]["type"]), "q": x["q"].strip(),
                 "expects": [str(e) for e in x.get("expects", []) if isinstance(e, (str, int))][:3] or ["because"],
                 "model": str(x.get("model") or "Clear structure, specifics and a result.")[:300]} for i, x in enumerate(got[:5])]

    def _follow_up(self, weakest: dict) -> None:
        """The weakest answer becomes a task on the next unfinished day of the plan."""
        plan, done = self.qf.dsa.get("plan", []), self.qf.dsa.get("done", {})
        day = next((d for d in plan if str(d["day"]) not in done), None)
        task = f"Redo this mock question aloud until it is clear and specific: \"{weakest['question'][:110]}\""
        if day and task not in day["other_tasks"]:
            day["other_tasks"].append(task)

    @staticmethod
    def _score_offline(question: dict, answer: str) -> dict:
        """A rubric, not a judgement of correctness: substance, specifics, structure."""
        words = len(answer.split())
        if words < 3:
            return {"score": 0, "feedback": "No answer given. Even a rough attempt scores better than silence."}
        score, tips = 2, []
        if words >= 25:
            score += 2
        else:
            tips.append("Too short. Aim for 4–6 sentences.")
        if words >= 60:
            score += 1
        if any(has_term(answer, e) or e.lower() in answer.lower() for e in question["expects"]):
            score += 2
        else:
            tips.append(f"Name the specifics ({', '.join(question['expects'][:2])}).")
        if re.search(r"\d", answer):
            score += 1
        else:
            tips.append("Add a number or concrete result.")
        if re.search(STRUCTURE, answer, re.I):
            score += 2
        else:
            tips.append("Explain your reasoning: why, trade-offs, what you learned.")
        return {"score": min(score, 10), "feedback": " ".join(tips) or "Clear, specific and well structured."}

    async def run(self) -> None:
        qf, q = self.qf, self.qf.quest
        done = list(qf.mock.get("partial", []))   # answers kept from before a restart
        self._history = list(qf.mock.get("history", []))
        style = await self.consult("the company's interview rounds and what to probe",
                                   "What rounds does this company run, and what should I probe?", "company_analyst")
        focus = await self.consult("what is on top of the tailored resume", "Which project should I deep-dive on?",
                                   "resume_doctor")
        self.intent("Interview room, please!")
        self.move("agent:student")
        ready = "Let's go" if done else await self.ask_human(
            f"Ready for a short mock interview in {q.company}'s style? 5 questions, typed or spoken answers.",
            kind="choice", options=["Let's go", "Skip for now"])
        if ready.lower().startswith("skip") or not ready:
            qf.mock = {"skipped": True, "style": style, "history": self._history}
            self.result("Mock interview skipped. You can run it later.", status="info")
            self.rt.bus.send(self.id, "counselor", "DONE", "Mock interview skipped by the student.")
            self.rt.save()
            return

        self.move("room:interview")
        self.rt.emit(event="MOVE", agent="student", to="room:interview")
        self.activity("notes", "Preparing questions…", 0.2)
        questions = await self.use_tool("Preparing questions", self._questions)
        if not done:
            questions = await self._tailor_questions(questions)
        rounds = done
        for i, item in enumerate(questions):
            if i < len(done):
                continue
            answer = await self.ask_human(f"Q{i + 1}/{len(questions)}: {item['q']}", kind="longtext")
            self.activity("notes", f"Scoring answer {i + 1}…", (i + 1) / len(questions))
            fb = self._score_offline(item, answer)
            prompt = (f"Role: {q.role} at {q.company}.\nQuestion: {item['q']}\nStudent's answer: {answer[:3000]}\n"
                      "Score it honestly. Keys: score (integer 0-10), feedback (max 2 sentences, specific and kind).")
            data, brain = await self.think("Scoring the answer", prompt, lambda fb=fb: fb)
            score = data.get("score")
            if brain == "gemini" and isinstance(score, (int, float)) and 0 <= score <= 10 and answer.split():
                fb = {"score": int(score), "feedback": str(data.get("feedback") or fb["feedback"])[:300]}
            rounds.append({"question": item["q"], "type": item["type"], "answer": answer,
                           "score": fb["score"], "feedback": fb["feedback"], "model_answer": item["model"]})
            self.rt.emit(event="SPEAK", agent=self.id, to="student", text=f"{fb['score']}/10. {fb['feedback']}",
                         status="feedback")
            qf.mock = {"partial": rounds, "history": self._history}
            self.rt.save()

        overall = round(sum(r["score"] for r in rounds) / len(rounds), 1)
        best, worst = max(rounds, key=lambda r: r["score"]), min(rounds, key=lambda r: r["score"])
        history = qf.mock.get("history", []) if isinstance(qf.mock.get("history"), list) else self._history
        self._follow_up(worst)
        qf.mock = {"skipped": False, "style": style, "focus": focus, "rounds": rounds, "overall": overall,
                   "history": history + [{"date": date.today().isoformat(), "overall": overall}],
                   "strongest": best["type"], "weakest": worst["type"],
                   "scored_by": "gemini" if self.rt.llm.enabled else "offline rubric (substance, specifics, structure)"}
        self.result(f"Score: {overall}/10")
        self.rt.emit(event="MOVE", agent="student", to="home")
        self.rt.save()
        self.rt.bus.send(self.id, "counselor", "DONE", f"Mock interview complete: {overall}/10.")
        self.inform("progress_manager", f"Mock score {overall}/10. Weakest area: {worst['type']}.")
        self.idle()

    async def solo(self, text: str) -> None:
        # A retake: keep the score history, drop the old answers.
        self.qf.mock = {"history": self.qf.mock.get("history", [])}
        await self.run()
        if not self.qf.mock.get("skipped"):
            best = max(h["overall"] for h in self.qf.mock["history"])
            self.inform("counselor", f"Mock retake done: {self.qf.mock['overall']}/10 (best so far {best}/10).")
