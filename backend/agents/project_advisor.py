"""Arjun, Project Advisor: matches the student's projects to what the company needs."""
from __future__ import annotations

from ..tools.github_reader import read_repos
from ..tools.lexicon import FUNDAMENTALS, canon, has_term, implied_skills
from .base_agent import Agent, str_list


class ProjectAdvisor(Agent):
    id, name, title, room = "project_advisor", "Arjun", "Project Advisor", "workshop"

    def _rank(self) -> list[dict]:
        cp, st = self.qf.company_profile, self.qf.student
        assert cp
        ranked = []
        for p in st.projects:
            text = f"{p.name} {p.description} {' '.join(p.tech_stack)}"
            must = [s for s in cp.must_have_skills if has_term(text, s)]
            nice = [s for s in cp.nice_to_have_skills + cp.jd_keywords if has_term(text, s)]
            ranked.append({"name": p.name, "fit": 3 * len(must) + len(nice) + (1 if p.metrics else 0),
                           "shows": must + nice, "has_link": bool(p.link), "has_metrics": bool(p.metrics)})
        return sorted(ranked, key=lambda r: -r["fit"])

    async def review(self) -> None:
        cp, st = self.qf.company_profile, self.qf.student
        assert cp
        self.intent("Checking your repos")
        self.activity("code", "Reading GitHub…", 0.3)
        repos = await self.use_tool("Reading GitHub", read_repos, st.links.get("github"))
        self.activity("code", "Matching projects to the role…", 0.7)
        ranked = await self.use_tool("Matching projects to the role", self._rank)

        advice = []
        for r in ranked[:3]:
            if r["shows"]:
                advice.append(f"Highlight '{r['name']}': it shows {', '.join(r['shows'][:4])}.")
            if not r["has_link"]:
                advice.append(f"Add a GitHub or demo link to '{r['name']}'. {cp.values[0] if cp.values else 'Proof'} matters here.")
            if not r["has_metrics"]:
                advice.append(f"Measure something real in '{r['name']}' (users, accuracy, speed) and put the number on your resume.")
        mine = st.skills + [t for p in st.projects for t in p.tech_stack]
        have = " ".join(mine + list(implied_skills(mine)) + [p.description for p in st.projects])
        gaps = [s for s in cp.must_have_skills if not has_term(have, s)]
        build_next = [f"Build a small project that uses {s}: the JD asks for it and nothing on your profile shows it yet."
                      for s in gaps if s not in FUNDAMENTALS][:3]
        if study := [s for s in gaps if s in FUNDAMENTALS]:
            build_next.append(f"The JD asks for {', '.join(study)}. They are in your theory checklist. "
                              "If you have already studied them, add them to your Skills.")
        known = {p.name.lower() for p in st.projects}
        extra = [r for r in repos if r["name"].lower() not in known
                 and (canon(r["language"]) in cp.must_have_skills or r["stars"] > 0)][:2]
        advice += [f"Your repo '{r['name']}' ({r['language'] or 'code'}) isn't in your profile. Consider adding it."
                   for r in extra]

        fb = {"advice": advice, "build_next": build_next}
        prompt = (f"Role: {self.qf.quest.role} at {self.qf.quest.company}\nMust-have skills: {cp.must_have_skills}\n"
                  f"Student projects: {[p.model_dump() for p in st.projects]}\nSkill gaps: {gaps}\n"
                  "Give project advice. Keys: advice (max 5 short tips about what to highlight or fix in "
                  "EXISTING projects), build_next (max 3 ideas for the skill gaps).")
        self.activity("code", "Writing up project advice…", 0.9)
        data, brain = await self.think("Thinking about your projects", prompt, lambda: fb)
        self.qf.project_advice = {
            "ranked": ranked, "gaps": gaps, "repos_seen": len(repos),
            "advice": str_list(data.get("advice"), 6) or advice,
            "build_next": (str_list(data.get("build_next"), 3) if brain == "gemini" and gaps else []) or build_next,
        }
        self.result(f"{min(2, len(ranked))} projects to highlight" if ranked else "No projects yet. Let's plan one.")
        self.rt.save()

    async def answer(self, asker: str, question: str) -> str:
        if not self.qf.project_advice:
            await self.review()
        ranked = self.qf.project_advice.get("ranked", [])
        if not ranked:
            return "No projects on the profile yet. Lead with skills and coursework."
        top = ranked[0]
        return f"{top['name']}: {' + '.join(top['shows'][:3]) or 'the most complete one'}!"

    async def solo(self, text: str) -> None:
        await self.consult("what this company wants and values", "What should the student's projects prove for this role?",
                           "company_analyst")
        await self.review()
        self.inform("resume_doctor", "Project ranking updated in the Quest File.")
