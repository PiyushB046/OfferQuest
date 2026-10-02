"""Shared data models (spec §14) plus the Quest File, the team's shared memory."""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

AGENT_IDS = [
    "counselor", "company_analyst", "resume_doctor", "project_advisor",
    "dsa_coach", "interview_coach", "opportunity_scout", "progress_manager",
]

Stage = Literal["intake", "company_intel", "resume", "prep", "mock", "review", "done"]
STAGES: list[str] = ["intake", "company_intel", "resume", "prep", "mock", "review", "done"]

Source = Literal["jd", "student", "role_common", "guess"]

MessageType = Literal["ASK", "ANSWER", "HANDOFF", "INFORM",
                      "REVIEW_REQUEST", "SEND_BACK", "ASK_HUMAN", "DONE"]


class Project(BaseModel):
    name: str
    description: str = ""
    tech_stack: list[str] = []
    link: str | None = None
    metrics: list[str] = []


class Experience(BaseModel):
    organisation: str
    role: str
    start: str = ""
    end: str | None = None
    highlights: list[str] = []


class DayPlan(BaseModel):
    day: int
    date: str | None = None
    dsa_problems: list[str] = []
    theory_topics: list[str] = []
    other_tasks: list[str] = []


class StudentProfile(BaseModel):
    id: str = ""
    name: str
    college: str = ""
    degree: str = ""
    branch: str = ""
    year: int = 3
    graduation_date: str = ""
    cgpa: float | None = None
    skills: list[str] = []
    projects: list[Project] = []
    experience: list[Experience] = []
    achievements: list[str] = []
    links: dict[str, str] = {}
    preferences: dict[str, Any] = {}


class Quest(BaseModel):
    id: str = ""
    student_id: str
    company: str
    role: str
    job_description: str = ""
    deadline: str | None = None
    days_available: int | None = None
    hours_per_day: float | None = None
    created: str | None = None      # ISO date the quest started; days left = days_available - days since
    stage: Stage = "intake"


class CompanyProfile(BaseModel):
    quest_id: str
    must_have_skills: list[str] = []
    nice_to_have_skills: list[str] = []
    jd_keywords: list[str] = []
    interview_rounds: list[str] = []
    dsa_focus: list[str] = []
    theory_focus: list[str] = []
    values: list[str] = []
    red_flags: list[str] = []
    sources: dict[str, Source] = {}


class AgentMessage(BaseModel):
    id: str
    quest_id: str
    sender: str
    receiver: str
    type: MessageType
    content: str
    attachments: list[str] = []
    timestamp: str


class VisualEvent(BaseModel):
    """Backend → game. STAGE and QUEST_DONE extend the spec's list (see Implementation.md)."""
    event: Literal["INTENT", "MOVE", "SPEAK", "ACTIVITY", "RESULT", "HANDOFF",
                   "ASK_HUMAN", "IDLE", "ERROR", "STAGE", "QUEST_DONE"]
    agent: str
    text: str | None = None
    to: str | None = None
    anim: str | None = None
    progress: float | None = None
    status: str | None = None
    icon: str | None = None
    item: str | None = None
    prompt: dict[str, Any] | None = None


class PrepKit(BaseModel):
    quest_id: str
    tailored_resume_path: str = ""
    resume_changes: list[str] = []
    match_score_before: int = 0
    match_score_after: int = 0
    project_advice: list[str] = []
    dsa_plan: list[DayPlan] = []
    theory_checklist: list[str] = []
    mock_interview_report: dict[str, Any] = {}
    readiness_score: int = 0
    readiness_breakdown: dict[str, int] = {}


class QuestFile(BaseModel):
    """One per quest. Each agent writes only its own section."""
    quest: Quest
    student: StudentProfile
    resume_text: str = ""
    confidence: dict[str, int] = {}          # self-rated 1-5: dsa, fundamentals, projects, communication
    intake_notes: dict[str, str] = {}        # counselor
    company_profile: CompanyProfile | None = None   # company_analyst
    project_advice: dict[str, Any] = {}      # project_advisor
    resume: dict[str, Any] = {}              # resume_doctor
    dsa: dict[str, Any] = {}                 # dsa_coach
    opportunities: dict[str, Any] = {}       # opportunity_scout
    mock: dict[str, Any] = {}                # interview_coach
    reviews: list[dict[str, Any]] = []       # progress_manager
    readiness: dict[str, Any] = {}           # progress_manager
    kit: PrepKit | None = None
    stats: dict[str, Any] = Field(default_factory=dict)
    status: Literal["running", "done", "failed"] = "running"
    error: str | None = None
