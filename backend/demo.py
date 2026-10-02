"""The walkthrough from spec §8: a fictional student and a fictional company."""
from __future__ import annotations

from .models import Project, Quest, QuestFile, StudentProfile

DEMO_JD = """NovaMind Labs — AI Engineer Intern

About the role:
You will build and ship LLM-powered features with our applied AI team. We care about ownership and
measurable impact: things that run in production, not just notebooks.

Requirements:
- Strong Python and comfort with Git
- Hands-on experience with LLM APIs and retrieval (RAG) pipelines
- Understanding of evaluation: how do you know your system is good?
- Solid basics: data structures (arrays, hashing, graphs), OOP and DBMS
- Ability to build and call REST APIs

Nice to have:
- LangGraph or similar agent frameworks
- Docker
- Vector databases
"""

DEMO_STUDENT = StudentProfile(
    id="stu_demo", name="Aarav Sharma", college="Sahyadri Institute of Technology", degree="B.Tech",
    branch="Computer Science", year=3, graduation_date="2028", cgpa=8.1,
    skills=["Java", "Python", "SQL", "HTML", "Git"],
    projects=[
        Project(name="Campus Events App", tech_stack=["React", "Firebase"], link=None,
                description="Made an app where students can see college events. Worked on the login page and event list."),
        Project(name="Yojana Mitra", tech_stack=["Python", "RAG", "Gemini", "FastAPI", "ChromaDB"],
                link="https://github.com/aarav-demo/yojana-mitra",
                description="Worked on a chatbot that answers questions about government schemes from official PDFs. "
                            "Created an evaluation set of 50 questions to test answer quality.",
                metrics=["82% answer accuracy on a 50-question test set"]),
    ],
    achievements=["Finalist, college hackathon 2026", "150+ problems solved on LeetCode"],
    links={"github": "https://github.com/aarav-demo", "leetcode": "https://leetcode.com/aarav-demo"},
    preferences={"location": "Pune", "work_mode": "hybrid"},
)

# What the student types when an agent asks. Matched by a fragment of the question.
DEMO_ANSWERS = [
    ("interview rounds", "No"),
    ("wants a number", "About 40 students used it during our college fest"),
    ("Ready for a short mock", "Let's go"),
    ("Walk me through", "Yojana Mitra is a RAG chatbot for government schemes. The hard part was retrieval quality, "
                        "because scheme PDFs are long and messy. First I chunked by section, then I built a 50-question "
                        "test set, and that got answer accuracy to 82%. Next I would add re-ranking."),
    ("Why that choice", "I chose RAG because the model does not know scheme details and they change often, so "
                        "retrieval keeps answers grounded. The trade-off is that bad retrieval gives bad answers."),
    ("duplicates", "First I would clarify the input size. Brute force compares every pair, which is O(n^2). "
                   "Instead I would use a hash set: one pass, O(n) time and O(n) space."),
    ("core concept", "Encapsulation."),
    ("Why NovaMind", "NovaMind Labs ships LLM features to production, and my RAG project taught me I enjoy that. "
                     "I want to learn evaluation at scale because my test set had only 50 questions."),
]


def demo_quest_file(quest_id: str = "quest_demo") -> QuestFile:
    return QuestFile(
        quest=Quest(id=quest_id, student_id=DEMO_STUDENT.id, company="NovaMind Labs", role="AI Engineer Intern",
                    job_description=DEMO_JD, days_available=14, hours_per_day=2.5),
        student=DEMO_STUDENT.model_copy(deep=True),
        confidence={"dsa": 3, "fundamentals": 3, "projects": 4, "communication": 3},
    )


async def demo_human(prompt: dict) -> str:
    q = prompt["question"]
    return next((ans for key, ans in DEMO_ANSWERS if key.lower() in q.lower()), "")
