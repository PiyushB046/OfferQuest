"""The comparison from spec §18: one agent doing everything alone vs. the team.

The single agent gets the same student and the same JD and uses the same tools, but has no
teammates: no Company Analyst separating must-haves from nice-to-haves, no Project Advisor ranking
projects, no Progress Manager sending weak work back, and no one to ask. It reads the JD itself,
tailors the resume in one pass and writes a plan from the role name.
"""
from __future__ import annotations

from backend.models import CompanyProfile, QuestFile
from backend.tools.jd_matcher import has_number, match_score
from backend.tools.lexicon import ROLE_DEFAULTS, canon, dedupe, find_skills, role_category
from backend.tools.resume_writer import baseline_resume, render_text
from backend.agents.resume_doctor import strengthen


def single_agent(qf: QuestFile, team_profile: CompanyProfile) -> dict:
    st, jd = qf.student, qf.quest.job_description
    r = baseline_resume(st)
    wanted = find_skills(jd)                                   # everything in the JD, undifferentiated
    listed = dedupe([canon(s) for s in st.skills])
    r["skills"] = [s for s in wanted if s in listed] + [s for s in listed if s not in wanted]
    for p in r["projects"]:
        for b in p["bullets"]:
            b["text"] = strengthen(b["text"])
    r["summary"] = f"{st.branch or st.degree} student at {st.college} skilled in {', '.join(r['skills'][:4])}."
    top, full = render_text(r)
    score = match_score(top, full, team_profile, jd)           # judged by the same yardstick as the team
    weak = [p["name"] for p in r["projects"][:2] if not any(has_number(b["text"]) for b in p["bullets"])]
    focus = ROLE_DEFAULTS[role_category(qf.quest.role, "")]["dsa"]   # plan from the role name only
    on_focus = sum(1 for t in focus if t in team_profile.dsa_focus) / len(focus)
    return {"match_after": score["score"], "unreviewed_weak_projects": len(weak), "plan_on_focus_pct": round(100 * on_focus)}
