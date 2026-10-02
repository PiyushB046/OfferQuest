"""Kabir, Company Analyst: turns the JD into a Company Profile with a source on every field."""
from __future__ import annotations

import re

from ..models import CompanyProfile
from ..tools.lexicon import (DSA_TOPICS, RED_FLAGS, ROLE_DEFAULTS, THEORY_TOPICS, canon, dedupe, find_skills,
                             find_topics, has_term, role_category, top_keywords)
from .base_agent import Agent, str_list

NICE_MARKERS = r"nice to have|good to have|preferred|bonus|plus points|is a plus|a plus|desirable|brownie"
VALUE_CUES = {
    "Ownership": r"ownership|own the|end.to.end|self.starter|independent",
    "Shipped projects": r"shipped|production|deployed|real.world|built and",
    "Measurable impact": r"impact|metrics|measur|results",
    "Collaboration": r"collaborat|team player|cross.functional",
    "Curiosity and fast learning": r"curio|learn quickly|fast learner|eager to learn",
    "Clear communication": r"communicat",
    "Clean, tested code": r"clean code|code quality|testing|well.tested",
}
ROUND_CUES = {
    "Online assessment": r"online assessment|coding test|\boa\b|hackerrank",
    "Aptitude test": r"aptitude",
    "Technical interview": r"technical (interview|round)",
    "System design round": r"system design (round|interview)",
    "Take-home assignment": r"take.home|assignment",
    "HR round": r"hr (round|interview)|culture fit",
}


def split_jd(jd: str) -> tuple[str, str]:
    """(required part, nice-to-have part) of a JD."""
    must, nice, mode = [], [], "must"
    for line in jd.splitlines():
        s = line.strip()
        if re.search(NICE_MARKERS, s, re.I):
            mode = "nice"
        elif s.endswith(":") and len(s) < 60:
            mode = "must"
        (nice if mode == "nice" else must).append(s)
    return "\n".join(must), "\n".join(nice)


class CompanyAnalyst(Agent):
    id, name, title, room = "company_analyst", "Kabir", "Company Analyst", "intel"

    def _offline(self) -> dict:
        q = self.qf.quest
        jd = q.job_description
        d = ROLE_DEFAULTS[role_category(q.role, jd)]
        must_txt, nice_txt = split_jd(jd)
        src: dict[str, str] = {}

        must = find_skills(must_txt)
        src["must_have_skills"] = "jd" if must else "role_common"
        must = must or d["skills"]
        nice = [s for s in find_skills(nice_txt) if s not in must]
        src["nice_to_have_skills"] = "jd"
        src["jd_keywords"] = "jd"

        if rounds := self.qf.intake_notes.get("interview_rounds"):
            rounds_list, src["interview_rounds"] = [r.strip() for r in re.split(r",|→|->|\n", rounds) if r.strip()], "student"
        elif found := [name for name, pat in ROUND_CUES.items() if re.search(pat, jd, re.I)]:
            rounds_list, src["interview_rounds"] = found, "jd"
        else:
            rounds_list, src["interview_rounds"] = d["rounds"], "role_common"

        dsa = find_topics(jd, DSA_TOPICS)
        src["dsa_focus"] = "jd" if dsa else "role_common"
        theory = find_topics(jd, THEORY_TOPICS)
        src["theory_focus"] = "jd" if len(theory) >= 2 else "role_common"
        values = [v for v, pat in VALUE_CUES.items() if re.search(pat, jd, re.I)]
        src["values"] = "jd" if values else "role_common"
        src["red_flags"] = "role_common"
        return {
            "must_have_skills": must[:10], "nice_to_have_skills": nice[:8],
            "jd_keywords": top_keywords(jd, 8), "interview_rounds": rounds_list,
            "dsa_focus": dsa or d["dsa"], "theory_focus": dedupe(theory + d["theory"])[:5],
            "values": values[:4] or d["values"], "red_flags": RED_FLAGS[:3], "sources": src,
        }

    async def run(self) -> None:
        q = self.qf.quest
        self.intent("Heading to the Intel Room to study the JD")
        self.move("room:intel")
        self.activity("pin", "Reading the JD…", 0.3)
        past = await self.use_tool("Checking notes from earlier quests", self.rt.kb.similar, q.job_description,
                                   q.student_id, q.id)
        if past and past[0]["distance"] < 0.45:
            seen = past[0]["meta"]
            self.qf.intake_notes["similar_quest"] = f"{seen['role']} at {seen['company']}"
            self.intent(f"This JD is close to {seen['company']}'s from your earlier quest. Good: prep will overlap.")
        self.activity("pin", "Studying what they ask for…", 0.5)
        fb = self._offline()
        prompt = (
            f"Company: {q.company}\nRole: {q.role}\nJob description:\n{q.job_description[:6000]}\n\n"
            "Build a company profile. Use ONLY skills that literally appear in the job description for "
            "must_have_skills and nice_to_have_skills.\nKeys: must_have_skills, nice_to_have_skills, "
            "jd_keywords (max 8), dsa_focus, theory_focus, values (what they value, max 4). All arrays of short strings."
        )
        data, brain = await self.think("Studying the JD", prompt, lambda: fb)
        if brain == "gemini":
            jd = q.job_description
            # Profile accuracy: a model's "must-have" only counts if the JD really says it.
            # canon(): the model writes "vector databases", the rest of the crew knows "Vector Databases".
            must = dedupe([canon(s) for s in str_list(data.get("must_have_skills")) if has_term(jd, s)])
            nice = dedupe([canon(s) for s in str_list(data.get("nice_to_have_skills")) if has_term(jd, s)])
            nice = [s for s in nice if s not in must]
            data = dict(fb, must_have_skills=must or fb["must_have_skills"],
                        nice_to_have_skills=nice or fb["nice_to_have_skills"],
                        jd_keywords=[k for k in str_list(data.get("jd_keywords"), 8) if has_term(jd, k)]
                        or fb["jd_keywords"],
                        dsa_focus=str_list(data.get("dsa_focus"), 6) or fb["dsa_focus"],
                        theory_focus=str_list(data.get("theory_focus"), 6) or fb["theory_focus"],
                        values=str_list(data.get("values"), 4) or fb["values"])
        self.activity("pin", "Pinning notes on the board…", 0.8)
        self.qf.company_profile = CompanyProfile(quest_id=q.id, **data)
        self.rt.kb.add(q.id, q.job_description, {"student_id": q.student_id, "quest_id": q.id,
                                                 "company": q.company, "role": q.role})
        self.result(f"Company profile built: {len(data['must_have_skills'])} must-have skills")
        self.rt.save()

    def brief_team(self) -> None:
        cp = self.qf.company_profile
        assert cp
        self.intent("Dropping notes at everyone's desks")
        self.inform("resume_doctor", f"Top skills to show: {', '.join(cp.must_have_skills[:4])}.")
        self.inform("dsa_coach", f"DSA focus: {', '.join(cp.dsa_focus[:3])}.")
        self.inform("interview_coach", f"Rounds: {' → '.join(cp.interview_rounds[:4])}.")
        self.idle()

    async def answer(self, asker: str, question: str) -> str:
        if not self.qf.company_profile:
            await self.run()
        cp = self.qf.company_profile
        assert cp
        self.activity("pin", "Checking my notes…")
        await self.use_tool("Checking my notes", lambda: None)
        tag = {"jd": "from the JD", "student": "from the student", "role_common": "common for this role",
               "guess": "a guess, verify"}
        if asker == "dsa_coach":
            return (f"DSA focus: {', '.join(cp.dsa_focus[:4])} ({tag[cp.sources.get('dsa_focus', 'guess')]}). "
                    f"Rounds: {' → '.join(cp.interview_rounds[:4])}.")
        if asker == "interview_coach":
            return (f"Rounds: {' → '.join(cp.interview_rounds[:4])} "
                    f"({tag[cp.sources.get('interview_rounds', 'guess')]}). "
                    f"Probe {', '.join(cp.must_have_skills[:3])}; theory: {', '.join(cp.theory_focus[:3])}.")
        if asker == "opportunity_scout":
            return f"Look for roles asking for {', '.join(cp.must_have_skills[:3])}."
        return (f"Lead with {', '.join(cp.must_have_skills[:4])}. "
                f"They value {', '.join(v.lower() for v in cp.values[:2])}.")

    async def solo(self, text: str) -> None:
        await self.run()
        self.brief_team()
