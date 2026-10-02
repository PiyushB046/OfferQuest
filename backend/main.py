"""FastAPI app: REST for what the student does, one WebSocket for what the office shows."""
from __future__ import annotations

import asyncio
import os
import re
import uuid
from contextlib import asynccontextmanager, suppress
from datetime import date, timedelta
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from .db import DB
from .demo import DEMO_JD, DEMO_STUDENT
from .llm.gemini_client import LLM
from .messaging.event_emitter import EventHub, now_iso
from .models import AGENT_IDS, Quest, QuestFile, StudentProfile
from .orchestrator.quest_graph import run_quest
from .orchestrator.router import run_task
from .orchestrator.runtime import QuestRuntime
from .tools.knowledge import Knowledge
from .tools.resume_parser import extract_text, merge_llm_fields, parse_report, parse_resume

load_dotenv()

@asynccontextmanager
async def lifespan(_: FastAPI):
    # Quests that were mid-run when the server stopped pick up from their last checkpoint.
    for qf in db.running_quests():
        _start(qf.quest.id, run_quest(QuestRuntime(qf, db, hub, llm, human)))
    yield
    for t in list(running.values()):
        t.cancel()


app = FastAPI(title="OfferQuest", lifespan=lifespan)
# In production set OFFERQUEST_ORIGINS to the frontend's URL (comma-separated for several).
app.add_middleware(CORSMiddleware, allow_origins=os.environ.get("OFFERQUEST_ORIGINS", "*").split(","),
                   allow_methods=["*"], allow_headers=["*"])

db = DB()
hub = EventHub(db)
llm = LLM(db)

pending: dict[str, asyncio.Future[str]] = {}      # prompt id -> the student's answer
running: dict[str, asyncio.Task] = {}             # quest id -> its task
open_prompts: dict[str, dict] = {}                # prompt id -> the question, so a reloaded page can re-ask


async def human(prompt: dict) -> str:
    fut: asyncio.Future[str] = asyncio.get_running_loop().create_future()
    pending[prompt["id"]] = fut
    open_prompts[prompt["id"]] = prompt
    try:
        return await fut
    finally:
        pending.pop(prompt["id"], None)
        open_prompts.pop(prompt["id"], None)


def _start(qid: str, coro) -> None:
    task = asyncio.create_task(coro)
    running[qid] = task
    task.add_done_callback(lambda t: (running.pop(qid, None), t.exception() if not t.cancelled() else None))


class NewQuest(BaseModel):
    student_id: str
    company: str
    role: str
    job_description: str = ""
    deadline: str | None = None
    days_available: int | None = None
    hours_per_day: float | None = None
    resume_text: str = ""
    confidence: dict[str, int] = {}


class Answer(BaseModel):
    prompt_id: str
    answer: str = ""


class Task(BaseModel):
    quest_id: str
    agent: str
    text: str = ""


@app.get("/health")
def health() -> dict:
    return {"ok": True, "brain": "gemini" if llm.enabled else "offline", "model": llm.model if llm.enabled else None}


@app.get("/api/demo")
def demo() -> dict:
    """Sample data for the intake form's 'fill with demo' button (fictional student and company)."""
    return {"student": DEMO_STUDENT.model_dump(exclude={"id"}), "company": "NovaMind Labs",
            "role": "AI Engineer Intern", "job_description": DEMO_JD, "days_available": 14, "hours_per_day": 2.5}


# ---- students (save slots)
@app.get("/api/students")
def students() -> list[dict]:
    return db.list_students()


@app.post("/api/students")
def save_student(s: StudentProfile) -> StudentProfile:
    if not s.id:
        s.id = "stu_" + uuid.uuid4().hex[:8]
    db.save_student(s, now_iso())
    return s


@app.get("/api/students/{sid}")
def get_student(sid: str) -> StudentProfile:
    if not (s := db.get_student(sid)):
        raise HTTPException(404, "No such student")
    return s


@app.delete("/api/students/{sid}")
def delete_student(sid: str) -> dict:
    for q in db.list_quests(sid):
        if t := running.get(q["id"]):
            t.cancel()
    db.delete_student(sid)
    Knowledge.for_dir(db.data_dir).forget(sid)
    return {"deleted": sid}


@app.get("/api/students/{sid}/progress")
def progress(sid: str) -> dict:
    """Progress over time: scores per quest, shared prep, and the practice streak."""
    files = db.quest_files(sid)
    rows, days, overlaps = [], set(), []
    for qf in files:
        rows.append({"id": qf.quest.id, "company": qf.quest.company, "role": qf.quest.role, "status": qf.status,
                     "readiness": qf.readiness.get("score"), "mock": qf.mock.get("overall"),
                     "match_before": qf.resume.get("score_before"), "match_after": qf.resume.get("score_after"),
                     "plan_days": len(qf.dsa.get("plan", [])), "days_done": len(qf.dsa.get("done", {}))})
        days.update(qf.dsa.get("done", {}).values())
        for o in qf.readiness.get("overlaps", []):   # "A and B" and "B and A" are the same finding
            if not any(set(re.findall(r"\w+", o)) == set(re.findall(r"\w+", seen)) for seen in overlaps):
                overlaps.append(o)
    streak, day = 0, date.today()
    if day.isoformat() not in days:          # today isn't over yet: yesterday keeps the streak alive
        day -= timedelta(days=1)
    while day.isoformat() in days:
        streak, day = streak + 1, day - timedelta(days=1)
    return {"quests": rows, "overlaps": overlaps, "streak": streak, "practice_days": len(days),
            "finished": sum(1 for r in rows if r["status"] == "done")}


@app.post("/api/resume/parse")
async def parse(file: UploadFile) -> dict:
    data = await file.read()
    if len(data) > 5_000_000:
        raise HTTPException(413, "Resume is larger than 5 MB.")
    try:
        text = extract_text(data, file.filename or "")
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    except Exception as e:  # noqa: BLE001 - a corrupt file
        raise HTTPException(400, "Could not read that file. Try another PDF or DOCX.") from e
    if len(text.strip()) < 30:
        raise HTTPException(400, "No text found. If the resume is a scanned image, please fill the form instead.")
    fields, source = parse_resume(text), "rules"
    if llm.enabled:
        # One Gemini call reads messy layouts far better than rules; its answer is kept only where
        # the resume text backs it up, so it cannot add anything the student didn't write.
        prompt = ("Extract this resume into JSON. Use only what is written. Keys: name, college, degree, branch, "
                  "graduation_date (year), skills (array), projects (array of {name, description, tech_stack, link, "
                  "metrics: measurable results quoted from the text}).\n\nRESUME:\n" + text[:9000])
        try:
            fields = merge_llm_fields(fields, await llm.json("You read resumes carefully and never add information.", prompt, {}), text)
            source = "gemini"
        except Exception:  # noqa: BLE001 - quota or network: the rule-based reading still stands
            pass
    return {"text": text, "fields": fields, "notes": parse_report(fields, text), "read_by": source,
            "pages_chars": len(text)}


# ---- quests
@app.get("/api/quests")
def quests(student_id: str | None = None) -> list[dict]:
    return [dict(q, live=q["id"] in running) for q in db.list_quests(student_id)]


@app.post("/api/quests")
async def start_quest(body: NewQuest) -> dict:
    if not (student := db.get_student(body.student_id)):
        raise HTTPException(404, "Save the student profile first.")
    if not body.company.strip() or not body.role.strip():
        raise HTTPException(400, "Company and role are required: every quest is for one specific company.")
    quest = Quest(id=db.next_quest_id(), created=date.today().isoformat(),
                  **body.model_dump(exclude={"resume_text", "confidence"}))
    qf = QuestFile(quest=quest, student=student, resume_text=body.resume_text, confidence=body.confidence)
    db.save_quest(qf, now_iso())
    _start(quest.id, run_quest(QuestRuntime(qf, db, hub, llm, human)))
    return {"quest_id": quest.id}


@app.get("/api/quests/{qid}")
def quest(qid: str) -> dict[str, Any]:
    if not (qf := db.get_quest(qid)):
        raise HTTPException(404, "No such quest")
    waiting = [p for pid, p in open_prompts.items() if pid.startswith(qid + "_p")]
    return {"file": qf.model_dump(), "messages": db.messages(qid), "live": qid in running, "waiting": waiting}


class DayDone(BaseModel):
    done: bool = True


@app.post("/api/quests/{qid}/plan/{day}")
def mark_day(qid: str, day: int, body: DayDone) -> dict:
    if qid in running:
        raise HTTPException(409, "The crew is still writing this plan.")
    if not (qf := db.get_quest(qid)) or not qf.dsa.get("plan"):
        raise HTTPException(404, "No practice plan for this quest yet.")
    done = qf.dsa.setdefault("done", {})
    if body.done:
        done[str(day)] = date.today().isoformat()
    else:
        done.pop(str(day), None)
    db.save_quest(qf, now_iso())
    return {"done": done}


class TheoryDone(BaseModel):
    item: str
    done: bool = True


@app.post("/api/quests/{qid}/theory")
def mark_theory(qid: str, body: TheoryDone) -> dict:
    if not (qf := db.get_quest(qid)) or body.item not in qf.dsa.get("theory_checklist", []):
        raise HTTPException(404, "That topic isn't on this quest's checklist.")
    done = [t for t in qf.dsa.get("theory_done", []) if t != body.item] + ([body.item] if body.done else [])
    qf.dsa["theory_done"] = done
    db.save_quest(qf, now_iso())
    return {"theory_done": done}


@app.get("/api/quests/{qid}/events")
def quest_events(qid: str) -> list[dict]:
    return db.events(qid)


@app.post("/api/answer")
def answer(body: Answer) -> dict:
    if not (fut := pending.get(body.prompt_id)) or fut.done():
        raise HTTPException(409, "That question is no longer waiting for an answer.")
    fut.set_result(body.answer)
    return {"ok": True}


@app.post("/api/tasks")
async def task(body: Task) -> dict:
    if body.agent not in AGENT_IDS:
        raise HTTPException(400, "Unknown agent")
    if body.quest_id in running:
        raise HTTPException(409, "The crew is still working on this quest. Wait for them to finish.")
    if not (qf := db.get_quest(body.quest_id)):
        raise HTTPException(404, "Start a quest first: the crew needs a company to prepare you for.")
    _start(body.quest_id, run_task(QuestRuntime(qf, db, hub, llm, human), body.agent, body.text))
    return {"ok": True}


@app.get("/api/quests/{qid}/resume.{ext}")
def resume_file(qid: str, ext: str) -> FileResponse:
    qf = db.get_quest(qid)
    path = Path((qf.resume.get(ext) if qf else "") or "")
    if ext not in ("pdf", "docx") or not path.is_file():
        raise HTTPException(404, "The tailored resume isn't ready yet.")
    return FileResponse(path, filename=f"{qf.student.name.replace(' ', '_')}_{qf.quest.company.replace(' ', '_')}.{ext}")  # type: ignore[union-attr]


@app.websocket("/ws")
async def ws(sock: WebSocket) -> None:
    await sock.accept()
    q = hub.subscribe()
    try:
        while True:
            await sock.send_json(await q.get())
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        hub.unsubscribe(q)
        with suppress(Exception):
            await sock.close()
