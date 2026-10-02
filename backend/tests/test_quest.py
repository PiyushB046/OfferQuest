"""The rules from the spec, as tests. All run on the offline brain: no network, no API key."""
from __future__ import annotations

import asyncio

import pytest

from backend.db import DB
from backend.demo import demo_human, demo_quest_file
from backend.llm.gemini_client import LLM
from backend.messaging.event_emitter import EventHub
from backend.models import AGENT_IDS, STAGES
from backend.orchestrator.guardrails import MAX_SEND_BACKS, Guardrails, QuestLimitError
from backend.orchestrator.quest_graph import run_quest
from backend.orchestrator.router import route_by_skills, run_solo, run_task
from backend.orchestrator.runtime import QuestRuntime
from backend.tools.jd_matcher import unfaithful_claims
from backend.tools.lexicon import find_skills
from backend.tools.resume_parser import extract_text, parse_resume
from backend.tools.resume_writer import render_text


def make_rt(tmp_path, monkeypatch, human=demo_human) -> QuestRuntime:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    db = DB(tmp_path)
    return QuestRuntime(demo_quest_file(), db, EventHub(db), LLM(db), human)


@pytest.fixture
def done(tmp_path, monkeypatch) -> QuestRuntime:
    rt = make_rt(tmp_path, monkeypatch)
    asyncio.run(run_quest(rt))
    return rt


def test_quest_completes_with_full_kit(done):
    qf = done.qf
    assert qf.status == "done" and qf.quest.stage == "done"
    kit = qf.kit
    assert kit and kit.dsa_plan and kit.theory_checklist and kit.resume_changes
    assert kit.match_score_after > kit.match_score_before
    assert 0 <= kit.readiness_score <= 100
    assert not kit.mock_interview_report["skipped"]
    assert (done.db.quest_dir(qf.quest.id) / "tailored_resume.pdf").stat().st_size > 1000
    assert (done.db.quest_dir(qf.quest.id) / "tailored_resume.docx").stat().st_size > 1000


def test_stages_run_in_order(done):
    stages = [e["status"] for e in done.db.events(done.qf.quest.id) if e["event"] == "STAGE"]
    assert stages == STAGES


def test_rule1_every_agent_collaborates(done):
    msgs = done.db.messages(done.qf.quest.id)
    talked = {m["sender"] for m in msgs} | {m["receiver"] for m in msgs}
    assert set(AGENT_IDS) <= talked
    assert {"ASK", "ANSWER", "HANDOFF", "INFORM", "REVIEW_REQUEST", "SEND_BACK", "ASK_HUMAN", "DONE"} \
        == {m["type"] for m in msgs}


def test_rule3_every_action_is_announced(done):
    assert done.stats["actions"] > 20
    assert done.stats["announced"] == done.stats["actions"]


def test_tailored_resume_is_faithful(done):
    qf = done.qf
    assert qf.resume["faithfulness_flags"] == []
    _, full = render_text(qf.resume["tailored"])
    assert unfaithful_claims(full, qf.student.model_dump_json()) == []


def test_faithfulness_check_catches_invented_claims():
    facts = "Built a chatbot in Python. 50 questions."
    assert unfaithful_claims("Built a chatbot in Python with 50 questions", facts) == []
    assert "Kubernetes" in unfaithful_claims("Deployed on Kubernetes", facts)
    assert "95" in unfaithful_claims("Reached 95% accuracy", facts)


def test_no_metric_is_invented_when_student_has_none(tmp_path, monkeypatch):
    async def human(prompt: dict) -> str:
        return "" if "wants a number" in prompt["question"] else await demo_human(prompt)

    rt = make_rt(tmp_path, monkeypatch, human)
    asyncio.run(run_quest(rt))
    proj = next(p for p in rt.qf.resume["tailored"]["projects"] if p["name"] == "Campus Events App")
    assert not any(ch.isdigit() for b in proj["bullets"] for ch in b["text"])
    assert rt.qf.resume["declined_metrics"] == ["Campus Events App"]
    assert rt.qf.status == "done"


def test_company_profile_only_claims_what_the_jd_says(done):
    cp, jd = done.qf.company_profile, done.qf.quest.job_description
    assert cp.sources["must_have_skills"] == "jd"
    assert set(cp.must_have_skills) <= set(find_skills(jd))
    assert "Docker" in cp.nice_to_have_skills and "Docker" not in cp.must_have_skills
    assert cp.sources["interview_rounds"] == "role_common"   # the JD is silent and the student said "No"


def test_missing_jd_makes_maya_ask(tmp_path, monkeypatch):
    asked = []

    async def human(prompt: dict) -> str:
        asked.append(prompt["question"])
        return "Need Python, SQL and Git. Online assessment then HR round." * 2 if "job description" in prompt["question"] \
            else await demo_human(prompt)

    rt = make_rt(tmp_path, monkeypatch, human)
    rt.qf.quest.job_description = ""
    asyncio.run(run_quest(rt))
    assert "job description" in asked[0]
    assert "Python" in rt.qf.company_profile.must_have_skills


def test_send_backs_are_capped():
    g = Guardrails()
    for _ in range(MAX_SEND_BACKS):
        assert g.can_send_back("resume")
        g.record_send_back("resume")
    assert not g.can_send_back("resume")


def test_loop_detector():
    g = Guardrails()
    g.check_message("a", "b", "ASK", "same?")
    g.check_message("a", "b", "ASK", "same?")
    with pytest.raises(QuestLimitError):
        g.check_message("a", "b", "ASK", "same?")


def test_single_agent_task_still_collaborates(tmp_path, monkeypatch):
    rt = make_rt(tmp_path, monkeypatch)
    asyncio.run(run_solo(rt, "dsa_coach", "give me practice"))
    msgs = rt.db.messages(rt.qf.quest.id)
    assert any(m["sender"] == "dsa_coach" and m["receiver"] == "company_analyst" and m["type"] == "ASK" for m in msgs)
    assert any(m["sender"] == "dsa_coach" and m["receiver"] == "progress_manager" for m in msgs)
    assert rt.qf.dsa["plan"]


def test_resume_pdf_round_trips_through_parser(done):
    pdf = (done.db.quest_dir(done.qf.quest.id) / "tailored_resume.pdf").read_bytes()
    text = extract_text(pdf, "resume.pdf")
    fields = parse_resume(text)
    assert fields["name"] == "Aarav Sharma"
    assert "Python" in fields["skills"]
    assert any(p["name"].startswith("Yojana Mitra") for p in fields["projects"])


def test_delete_student_removes_everything(done):
    db, qid = done.db, done.qf.quest.id
    db.save_student(done.qf.student, "now")
    db.delete_student(done.qf.student.id)
    assert db.get_quest(qid) is None and db.events(qid) == [] and db.messages(qid) == []


# ---- phase 9: dynamic routing, checkpoints, shared prep, knowledge notes
def test_router_picks_teammate_by_skill_card():
    assert route_by_skills("which skills this company's job description emphasises", "resume_doctor") == "company_analyst"
    assert route_by_skills("which of the student's projects fits best", "resume_doctor") == "project_advisor"
    assert route_by_skills("what is on top of the tailored resume", "interview_coach") == "resume_doctor"
    assert route_by_skills("what's for lunch") is None


def test_quest_teammates_are_chosen_by_the_router(done):
    routes = done.stats["routes"]
    assert len(routes) >= 6
    assert {"from": "dsa_coach", "need": "the company's interview pattern and focus", "to": "company_analyst"} in routes


def test_task_for_the_wrong_agent_is_handed_to_its_owner(tmp_path, monkeypatch):
    rt = make_rt(tmp_path, monkeypatch)
    owner = asyncio.run(run_task(rt, "opportunity_scout", "give me more graph problems to practice"))
    msgs = rt.db.messages(rt.qf.quest.id)
    assert owner == "dsa_coach"
    assert any(m["type"] == "HANDOFF" and m["sender"] == "opportunity_scout" and m["receiver"] == "dsa_coach" for m in msgs)
    assert rt.qf.dsa["plan"]


def test_task_nobody_owns_goes_to_the_coordinator(tmp_path, monkeypatch):
    rt = make_rt(tmp_path, monkeypatch)
    assert asyncio.run(run_task(rt, "dsa_coach", "hmm what now")) == "counselor"


def test_quest_resumes_from_checkpoint_after_a_crash(tmp_path, monkeypatch):
    class Crash(Exception):
        pass

    async def dies_at_mock(prompt: dict) -> str:
        if "Ready for a short mock" in prompt["question"]:
            raise Crash
        return await demo_human(prompt)

    rt = make_rt(tmp_path, monkeypatch, dies_at_mock)
    with pytest.raises(Crash):
        asyncio.run(run_quest(rt))
    saved = rt.db.get_quest(rt.qf.quest.id)
    assert saved.resume["score_after"] and not saved.mock          # resume work survived, mock never ran
    saved.status = "running"                                        # what the server sees on restart

    rt2 = QuestRuntime(saved, rt.db, EventHub(rt.db), LLM(rt.db), demo_human)
    asyncio.run(run_quest(rt2))
    assert rt2.qf.status == "done" and rt2.qf.kit.readiness_score > 0
    stages = [e["status"] for e in rt2.db.events(saved.quest.id) if e["event"] == "STAGE"]
    assert stages.count("intake") == 1 and stages.count("resume") == 1   # finished steps were not redone
    assert rt2.stats["send_backs"] == 0


def test_shared_prep_is_found_across_quests(done):
    from backend.models import Quest, QuestFile
    qf2 = QuestFile(quest=Quest(id="quest_two", student_id=done.qf.student.id, company="Brightlane", role="SDE Intern",
                                job_description="Requirements: Python, Git, data structures (graphs, hashing), OOP and DBMS. "
                                                "Interview process: online assessment, technical interview, HR round.",
                                days_available=10, hours_per_day=2), student=done.qf.student)
    rt = QuestRuntime(qf2, done.db, EventHub(done.db), LLM(done.db), demo_human)
    asyncio.run(run_quest(rt))
    overlaps = rt.qf.readiness["overlaps"]
    assert overlaps and "NovaMind Labs" in overlaps[0] and "Graphs" in overlaps[0]


def test_knowledge_notes_recognise_a_similar_jd(done):
    hits = done.kb.similar(done.qf.quest.job_description.replace("NovaMind", "Other"), done.qf.student.id, "another_quest")
    assert hits and hits[0]["meta"]["company"] == "NovaMind Labs" and hits[0]["distance"] < 0.2
    assert done.kb.similar("Sales executive for a furniture showroom, cold calling", done.qf.student.id, "x")[0]["distance"] > 0.6
    done.kb.forget(done.qf.student.id)
    assert done.kb.similar("anything", done.qf.student.id, "x") == []


# ---- placement-prep details
def test_two_column_resume_pdf_is_read_correctly():
    from pathlib import Path
    pdf = Path(__file__).resolve().parents[2] / "eval" / "sample_resume.pdf"
    fields = parse_resume(extract_text(pdf.read_bytes(), "resume.pdf"), today_year=2026)
    assert fields["name"] == "Meera Joshi"
    assert fields["college"].startswith("Sahyadri Institute of Technology")
    assert (fields["degree"], fields["branch"], fields["graduation_date"], fields["cgpa"]) == ("B.Tech", "Information Technology", "2027", 8.4)
    assert [p["name"] for p in fields["projects"]] == ["BusBuddy", "Notes Summariser"]
    assert "300 students" in fields["projects"][0]["description"] and "JavaScript" not in fields["skills"]
    assert fields["experience"][0]["organisation"] == "Koyna Softworks" and fields["experience"][0]["start"] == "Jun 2025"
    assert len(fields["achievements"]) == 3


def test_llm_resume_reading_cannot_add_what_is_not_in_the_resume():
    from backend.tools.resume_parser import merge_llm_fields
    text = "Asha Rao\nProjects\nTodo App | React\n- Built a todo app used by 12 friends"
    base = parse_resume(text)
    merged = merge_llm_fields(base, {"name": "Asha Rao", "college": "IIT Bombay", "skills": ["React", "Kubernetes"],
                                     "projects": [{"name": "Todo App", "description": "Built a todo app", "tech_stack": ["React", "AWS"], "metrics": ["12 friends", "99% uptime"]},
                                                  {"name": "Secret Startup", "description": "x"}]}, text)
    assert merged["college"] == "" and "Kubernetes" not in merged["skills"]
    assert [p["name"] for p in merged["projects"]] == ["Todo App"]
    assert merged["projects"][0]["tech_stack"] == ["React"] and merged["projects"][0]["metrics"] == ["12 friends"]


def test_mock_retake_keeps_history_and_adds_a_follow_up_task(done):
    first = done.qf.mock["overall"]
    assert done.qf.mock["history"] == [{"date": done.qf.mock["history"][0]["date"], "overall": first}]
    assert any("Redo this mock question" in t for d in done.qf.dsa["plan"] for t in d["other_tasks"])
    rt = QuestRuntime(done.qf, done.db, EventHub(done.db), LLM(done.db), demo_human)
    asyncio.run(run_task(rt, "interview_coach", ""))
    assert len(rt.qf.mock["history"]) == 2 and rt.qf.mock["rounds"]


def test_practice_raises_readiness(done):
    before = done.qf.readiness["breakdown"]["dsa"]
    done.qf.dsa["done"] = {str(d["day"]): "2026-10-02" for d in done.qf.dsa["plan"][:7]}
    assert done.agents["progress_manager"]._readiness()["breakdown"]["dsa"] > before
