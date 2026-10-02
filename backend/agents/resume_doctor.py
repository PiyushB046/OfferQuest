"""Dr. Rhea, Resume Doctor: tailors the resume to the company without inventing anything."""
from __future__ import annotations

import re

from ..tools.jd_matcher import has_number, match_score, unfaithful_claims
from ..tools.lexicon import canon, dedupe, has_term, implied_skills
from ..tools.resume_writer import baseline_resume, render_text, write_docx, write_pdf
from .base_agent import Agent

WEAK_OPENERS = [
    (r"^(i )?(was )?responsible for\s+", "Owned "), (r"^(i )?worked on\s+", "Built "),
    (r"^(i )?helped (to |in |with )?", "Contributed to "), (r"^(i )?made\s+", "Developed "),
    (r"^(i )?created\s+", "Built "), (r"^(i )?did\s+", "Delivered "), (r"^this (project|app) is\s+", "Built "),
    (r"^(it is|it's)\s+", "Built "), (r"^i\s+", ""), (r"^(a|an)\s+", "Built a "),
]
ORDINAL = {1: "First", 2: "Second", 3: "Third", 4: "Final"}


def strengthen(bullet: str) -> str:
    out = bullet.strip()
    for pat, rep in WEAK_OPENERS:
        new = re.sub(pat, rep, out, count=1, flags=re.I)
        if new != out:
            out = new
            break
    return out[:1].upper() + out[1:]


class ResumeDoctor(Agent):
    id, name, title, room = "resume_doctor", "Dr. Rhea", "Resume Doctor", "clinic"

    def _facts(self) -> str:
        return self.qf.student.model_dump_json() + "\n" + self.qf.resume_text

    def _score(self, resume: dict) -> dict:
        top, full = render_text(resume)
        return match_score(top, full, self.qf.company_profile, self.qf.quest.job_description)  # type: ignore[arg-type]

    def _tailor(self) -> tuple[dict, list[str]]:
        """Reorder, surface and rephrase the student's existing facts. Nothing new is added."""
        cp, st = self.qf.company_profile, self.qf.student
        assert cp
        r = baseline_resume(st)
        changes: list[str] = []
        wanted = cp.must_have_skills + cp.nice_to_have_skills

        from_projects = [canon(t) for p in st.projects for t in p.tech_stack]
        listed = dedupe([canon(s) for s in st.skills])
        every = dedupe(listed + from_projects)
        # e.g. the JD says "LLM APIs" and the student used Gemini: say so, naming the proof.
        implied = {s: via for s, via in implied_skills(every).items()
                   if s in wanted and s.lower() not in {e.lower() for e in every}}
        every = dedupe(every + list(implied))
        for s, via in implied.items():
            changes.append(f"Added {s} to Skills: you used {via}, which is exactly that. Be ready to explain it.")
        matched = [s for s in wanted if s.lower() in {e.lower() for e in every}]
        r["skills"] = dedupe(matched + every)
        if matched and r["skills"][:len(matched)] != listed[:len(matched)]:
            changes.append(f"Moved {', '.join(matched[:5])} to the front of Skills: these are what the JD asks for, "
                           "and recruiters skim the first line.")
        surfaced = [s for s in matched if s.lower() not in {x.lower() for x in listed} and s not in implied]
        if surfaced:
            changes.append(f"Added {', '.join(surfaced)} to Skills: you used them in your projects but had not listed them.")

        order = [x["name"] for x in self.qf.project_advice.get("ranked", [])]
        before = [p["name"] for p in r["projects"]]
        r["projects"].sort(key=lambda p: order.index(p["name"]) if p["name"] in order else 99)
        if [p["name"] for p in r["projects"]] != before:
            changes.append(f"Put '{r['projects'][0]['name']}' first: it is the closest match to this role.")

        for p, src in ((p, next(s for s in st.projects if s.name == p["name"])) for p in r["projects"]):
            for b in p["bullets"]:
                new = strengthen(b["text"])
                if new != b["text"]:
                    changes.append(f"'{b['text'][:40]}…' → '{new[:40]}…': starts with a strong action verb.")
                    b["text"] = new
            body = " ".join(b["text"] for b in p["bullets"])
            unseen = [t for t in src.tech_stack if canon(t) in wanted and not has_term(body, canon(t))]
            if unseen and p["bullets"]:
                p["bullets"][0]["text"] += f" using {', '.join(unseen[:3])}"
                changes.append(f"Named {', '.join(unseen[:3])} in '{p['name']}': the JD keywords now appear in the project itself.")
            for m in src.metrics:
                if not has_term(body, m):
                    p["bullets"].append({"text": f"Result: {m.strip().rstrip('.')}", "orig": m})
                    changes.append(f"Added your result '{m}' to '{p['name']}': they value {cp.values[0].lower() if cp.values else 'numbers'}.")
        for e in r["experience"]:
            for b in e["bullets"]:
                b["text"] = strengthen(b["text"])

        year = {1: "First", 2: "Second", 3: "Third", 4: "Final"}.get(st.year, "")
        who = " ".join(x for x in [f"{year}-year" if year else "", st.branch or st.degree, "student"] if x)
        summary = f"{who} at {st.college}" if st.college else who
        if matched:
            summary += f" with hands-on work in {', '.join(matched[:4])}"
        if r["projects"]:
            top = r["projects"][0]
            summary += f". Built {top['name']}" + (f" ({', '.join(top['tech_stack'][:3])})" if top["tech_stack"] else "")
        r["summary"] = summary.strip() + "."
        changes.append("Added a 2-line summary aimed at this role, built only from facts already on your profile.")
        return r, changes

    def _enforce_faithfulness(self, r: dict) -> list[str]:
        """Revert any line that claims a skill or number the student never gave us."""
        facts, flags = self._facts(), []
        for p in r["projects"] + r["experience"]:
            for b in p["bullets"]:
                if bad := unfaithful_claims(b["text"], facts):
                    flags.append(f"Reverted a bullet in '{p.get('name') or p.get('organisation')}': "
                                 f"{', '.join(bad)} is not in your profile.")
                    b["text"] = b["orig"]
        if bad := unfaithful_claims(r["summary"], facts):
            flags.append(f"Removed the summary: {', '.join(bad)} is not in your profile.")
            r["summary"] = ""
        return flags

    async def _polish(self, r: dict) -> None:
        """Optional Gemini pass over bullet wording. Each line must still pass the faithfulness check."""
        if not self.rt.llm.enabled:
            return
        self.activity("write", "Polishing the wording…", 0.7)
        bullets = {f"{i}.{j}": b for i, p in enumerate(r["projects"]) for j, b in enumerate(p["bullets"])}
        cp = self.qf.company_profile
        prompt = (f"Role: {self.qf.quest.role}. JD keywords: {cp.jd_keywords}. They value: {cp.values}.\n"  # type: ignore[union-attr]
                  f"Bullets: { {k: b['text'] for k, b in bullets.items()} }\n"
                  "Rewrite each bullet to be sharper (action verb first, max 22 words). Do NOT add any skill, "
                  "tool, number or claim that is not already in that bullet. Keys: the same bullet ids, values: new text.")
        data, brain = await self.think("Polishing bullets", prompt, dict)
        if brain != "gemini":
            return
        for k, b in bullets.items():
            new = data.get(k)
            if isinstance(new, str) and 10 < len(new) < 240 and not unfaithful_claims(new, b["text"] + " " + b["orig"]):
                if new.strip() != b["text"]:
                    self.qf.resume.setdefault("changes", []).append(f"Reworded: '{b['text'][:40]}…' → '{new[:40]}…'")
                    b["text"] = new.strip()

    async def _export(self, r: dict) -> None:
        d = self.rt.db.quest_dir(self.qf.quest.id)

        def write() -> None:
            write_docx(r, d / "tailored_resume.docx")
            write_pdf(r, d / "tailored_resume.pdf")

        self.activity("print", "Printing the tailored resume…", 0.9)
        await self.use_tool("Printing the tailored resume", write)
        self.qf.resume.update(pdf=str(d / "tailored_resume.pdf"), docx=str(d / "tailored_resume.docx"))

    async def run(self) -> None:
        qf = self.qf
        emphasis = await self.consult("which skills and values this company's job description emphasises",
                                      "Which skills should the top of the resume emphasise for this role?", "company_analyst")
        best = await self.consult("which of the student's projects fits best", "Which project fits this role best?",
                                  "project_advisor")
        self.move("room:clinic")

        self.intent("Let me examine the current resume")
        self.activity("read", "Scoring your resume against the JD…", 0.2)
        base = baseline_resume(qf.student)

        def score_original() -> dict:
            if qf.resume_text.strip():  # the uploaded resume, exactly as the recruiter would see it
                return match_score(qf.resume_text[:600], qf.resume_text, qf.company_profile, qf.quest.job_description)  # type: ignore[arg-type]
            return self._score(base)

        before = await self.use_tool("Scoring your resume", score_original)

        self.intent("Time to fix those bullets")
        self.activity("write", "Rewriting bullets…", 0.5)
        tailored, changes = await self.use_tool("Rewriting bullets", self._tailor)
        qf.resume = {"changes": changes, "emphasis": emphasis, "best_project": best}
        await self._polish(tailored)
        self.activity("check", "Checking every line against your real profile…", 0.8)
        flags = await self.use_tool("Faithfulness check", self._enforce_faithfulness, tailored)
        after = self._score(tailored)
        qf.resume.update(tailored=tailored, score_before=before["score"], score_after=after["score"],
                         before=before, after=after, faithfulness_flags=flags, declined_metrics=[])
        await self._export(tailored)
        self.result(f"Match score {before['score']} → {after['score']}")
        self.rt.save()
        self.rt.bus.send(self.id, "progress_manager", "REVIEW_REQUEST", "Please review the tailored resume.",
                         [f"{qf.quest.id}/resume_v1"])

    async def fix(self, issues: list[dict]) -> None:
        """Mr. Desai sent it back. Numbers come from the student or not at all."""
        qf, r = self.qf, self.qf.resume["tailored"]
        self.rt.emit(event="ACTIVITY", agent=self.id, anim="oops", text="Oops. On it.")
        self.intent("Fixing what Mr. Desai flagged")
        self.move("room:clinic")
        for issue in issues:
            if issue["kind"] == "no_metric":
                proj = next(p for p in r["projects"] if p["name"] == issue["project"])
                ans = await self.ask_human(
                    f"Mr. Desai wants a number for '{proj['name']}'. Do you have a real one? "
                    "(e.g. '120 users', 'answers in 2 seconds', '85% accuracy'). Skip if you don't. I won't make one up.",
                    kind="text")
                if has_number(ans):
                    text = ans[:1].upper() + ans[1:].rstrip(".")
                    proj["bullets"].append({"text": f"Result: {text}", "orig": ans})
                    src = next(p for p in qf.student.projects if p.name == proj["name"])
                    src.metrics.append(ans)
                    qf.resume["changes"].append(f"Added your number to '{proj['name']}': '{text}'.")
                else:
                    qf.resume["declined_metrics"].append(proj["name"])
                    qf.resume["changes"].append(
                        f"'{proj['name']}' still has no number. You didn't have one, so none was added. "
                        "Measure something and add it before applying.")
            elif issue["kind"] == "summary_skill":
                skill = issue["skill"]
                r["summary"] = r["summary"].rstrip(".") + f". Also works with {skill}."
                qf.resume["changes"].append(f"Mentioned {skill} in the summary: it is a must-have you already have.")
        self.activity("write", "Applying the fixes…", 0.7)
        qf.resume["faithfulness_flags"] += await self.use_tool("Faithfulness check", self._enforce_faithfulness, r)
        qf.resume["after"] = self._score(r)
        qf.resume["score_after"] = qf.resume["after"]["score"]
        await self._export(r)
        self.result(f"Fixed. Match score now {qf.resume['score_after']}")
        self.rt.save()
        self.rt.bus.send(self.id, "progress_manager", "REVIEW_REQUEST", "Fixed. Please take another look.",
                         [f"{qf.quest.id}/resume_v{len(qf.reviews) + 1}"])

    async def answer(self, asker: str, question: str) -> str:
        ranked = self.qf.project_advice.get("ranked", [])
        if ranked:
            return f"Deep-dive on {ranked[0]['name']}. It's the first thing on the resume now."
        return "No project stands out yet. Ask about fundamentals."

    async def solo(self, text: str) -> None:
        await self.run()
        await self.peer("progress_manager").review_loop()  # type: ignore[attr-defined]
