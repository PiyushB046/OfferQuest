"""Resume ↔ JD match score and the faithfulness check.

The score is deliberately explainable: coverage of what the company asks for, how prominent those
things are at the top of the resume, and overall wording similarity.
"""
from __future__ import annotations

import math
import re
from collections import Counter

from ..models import CompanyProfile
from .lexicon import find_skills, has_term, implied_skills, numbers, tokens


def _cosine(a: str, b: str) -> float:
    ca, cb = Counter(tokens(a)), Counter(tokens(b))
    dot = sum(ca[t] * cb[t] for t in ca)
    na, nb = math.sqrt(sum(v * v for v in ca.values())), math.sqrt(sum(v * v for v in cb.values()))
    return dot / (na * nb) if na and nb else 0.0


def match_score(top: str, full: str, cp: CompanyProfile, jd: str) -> dict:
    """`top` is what a recruiter sees first (summary + skills); `full` is the whole resume."""
    weighted = ([(s, 3) for s in cp.must_have_skills] + [(s, 1) for s in cp.nice_to_have_skills]
                + [(k, 1) for k in cp.jd_keywords])
    total = sum(w for _, w in weighted) or 1
    covered = [s for s, _ in weighted if has_term(full, s)]
    coverage = sum(w for s, w in weighted if has_term(full, s)) / total
    must = cp.must_have_skills or ["_"]
    prominence = sum(1 for s in must if has_term(top, s)) / len(must)
    similarity = min(1.0, _cosine(full, jd) * 2.5)
    score = round(100 * (0.55 * coverage + 0.25 * prominence + 0.20 * similarity))
    return {
        "score": score,
        "coverage": round(coverage, 2), "prominence": round(prominence, 2),
        "similarity": round(similarity, 2),
        "matched": covered,
        "missing_must_have": [s for s in cp.must_have_skills if not has_term(full, s)],
    }


def unfaithful_claims(text: str, facts: str) -> list[str]:
    """Skills and numbers in `text` that the student's own facts don't back up."""
    fact_skills, fact_numbers = set(find_skills(facts)), numbers(facts)
    fact_skills |= set(implied_skills(list(fact_skills)))
    bad = [s for s in find_skills(text) if s not in fact_skills]
    bad += [n for n in numbers(text) if n not in fact_numbers]
    return bad


def has_number(text: str) -> bool:
    return bool(re.search(r"\d", text))
