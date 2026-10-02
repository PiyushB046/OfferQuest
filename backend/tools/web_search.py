"""Opportunity leads.

We do not scrape job portals (spec §20) and we never invent openings. Zoya hands the student
ready-made searches on official and public pages, which they open themselves.
"""
from __future__ import annotations

from urllib.parse import quote_plus

SIMILAR = {
    "ai_ml": ["AI-first startups building LLM products", "Analytics and ML teams at product companies",
              "Research labs and applied-AI consultancies"],
    "data": ["Analytics teams at fintech and e-commerce companies", "Consulting and KPO analytics firms",
             "Product companies with business-intelligence teams"],
    "web": ["Product startups hiring frontend / full-stack interns", "SaaS companies", "Digital agencies"],
    "service": ["IT services companies running mass-hiring drives", "Captive tech centres of banks and retailers"],
    "sde": ["Product companies hiring SDE interns", "Fintech and SaaS startups", "Developer-tools companies"],
}


def build_leads(company: str, role: str, category: str, location: str = "") -> dict:
    q = quote_plus
    loc = f" {location}" if location else ""
    leads = [
        {"label": f"{company} — official careers page", "kind": "official",
         "url": f"https://www.google.com/search?q={q(company + ' careers ' + role)}"},
        {"label": f"{company} on LinkedIn Jobs", "kind": "job board",
         "url": f"https://www.linkedin.com/jobs/search/?keywords={q(company + ' ' + role)}"},
        {"label": f"Similar '{role}' roles on LinkedIn{loc}", "kind": "job board",
         "url": f"https://www.linkedin.com/jobs/search/?keywords={q(role)}"
                + (f"&location={q(location)}" if location else "")},
        {"label": f"'{role}' internships on Internshala", "kind": "job board",
         "url": f"https://internshala.com/internships/keywords-{q(role)}"},
        {"label": f"'{role}' on Wellfound (startups)", "kind": "job board",
         "url": f"https://www.google.com/search?q={q('site:wellfound.com ' + role + loc)}"},
        {"label": f"{company} interview experiences (public posts — verify)", "kind": "research",
         "url": f"https://www.google.com/search?q={q(company + ' ' + role + ' interview experience')}"},
    ]
    return {"leads": leads, "similar_targets": SIMILAR.get(category, SIMILAR["sde"]),
            "note": "These are searches to run, not confirmed openings. Check deadlines on the official page."}
