# OfferQuest — Implementation Plan

Companion to [OfferQuest.md](OfferQuest.md) (the spec). This file says **how** it gets built, in
what order, and what "done" means for each phase.

---

## 1. What we are building (my reading of the spec)

A multi-agent career-prep system whose **backend is the brain** and whose **pixel office is the
body**. Eight agents (Maya, Kabir, Dr. Rhea, Arjun, Coach Vikram, Ms. Iyer, Zoya, Mr. Desai)
prepare a student for **one specific company and role** (a *Quest*) and produce a *Company Prep
Kit*: tailored resume, change log, project advice, DSA plan, theory checklist, mock-interview
report, day-by-day plan and a Readiness Score.

Three rules drive every decision:

| Rule | What it forces in the code |
|---|---|
| **1. Agents always collaborate** | No agent method does its main work without an `ASK` / `INFORM` / `HANDOFF` to a teammate. Single-agent tasks go through the same code path as quests. |
| **2. Everything is company-specific** | Every agent reads the `CompanyProfile` in the Quest File. A task with no quest is refused by Maya ("start a quest first"). |
| **3. Show every action** | Agents cannot call the LLM or a tool except through `think()` / `use_tool()`, which emit visual events. Visibility coverage is **measured**, not hoped for. |

And two honesty rules that are enforced in code, not in prompts:

- **No invented resume content.** A faithfulness checker compares every tailored line against
  the student's own facts; any new skill or number is reverted. When Mr. Desai asks for a metric
  that doesn't exist, Dr. Rhea **asks the student** instead of making one up.
- **No fake insider info.** Every Company Profile field carries a source label
  (`jd` / `student` / `role_common` / `guess`). Zoya produces **search leads**, never invented
  openings.

The architecture principle from §12 is kept strictly: **the backend decides, the game only
animates events.**

---

## 2. Decisions and deviations from the spec

| Topic | Spec | What I'm doing | Why |
|---|---|---|---|
| LLM | Gemini free tier | Gemini **plus an offline brain**: every agent task has a deterministic fallback | Free-tier limits and outages must not kill a quest; eval and tests become reproducible. Set `GEMINI_API_KEY` in `.env` to switch Gemini on. |
| Routing | Fixed graph first, dynamic later | Stage order fixed by the LangGraph workflow; **who talks to whom** is chosen by the router | Keeps the quest reliable while making collaboration dynamic. |
| Art | Hand-drawn in Aseprite + Tiled map | **Procedural pixel art generated in code** at boot (tiles, furniture, 9 layered characters); the floor plan is a real Tiled map | Zero licensing risk, zero art-tool dependency, and it is already "layered parts" as §9.4 asks. Hand-drawn sprites and a Tiled export can replace it in the art sprints without touching game logic. |
| Audio | CC0 packs / jsfxr | SFX and a small chiptune loop **synthesised with WebAudio** | Own work, nothing to credit, no files to load. |
| Embeddings / ChromaDB | bge-small + ChromaDB | Match score: keyword coverage + prominence + TF-IDF cosine. ChromaDB holds knowledge notes, with local hashed embeddings | One resume vs. one JD doesn't need a vector DB; cross-quest notes do. Hashing avoids an 80 MB model download. |
| Web search | "Web search (public pages)" | Zoya builds search links to official career pages and job boards | No free search API, and §20 says prefer official pages over scraping. |
| Events | 9 event types | Adds `STAGE` and `QUEST_DONE` | Quest Board and confetti need to stay in sync with the animation queue. |
| Event queue | Per-agent queue | Per-agent queue **with cross-agent sync**: an event waits for every agent it involves | Otherwise Kabir answers before Rhea has walked over. |

---

## 3. Phases

Status: ✅ done · 🟡 partly · ⬜ not started. Statuses are updated as work lands.

### Phase 0 — Foundations ✅
Repo layout from §15, `.env.example`, `.gitignore`, `CREDITS.md`, Python venv, Vite project.
**Done when:** `pytest` and `npm run build` both run.

### Phase 1 — Contracts and data ✅
`backend/models.py` (all §14 models + `QuestFile`), SQLite persistence, skills lexicon, message
and event formats.
**Done when:** a Quest File round-trips through SQLite.

### Phase 2 — Agents in the terminal ✅
`base_agent.py` (intent → act → result → message), message bus (8 message types), event emitter,
guardrails (step limit, max 2 send-backs, loop detector), Gemini client with request queue, retry
and cache, the 8 agents, the LangGraph workflow, and `python -m backend.cli`.
**Done when:** the NovaMind Labs walkthrough from §8 runs end to end in the terminal.

### Phase 3 — Tools ✅
Resume parser (PDF/DOCX), JD matcher, faithfulness checker, resume writer (DOCX + PDF), GitHub
reader, opportunity leads, DSA problem bank.
**Done when:** a tailored resume is exported with a before/after match score and a change log.

### Phase 4 — API ✅
FastAPI: `/health`, students (save slots), resume upload, quests, single-agent tasks, human
answers, kit downloads, delete-my-data; WebSocket event stream.
**Done when:** a quest can be started and answered over HTTP while events stream on `/ws`.

### Phase 5 — The office ✅
Phaser scenes (Boot → Title → Menu → Office), procedural art, the 9-area floor plan, A*
pathfinding, Y-sorting, living details, sound.
**Done when:** PRESS START leads to an office where 8 agents sit at their desks and can walk
anywhere.

### Phase 6 — Brain ↔ body ✅
Event player, bubbles (thought / speech / result / error), folder hand-offs, ❓ prompts, pacing
(minimum visible time, speed 0.5×/1×/2×, pause).
**Done when:** every backend event of a quest is acted out in order.

### Phase 7 — UI panels and intro ✅
Quest intake wizard, human-prompt box (a queue, so parallel quests can both ask), Activity Log,
Quest Board (top strip + wall board), Agent Inspector with a free-text task box and
follow-camera, Prep Kit viewer with Team chat, Settings, How to Play, Credits.
**Intro cutscene** (`IntroScene.ts`, spec §10.5): doors slide open → student walks in → Maya waves
→ avatar creator (skin, hair, outfit, accessories; some unlock by finishing quests) → camera tour
with each agent waving and introducing themselves → "click on me" tutorial with a hint arrow →
Maya hands over the first Quest File → intake. Skippable (Esc or button), replayable from How to
Play. **Save slots** (one per student) and a **Progress** screen (streak, scores per quest).

### Phase 8 — Evaluation ✅ (automated part)
`eval/run_eval.py` over **20 quests** (5 fictional students × varied roles, `eval/build_cases.py`)
with the **single-agent baseline** (`eval/baseline.py`). Latest run, offline brain:

| | Before | Single agent | Team |
|---|---|---|---|
| Mean resume match score | 33.5 | 36.0 | **40.5** |
| Plan topics on the company's focus | — | 88.8% | **100%** |
| Review | — | none: 28 projects without a number went out unflagged | 16 issues sent back by Mr. Desai |

Faithfulness 100%, visibility 100%, 0.5 s per quest.
Cannot be done from here: human ratings of plan and mock-interview quality, and user testing with
5–10 students. The JDs are written in the style of public campus JDs, not copied from real
postings: swap in real ones before quoting numbers outside the team. Profile accuracy is trivially
100% on the offline brain.

### Phase 9 — Version 2 ✅
- **Dynamic routing** (`router.py`): agents say what they need and the router picks the teammate
  by skill card (`OFFERQUEST_ROUTING=dynamic|llm|fixed`). A typed task goes to whoever owns it:
  the clicked agent hands it over, and unowned tasks go to Maya as coordinator.
- **Checkpointing**: LangGraph `AsyncSqliteSaver`; a quest resumes from its last finished step
  after a server restart (verified against the running server).
- **Parallel quests + shared-prep detection**: several quests run at once; Mr. Desai reports
  "Graphs help for both A and B!".
- **Knowledge notes in ChromaDB** (`tools/knowledge.py`): Kabir recognises a JD close to one from
  an earlier quest. Embeddings are local feature hashing (no model download).
- **Replay** of any finished quest, and **attract mode** on the title screen after 20 s idle.
- **Voice mock interview**: questions read aloud (TTS), answers by microphone (STT), both via the
  browser's speech engines, off by default.
- **Day/night and weather**: follows the real clock, rain in monsoon months, override in Settings.
- **Progress over time**: tick off plan days, practice streak, scores per quest, trophies.

### Phase 10 — Art, map and ship 🟡
Done: full animation sets for all 9 characters (idle, walk, type, read, write, talk, cheer,
confused, carry, wave × 4 directions), dotted link lines between talking agents, the office as a
**Tiled map** (`frontend/public/assets/maps/office.json`: edit it in Tiled and the game follows),
Dockerfile + `render.yaml` + `vercel.json` + `docs/deploy.md`, demo-video script.
Not done, and not doable from this machine: hand-drawn art (the art is procedural), the actual
deployment (needs your hosting accounts), and recording the demo video.

---

### Phase 11 — Polish pass (night of 2 Oct) ✅
**Placement prep first**
- **Resume-first intake.** Step 1 is "give Maya your resume". The reader now handles two-column
  PDFs, wrapped lines and DOCX tables, and pulls out name, college, degree, branch, graduation
  year, CGPA, skills, projects (with links), internships (with dates) and achievements. With
  Gemini on, one call reads the resume and its answer is kept **only where the resume text backs
  it up**. The student sees what was read, with warnings, before continuing. A sample resume is
  bundled (`eval/sample_resume.pdf`, fictional).
- **Mock interview**: retakes keep a score history; with Gemini on, questions are written for the
  JD and the student's own projects; the weakest answer becomes a task in the plan.
- **Daily loop**: today's row is highlighted in the plan, theory check-offs are saved, the top bar
  counts down days to the interview, and ticking off practice raises the DSA part of readiness.

**Game feel**
- **Characters redrawn at twice the detail** (32×48 real pixels): faces with blinking eyes,
  jointed arms and legs, shoes, outlines. Walk cycle is 6 frames with opposite arm swing and bent
  knees. Each agent has a **gait** (`config.ts`): Coach Vikram strides and bounces, Mr. Desai
  walks slowly, Kabir keeps his hands in his hoodie pocket.
- **Surroundings**: floors and walls drawn pixel by pixel (planked wood with grain, woven carpets
  with edging, veined marble, terracotta, wainscoted walls, curtained windows, soft shadows),
  every piece of furniture outlined, and ~35 role-specific props: evidence boxes and a magnifier
  for Kabir, a light-table of marked-up resumes for Dr. Rhea, dual monitors, server rack and
  pegboard for Arjun, a readiness chart and coffee machine for Mr. Desai, telescope and globe for
  Zoya, student desks for Coach Vikram, ceiling fans, a logo sign and welcome mat at reception.
- **Click to walk.** Click the floor and the student walks there; click an agent and the student
  walks over, they face each other, and the conversation panel opens.
- **"!" markers.** An agent with something for the student shows a bouncing "!": finished work
  (resume, plan, report), a waiting question, today's unpractised day, a mock interview to take.
  Talking to them shows what it is, with one button to act on it.
- **Tea breaks.** Between quests two agents walk to the chai counter and talk, each in their own
  voice, sometimes about the current company. Real work always cancels small talk.
- Later-stage work can no longer appear on screen before its stage starts.

## 4. How to run

```bash
# backend
python3.12 -m venv .venv && .venv/bin/pip install -r backend/requirements.txt
.venv/bin/python -m backend.cli                 # the §8 walkthrough in the terminal
.venv/bin/uvicorn backend.main:app --port 8000  # API + WebSocket

# frontend
cd frontend && npm install && npm run dev       # http://localhost:5173
# (the "backend-offline" launch option runs the backend without Gemini, to save quota)
```

Tests: `.venv/bin/pytest`. Evaluation: `.venv/bin/python eval/run_eval.py`.

---

## 5. Known limits (honest list)

- **Gemini has had one full run** (2026-10-02, `gemini-flash-lite-latest`, demo quest in the CLI:
  all 8 calls succeeded, mock answers were scored on content, faithfulness stayed clean). It has
  not been run through the browser or tuned. The free tier is tight: `gemini-2.5-flash` allows
  about 20 requests a day and a quest uses about 8, so `.env` points at the lite model. When the
  quota runs out the crew switches to the offline brain for ten minutes instead of retrying.
- **Speech-to-text was not exercised**: it needs a microphone and a browser with speech
  recognition (Chrome, Edge, Safari). The button appears only where it is supported.
- **The Docker image was not built** (the Docker daemon was not running), and nothing is deployed.
- **No login.** Save slots are open to anyone who can reach the server; add accounts before a
  public deployment.
- After a restart, the step that was in flight runs again, so its animations repeat once.
- Offline mock-interview scoring is a rubric (length, specifics, structure), not a judgement of
  correctness. With Gemini on, the model scores the answer.
- Knowledge-note embeddings are feature hashes: good at "this JD is nearly the same", weak at
  paraphrase. A neural embedder can replace `embed()` without touching callers.
- The game sleeps while its browser tab is hidden, so events queue up rather than play unseen.
- PyMuPDF is AGPL-licensed. See CREDITS.md before hosting this as a closed-source service.
