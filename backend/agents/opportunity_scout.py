"""Zoya, Opportunity Scout: search leads for this company and similar roles. Never invents openings."""
from __future__ import annotations

from ..tools.lexicon import role_category
from ..tools.web_search import build_leads
from .base_agent import Agent


class OpportunityScout(Agent):
    id, name, title, room = "opportunity_scout", "Zoya", "Opportunity Scout", "scout"

    async def run(self) -> None:
        q = self.qf.quest
        hint = await self.consult("what kind of role and skills this company wants",
                                  "What kind of roles should I scout for besides this one?", "company_analyst")
        self.intent("Scouting openings")
        self.move("room:scout")
        self.activity("web", "Preparing searches on official pages…", 0.5)
        leads = await self.use_tool("Preparing searches", build_leads, q.company, q.role,
                                    role_category(q.role, q.job_description),
                                    str(self.qf.student.preferences.get("location", "")))
        leads["hint"] = hint
        self.qf.opportunities = leads
        self.result(f"{len(leads['leads'])} search leads ready")
        self.rt.save()
        self.inform("counselor", f"{len(leads['leads'])} leads for {q.company} and similar roles are in the Quest File.")
        self.idle()

    async def solo(self, text: str) -> None:
        await self.run()
