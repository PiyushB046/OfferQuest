from __future__ import annotations

from typing import TYPE_CHECKING

from .base_agent import Agent
from .company_analyst import CompanyAnalyst
from .counselor import Counselor
from .dsa_coach import DSACoach
from .interview_coach import InterviewCoach
from .opportunity_scout import OpportunityScout
from .progress_manager import ProgressManager
from .project_advisor import ProjectAdvisor
from .resume_doctor import ResumeDoctor

if TYPE_CHECKING:
    from ..orchestrator.runtime import QuestRuntime

CREW: list[type[Agent]] = [Counselor, CompanyAnalyst, ResumeDoctor, ProjectAdvisor, DSACoach,
                           InterviewCoach, OpportunityScout, ProgressManager]


def build_agents(rt: "QuestRuntime") -> dict[str, Agent]:
    return {cls.id: cls(rt) for cls in CREW}
