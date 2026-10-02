# 🏆 OfferQuest

### *Your AI career crew in a pixel office: every agent works together to win you the offer letter.*

> A multi-agent AI system, shown as a living pixel-art office, where specialised AI agents **talk to each other, hand over work, and visibly act out every step** to make a student job-ready **for a specific company**.

| | |
|---|---|
| **Project name** | OfferQuest |
| **Tagline** | *Every company is a new quest. Your crew prepares you for it.* |
| **Type** | Multi-agent AI system + interactive pixel-art game interface |
| **Target users** | College students (especially CS) preparing for internships and placements |
| **Team size** | 2 |
| **Duration** | ~12 weeks, part-time |
| **LLM** | Google Gemini (free API key) |
| **Status** | 🟡 Planning |
| **Last updated** | October 2026 |

---

## 📌 Table of Contents
1. [Why OfferQuest?](#1-why-offerquest)
2. [The Big Idea](#2-the-big-idea)
3. [Three Core Rules](#3-three-core-rules)
4. [Meet the Crew (Agents)](#4-meet-the-crew-agents)
5. [The Company Quest: Company-Specific Prep](#5-the-company-quest-company-specific-prep)
6. [How Agents Talk & Hand Off Work](#6-how-agents-talk--hand-off-work)
7. [Show Every Action: The Visual Action System](#7-show-every-action-the-visual-action-system)
8. [Example Quest Walkthrough](#8-example-quest-walkthrough)
9. [The Office: Our Own Pixel World](#9-the-office-our-own-pixel-world)
10. [Press Start: The Game-Style Entry Experience](#10-press-start-the-game-style-entry-experience)
11. [Features](#11-features)
12. [System Architecture](#12-system-architecture)
13. [Tech Stack](#13-tech-stack)
14. [Data Models](#14-data-models)
15. [Project Structure](#15-project-structure)
16. [Build Plan](#16-build-plan)
17. [Work Split](#17-work-split)
18. [Evaluation](#18-evaluation)
19. [Challenges & Solutions](#19-challenges--solutions)
20. [Privacy, Ethics & Honesty](#20-privacy-ethics--honesty)
21. [Definition of Done](#21-definition-of-done)
22. [Future Scope](#22-future-scope)
23. [Glossary](#23-glossary)

---

## 1. Why OfferQuest?

Thousands of students, especially in tier-2 and tier-3 colleges, struggle with placements because:

- 📄 They use **one generic resume** for every company, though every company looks for different things
- 🤷 They don't know **what a specific company actually tests** (DSA? System design? Projects? Aptitude?)
- 🎤 They get **no mock interviews** or honest feedback
- 🧭 They have **no clear plan** for what to prepare and when
- 💸 Good mentorship and coaching are **expensive**

**OfferQuest gives every student a personal career team for free**, and makes the whole process fun, visual and easy to follow.

---

## 2. The Big Idea

A **pixel-art office** where each AI agent is a character with a **role, a desk and a room**.

- The app opens like a real game: a title screen where you **press Start** to enter the office.
- When idle, agents sit at their desks, sip chai, or chat in the break room.
- The student **clicks a character** and gives it a task, or starts a full **Company Quest**.
- Agents then **get up, walk to their work areas, talk to each other, pass files around**, and work together.
- **Every single action is acted out on screen**, so you always see *who* is doing *what*, and *what they're about to do next*.
- The quest ends with a complete **Company Prep Kit**: a tailored resume, prep plan, practice problems, mock interview report and readiness score.

> 🎮 It feels like watching a team in a game, but the work is real.

---

## 3. Three Core Rules

These rules shape every design decision.

### 🔁 Rule 1: Agents always collaborate
**No agent works completely alone on a task.** Whenever a task is given (even to one agent), that agent **consults, informs or hands off** to at least one other relevant agent.
- Ask the Resume Doctor to improve your resume → it **asks the Company Analyst** what this company values first.
- Ask the DSA Coach for practice → it **asks the Company Analyst** for the company's interview pattern and **tells the Progress Manager** to track it.

### 🏢 Rule 2: Everything is company-specific
Every company is a **separate quest** with its own requirements. The resume, prep plan, practice and mock interview are all **tailored to that company and role**.

### 👀 Rule 3: Show every action
**Nothing happens invisibly.** Every action an agent is *about to do* (intent) and *is currently doing* (activity) is shown by its character through movement, animation, speech bubbles, thought bubbles and icons. (See [Section 7](#7-show-every-action-the-visual-action-system).)

---

## 4. Meet the Crew (Agents)

| Agent | Character idea | Room / area | Main responsibilities | Works closely with |
|---|---|---|---|---|
| 🙋 **Maya: Career Counselor** | Friendly, glasses, cardigan, clipboard | **Reception desk** | Collects the student's **full profile + resume + target company & role**; asks for missing details; opens the Quest File; coordinates the team | Everyone |
| 🕵️ **Kabir: Company Analyst** | Detective vibe, hoodie, magnifying glass | **Intel Room** (wall of pinned notes) | Builds the **Company Profile**: required skills, JD keywords, interview rounds, focus areas, culture | Resume Doctor, DSA Coach, Interview Coach |
| 📄 **Dr. Rhea: Resume Doctor** | Lab coat, red pen | **Resume Clinic** | Scores the resume against the Company Profile; finds gaps; rewrites bullets; produces a **company-tailored resume** | Company Analyst, Project Advisor, Counselor |
| 🛠️ **Arjun: Project Advisor** | Tool belt, headphones | **Workshop** | Reviews GitHub/projects; matches them to company needs; suggests what to highlight or build next | Resume Doctor, Company Analyst |
| 🧮 **Coach Vikram: DSA Coach** | Tracksuit, whistle, marker | **Whiteboard Room** | Builds a company-specific coding plan; gives problems; explains solutions | Company Analyst, Progress Manager |
| 🎤 **Ms. Iyer: Interview Coach** | Formal blazer, notepad | **Interview Room** | Runs **mock interviews** in that company's style (technical, project deep-dive, HR); scores answers | Company Analyst, Resume Doctor, Progress Manager |
| 🔭 **Zoya: Opportunity Scout** | Backpack, binoculars | **Scout Corner** (computers + world map) | Finds openings, deadlines and similar companies the student could target | Counselor, Company Analyst |
| 📊 **Mr. Desai: Progress Manager** | Senior, tie, coffee mug | **Manager's Cabin** | Reviews everyone's work, **sends work back** when quality is low, tracks progress, computes the **Readiness Score** | Everyone |

> 💡 Names and personalities make the office memorable. Each agent has a short "personality" line in its system prompt (e.g. Coach Vikram is energetic and motivating; Mr. Desai is strict but fair).

---

## 5. The Company Quest: Company-Specific Prep

Every company is different. A product company may focus on DSA and system design, a service company on aptitude and fundamentals, and an AI startup on projects and ML depth. OfferQuest handles this through **Quests**.

### 5.1 What the Career Counselor collects (the Quest Intake)

Maya, the Counselor, runs a **friendly step-by-step intake** and won't start the quest until required details are filled in.

**👤 Student profile**
- Name, college, degree, branch, year, graduation date
- CGPA / percentage (optional, but some companies have cut-offs)
- Skills: languages, frameworks, tools
- Projects (with links), internships and experience
- Achievements, certifications, hackathons, coding profiles (LeetCode, Codeforces, GitHub)
- Preferred locations, work mode (remote/office) and expected stipend (optional)

**📄 Resume**
- Upload a **PDF/DOCX**, or build one with Maya through questions if none exists
- Parsed into structured sections (education, skills, projects, experience)

**🏢 Target company & role**
- Company name
- Role (e.g. *AI Engineer Intern*, *SDE-1*, *Data Analyst*)
- **Job description** (paste it, or upload a link/PDF), the most important input
- Application deadline / interview date (if known)

**⏰ Prep context**
- Days left until the interview
- Hours available per day
- Self-rated confidence (DSA, CS fundamentals, projects, communication)

> ❗ If something important is missing (e.g. no job description), Maya **pauses**, shows a ❓ bubble, and asks the student, instead of guessing.

### 5.2 What the Company Analyst builds (the Company Profile)

Kabir combines **the job description + public information + general role knowledge** into a structured profile:

| Field | Example |
|---|---|
| Must-have skills | Python, RAG, LLM APIs, Git |
| Nice-to-have skills | LangGraph, Docker, vector databases |
| Top JD keywords | "retrieval", "evaluation", "production", "APIs" |
| Likely interview rounds | Online assessment → Technical (projects + DSA) → HR |
| DSA focus | Arrays, hashing, graphs (medium level) |
| Theory focus | OOP, DBMS, OS basics, ML fundamentals |
| What they value | Shipped projects, measurable impact, ownership |
| Red flags to avoid | No GitHub links, vague project descriptions |
| Confidence level | 🟢 From JD · 🟡 Common for this role · 🔴 Guess, verify |

> ⚠️ The Analyst **labels where each insight comes from** and never invents "insider" interview questions. The JD the student provides is the main source of truth.

### 5.3 What the student gets (the Company Prep Kit)

- 📄 **Tailored resume** for this company (PDF/DOCX) + before/after **match score**
- 📝 **Change log**: every resume edit and *why* it was made
- 🛠️ **Project advice**: what to highlight and what to build next
- 🧮 **DSA plan**: day-by-day problems based on the company's focus
- 📚 **Theory checklist**: topics to revise
- 🎤 **Mock interview report**: scores, strong answers, weak spots, model answers
- 📊 **Readiness Score** (0–100) with a breakdown
- 📅 **Day-by-day prep plan** until the interview date

### 5.4 Multiple companies at once
A student can run **several quests in parallel** (e.g. Company A, Company B, Company C). Each has its own Quest File, tailored resume and plan. The **Quest Board** on the office wall shows all of them, and the Progress Manager highlights overlapping prep (*"Graphs help for both A and C!"*).

---

## 6. How Agents Talk & Hand Off Work

### 6.1 The shared Quest File
Every quest has one **Quest File** (a shared, structured document). Each agent reads what it needs and writes its results into its own section. This is the team's shared memory.

### 6.2 Message types

| Type | Meaning | Example |
|---|---|---|
| `ASK` | Request information from another agent | Resume Doctor → Analyst: *"What does this company value most?"* |
| `ANSWER` | Reply to an ASK | Analyst → Resume Doctor: *"Shipped projects with metrics."* |
| `HANDOFF` | Pass ownership of a task | Counselor → Analyst: *"Quest #7 intake done. Build the company profile."* |
| `INFORM` | Share an update (no reply needed) | DSA Coach → Progress Manager: *"Plan ready: 28 problems."* |
| `REVIEW_REQUEST` | Ask for quality review | Resume Doctor → Progress Manager: *"Please review the tailored resume."* |
| `SEND_BACK` | Reject with reasons | Progress Manager → Resume Doctor: *"Bullet 3 has no numbers. Fix it."* |
| `ASK_HUMAN` | Need input from the student | Counselor → Student: *"Please paste the job description."* |
| `DONE` | Task finished | Interview Coach → Counselor: *"Mock interview complete."* |

### 6.3 Message format
```json
{
  "id": "msg_0142",
  "quest_id": "quest_007",
  "from": "resume_doctor",
  "to": "company_analyst",
  "type": "ASK",
  "content": "Which skills should the top of the resume emphasise for this role?",
  "attachments": ["quest_007/resume_v1"],
  "timestamp": "2026-10-02T10:15:00+05:30"
}
```

### 6.4 Who decides what happens next?
- **Phase 1 (simple & reliable):** a **fixed workflow graph** in LangGraph defines the order of steps.
- **Phase 2 (truly multi-agent):** agents **choose** who to ASK or HANDOFF to, using a list of teammates and their skills. The Counselor acts as the **coordinator** when no one owns a task.
- **Guardrails:** a maximum number of steps per quest, a maximum of 2 send-backs per item, and a loop detector so agents can't ping-pong forever.

### 6.5 Collaboration patterns
- **Consult:** Agent A asks Agent B, waits, and continues (*Resume Doctor ↔ Analyst*)
- **Handoff chain:** work moves along a line (*Counselor → Analyst → Resume Doctor → …*)
- **Parallel work:** independent agents work at the same time (*DSA Coach and Project Advisor*)
- **Review loop:** work goes to the Progress Manager, then either approved ✅ or sent back 🔁
- **Team huddle:** several agents meet in the **Meeting Room** to merge results into the final kit

---

## 7. Show Every Action: The Visual Action System

> **Golden rule:** if an agent does something in the backend, the student must be able to **see it** in the office.

### 7.1 Two layers of visibility for every action

| Layer | What it shows | How it looks |
|---|---|---|
| **Intent: "what I'm about to do"** | Announced *before* the action starts | 💭 Thought bubble + small icon, e.g. *💭 "Going to the Intel Room to study the JD"* |
| **Activity: "what I'm doing now"** | Shown *while* the action happens | Animation + speech bubble + progress, e.g. character reading at the Intel wall, *"Reading JD… 60%"* |

After finishing, a short **result bubble** appears, e.g. *✅ "Found 6 must-have skills!"*

### 7.2 Action → animation mapping

| Backend action | Intent bubble (before) | Activity (during) | Result (after) |
|---|---|---|---|
| Collect student info | 💭 "Let's get your details!" | Maya at reception, writing on clipboard 📋 | ✅ "Profile ready!" |
| Ask student a question | ❓ "I need something from you" | Character faces camera, ❓ pulses, UI prompt opens | 👍 "Thanks!" |
| Parse resume | 💭 "Reading your resume" | Holding paper, eyes scanning, 📄 icon | ✅ "Found 4 projects, 9 skills" |
| Research company / read JD | 💭 "Heading to the Intel Room" | Walking → pinning notes on board 📌 | ✅ "Company profile built" |
| Search web / openings | 💭 "Scouting openings" | Typing at computer, 🌐 icon, monitor glows | ✅ "Found 8 openings" |
| Ask another agent (ASK) | 💭 "Need Kabir's input" | **Walks to that agent**, speech bubble with the question | Other agent replies in bubble |
| Hand off work (HANDOFF) | 💭 "Passing this to Dr. Rhea" | **Walks carrying a 📁 folder**, hands it over | 📁 appears on receiver's desk |
| Write / rewrite resume | 💭 "Time to fix those bullets" | Red-pen scribbling animation ✍️ | ✅ "Match score 54 → 81" |
| Review GitHub | 💭 "Checking your repos" | Typing + 🐙 icon, code scrolling on screen | ✅ "2 projects to highlight" |
| Create DSA plan | 💭 "Planning your practice" | Drawing on whiteboard 🧮 | ✅ "28-day plan ready" |
| Mock interview | 💭 "Interview room, please!" | Both walk to Interview Room; Q&A bubbles alternate | ✅ "Score: 7/10" |
| Thinking / LLM call | — | 💭 "…" animated dots above head | — |
| Waiting for another agent | — | Tapping foot ⏳ / sipping chai ☕ | — |
| Review (Progress Manager) | 💭 "Let me check this" | Reading file at cabin, 🔍 icon | ✅ approved stamp / 🔁 send-back |
| Send back work | 💭 "This needs fixing" | Walks to agent, hands back 📁 with ❗ | Receiver shows 😅 then 💭 "Fixing it" |
| Team huddle | 💭 "Team meeting!" | Agents gather around the meeting table | ✅ "Prep Kit assembled" |
| Error / API limit | — | ⚠️ bubble, character scratches head | 💭 "Retrying in a moment" |
| Idle | — | Sitting, stretching, getting chai, chatting | — |

### 7.3 Other places actions are visible
- 📜 **Live Activity Log** (side panel): timestamped list of every intent, action, message and result
- 📋 **Quest Board** (wall): quest stages move from *Intake → Company Intel → Resume → Prep → Mock → Review → Done*
- 🔍 **Agent Inspector:** click any agent to see current intent, current activity, recent messages and outputs
- 🧵 **Conversation View:** read the full agent-to-agent chat for any quest
- 🔗 **Handoff lines (optional):** faint animated lines between agents while they talk

### 7.4 Event format (backend → game)
The game only **animates events**; it never decides anything.
```json
{ "event": "INTENT",   "agent": "resume_doctor", "text": "Going to ask Kabir what this company values", "icon": "thought" }
{ "event": "MOVE",     "agent": "resume_doctor", "to": "agent:company_analyst" }
{ "event": "SPEAK",    "agent": "resume_doctor", "to": "company_analyst", "text": "What should the resume emphasise?" }
{ "event": "SPEAK",    "agent": "company_analyst", "to": "resume_doctor", "text": "Shipped RAG projects with metrics." }
{ "event": "ACTIVITY", "agent": "resume_doctor", "anim": "write", "text": "Rewriting bullets…", "progress": 0.4 }
{ "event": "RESULT",   "agent": "resume_doctor", "text": "Match score 54 → 81", "status": "success" }
{ "event": "HANDOFF",  "from": "resume_doctor", "to": "progress_manager", "item": "resume_v2" }
```

### 7.5 Pacing
LLM calls can be fast or slow, so animations follow a few rules:
- Every action shows for a **minimum visible time** (~1.5s), so nothing flashes by unseen
- Walking happens **while** the LLM thinks, which hides waiting time naturally
- An **event queue per agent** makes sure animations play in order
- A **speed control** (0.5× / 1× / 2×) and **pause** button let the student follow along

---

## 8. Example Quest Walkthrough

> **Student:** *"I'm a 3rd-year CS student. Prepare me for the AI Engineer Intern role at NovaMind Labs."* (fictional company, JD pasted)

| # | What happens (backend) | What you see (office) |
|---|---|---|
| 1 | Student clicks **Maya** and starts a quest | Maya waves 👋, 💭 "New quest! Let's begin." |
| 2 | Maya collects profile, resume, JD, deadline | Intake form opens; Maya writing on clipboard 📋 |
| 3 | JD has no info on interview rounds; Maya asks student | ❓ bubble: "Do you know the interview rounds?" → student: "No" |
| 4 | Maya **HANDOFF** → Kabir | Maya walks to the Intel Room carrying 📁 "Quest #7" |
| 5 | Kabir builds Company Profile | 💭 "Studying the JD" → pins notes on board 📌 |
| 6 | Kabir **INFORMs** Rhea, Vikram, Ms. Iyer | Kabir walks past desks dropping 📌 notes |
| 7 | Rhea **ASKs** Arjun about projects | Rhea walks to the Workshop: "Which project fits best?" |
| 8 | Arjun reviews GitHub, **ANSWERs** | Code scrolling on monitor 🐙 → "Yojana Mitra: RAG + eval!" |
| 9 | Rhea rewrites resume | Red-pen scribbling ✍️ → ✅ "Match 54 → 81" |
| 10 | Vikram builds DSA plan *(parallel)* | Drawing graphs on whiteboard 🧮 |
| 11 | Rhea **REVIEW_REQUEST** → Mr. Desai | Rhea walks to the cabin with 📁 |
| 12 | Mr. Desai **SEND_BACK**: one bullet lacks numbers | 🔍 → ❗ "Bullet 3 needs a metric" → walks it back |
| 13 | Rhea fixes it, resubmits → approved | 😅 → ✍️ → ✅ stamp |
| 14 | Ms. Iyer **ASK_HUMAN** for mock interview | 💭 "Interview time!" → walks student avatar to Interview Room |
| 15 | Mock interview (RAG questions + HR) | Q&A bubbles alternate; score card appears |
| 16 | Team huddle → Prep Kit assembled | Everyone gathers at the meeting table 🤝 |
| 17 | Mr. Desai computes Readiness Score | 📊 "Readiness: 72/100" + 🎉 confetti |

---

## 9. The Office: Our Own Pixel World

We'll design **our own office from scratch**, using open-source tools and freely licensed assets only as **reference or base layers** where their licenses allow.

### 9.1 Art direction
| Aspect | Decision |
|---|---|
| View | **Top-down (¾ view)**, cozy and readable |
| Tile size | **32×32 px** (more detail than classic 16×16) |
| Character size | ~32×48 px (slightly taller than one tile) |
| Palette | Limited palette (~32 colours), warm and soft; try open palettes from **Lospec** |
| Mood | Friendly, modern Indian office: chai station, potted tulsi/money plant, ceiling fans, rangoli near reception, monsoon rain on windows |
| Outlines | Dark-coloured outlines (not pure black) for a softer look |
| Text | A pixel-style open-licensed font (e.g. from Google Fonts' pixel fonts) |

### 9.2 Floor plan

```
┌──────────────┬───────────────┬──────────────┬───────────────┐
│  🕵️ INTEL    │  📄 RESUME     │ 🛠️ WORKSHOP  │ 📊 MANAGER'S  │
│    ROOM      │    CLINIC      │              │    CABIN      │
│ pin board,   │ desks, red-pen │ tools, laptop│ big desk,     │
│ files        │ printer        │ GitHub screen│ approval stamp│
├──────┬───────┴───────┬───────┴──────┬───────┴───────────────┤
│ 🔭   │               │              │                       │
│SCOUT │   🌿 MAIN HALL / QUEST BOARD WALL  📋                  │
│CORNER│   (walkways, plants, water cooler)                    │
├──────┴──────┬────────┴──────┬───────┴──────┬────────────────┤
│ 🧮 WHITE-   │ 🎤 INTERVIEW   │ 🤝 MEETING   │ ☕ CHAI &      │
│ BOARD ROOM  │    ROOM        │    ROOM      │   BREAK AREA  │
├─────────────┴───────────────┴──────────────┴────────────────┤
│              🙋 RECEPTION  (entrance, Maya's desk)    🚪      │
└──────────────────────────────────────────────────────────────┘
```

### 9.3 Making it better than typical pixel offices
- **Layered depth:** characters walk *behind* tall shelves and *in front of* desks (Y-sorting)
- **Lighting:** soft shadows, glowing monitors, warm lamps, optional **day/night cycle** linked to real time
- **Living details:** swaying plants, blinking monitors, steam from chai cups, a ticking wall clock, fans spinning
- **Room signs & nameplates:** every desk shows the agent's name
- **Weather:** rain on windows during monsoon months (a fun touch)
- **Camera:** smooth zoom, click-to-follow an agent
- **Celebrations:** confetti when a quest completes, a trophy shelf for finished quests 🏆

### 9.4 Character design
- 8 unique agents + a **student avatar** (customisable: hair, outfit, skin tone)
- Built from layered parts (body, outfit, hair, accessory) so new characters are easy to make
- **Directions:** down, up, left, right

| Animation | Frames (approx.) |
|---|---|
| Idle (breathing) | 2–4 |
| Walk | 4–6 per direction |
| Sit & type | 2–4 |
| Read / hold paper | 2–3 |
| Write (red pen / whiteboard) | 3–4 |
| Talk (with mouth/hand movement) | 2–3 |
| Think (💭 dots) | uses bubble overlay |
| Celebrate | 3–4 |
| Confused / scratch head | 2–3 |
| Carry folder (walk variant) | 4–6 per direction |

### 9.5 Tools for creating the art
| Tool | Use | Cost |
|---|---|---|
| **LibreSprite** (open-source) or **Aseprite** (paid; can be compiled from source) | Drawing sprites, tiles, animations | Free / low cost |
| **Piskel** | Quick browser-based sprite drawing | Free |
| **Tiled** | Building the office map from tiles | Free, open-source |
| **Lospec palettes** | Colour palettes | Free |

### 9.6 Open-source references (license-safe)
| Source | License | How we use it |
|---|---|---|
| **Kenney.nl** packs | **CC0** (free for any use, no credit needed) | Base furniture/props or reference |
| **LPC (Liberated Pixel Cup)** sprites on OpenGameArt | **CC-BY-SA / GPL** (credit + share-alike required) | Character body/animation reference |
| **itch.io** asset packs | Varies by pack | **Only** packs marked CC0 or free for commercial use; read each license |
| Other pixel offices / projects | Mostly copyrighted | **Style reference only**, never copy |

**Rules:**
- ✅ Keep a `CREDITS.md` listing every asset, source and license
- ✅ Prefer drawing our own; use CC0 assets as starting points
- ❌ Never copy sprites from commercial games or paid packs without a license

---

## 10. Press Start: The Game-Style Entry Experience

OfferQuest **never drops the student straight into the app**. Like a real game, it opens with a title screen, and the student must **press Start** to enter the office. This sets the playful mood from the very first second.

### 10.1 The entry flow

```
🔄 Boot / Loading screen
   ↓
🏷️ Splash (team logo, ~2s, skippable)
   ↓
🎮 TITLE SCREEN  ── "PRESS START" (blinking) ──┐
                                                ↓
                                       📜 Main Menu
              ┌──────────────┬───────────────┼──────────────┬─────────────┐
         ▶ New Quest    ⏩ Continue     ❓ How to Play   ⚙️ Settings   📜 Credits
              │              │
              ▼              ▼
   🚪 First-time intro    🏢 Office loads where
   (office doors open,    the student left off
   Maya welcomes you,
   quick tutorial)
              ↓
   🏢 THE OFFICE (the real app)
```

### 10.2 Loading screen
- Pixel progress bar shaped like a **coffee cup filling with chai** ☕
- Rotating **career tips** while loading (*"Tip: tailor your resume for every company!"*)
- What really happens behind it:
  - All sprites, tiles, sounds and the office map are **preloaded**, so the office never stutters later
  - The frontend **pings the backend** (`/health`). Free hosting plans often sleep when idle, so this wakes the server up *while* the student watches the loading bar
  - Checks for a saved session (for **Continue**)

### 10.3 Title screen (the "Press Start" screen)
- **Animated background:** the pixel office seen through the front window, with agents quietly working, plants swaying, rain or sunlight depending on the time of day
- **Big pixel logo:** **OFFERQUEST** 🏆 with a gentle glow or bounce
- Tagline: *Every company is a new quest. Your crew prepares you for it.*
- **Blinking "PRESS START"** text (with a start button below it)
- Accepted inputs: **Enter**, **Space**, **mouse click** or **tap** (works on laptops, tablets and phones)
- Small text in a corner: version number and team name
- Idle animation: if nobody presses Start for ~20 seconds, a fun **attract mode** plays, showing a short pre-recorded quest replay (like arcade game demos)

**On pressing Start:**
- 🔊 a satisfying "start" sound plays
- ✨ the text flashes quickly, then a **pixel-wipe transition** (or the office doors sliding open) leads to the main menu

> 🔊 **Why "Press Start" also helps technically:** browsers block sound until the user interacts with the page. The Start press counts as that interaction, so music and sound effects can play from then on.

### 10.4 Main menu
| Option | What it does |
|---|---|
| ▶ **New Quest** | Starts a new company quest (goes to Maya at reception) |
| ⏩ **Continue** | Returns to saved quests and the office state (greyed out if no save) |
| ❓ **How to Play** | Short illustrated guide: click agents, assign tasks, read bubbles, use the Quest Board |
| ⚙️ **Settings** | Music volume, sound effects volume, animation speed (0.5× / 1× / 2×), reduce motion, text size, language (future) |
| 📜 **Credits** | Team, tools, and every asset with its license (from `CREDITS.md`) |

- Navigable with **arrow keys + Enter** *and* mouse/touch
- Selected option gets a pixel cursor ▶ and a small "tick" sound

### 10.5 First-time intro (onboarding as a mini cutscene)
For first-time players only (skippable, replayable from *How to Play*):
1. 🚪 The office **front doors slide open**; the student avatar walks in
2. 🙋 **Maya** waves: *"Welcome to OfferQuest! I'm Maya, your Career Counselor."*
3. 🎨 Quick **avatar creation**: hair, outfit, skin tone (the student's character in the office)
4. 👥 Camera **pans across the rooms** as each agent waves and introduces their role in one line
5. 🖱️ **Mini tutorial:** *"Click on me to give me a task!"* with a glowing hint arrow
6. 📁 Maya hands the student their first 📁 Quest File → **New Quest** intake begins

### 10.6 Saves (game-style)
- Each student profile works like a **save slot**, showing name, avatar, number of active quests and last played time
- Progress auto-saves after every completed step (shown by a small 💾 icon in the corner)

### 10.7 Sound & music
| Sound | Where |
|---|---|
| Calm lo-fi / chiptune theme | Title screen and menus |
| Soft office ambience (keyboard clicks, fan, distant chatter) | Office |
| Start, menu move, menu select | Title screen and menus |
| Footsteps, paper rustle, stamp, chai pour | Agent actions |
| Bubble pop, notification chime, quest complete fanfare 🎉 | Events |

- Use **CC0 / free-licensed** audio (e.g. Kenney audio packs, OpenGameArt CC0) or make our own with free tools like **jsfxr** (retro sound effect generator)
- Music and SFX have **separate volume controls**, and everything can be muted
- All audio is listed in `CREDITS.md`

### 10.8 Rules for the entry experience
- ⏱️ Fast: the title screen should appear within **~3 seconds** on a normal connection
- ⏭️ Skippable: splash and intro can be skipped; returning players go straight from Start to the menu
- ♿ Accessible: keyboard, mouse and touch all work; "reduce motion" turns off flashing and screen wipes
- 🎮 Consistent: the same pixel font, palette and sound style continue into the office

---

## 11. Features

### ✅ MVP (must-have)
- 🎮 **Game-style entry:** loading screen → title screen with **PRESS START** → main menu (New Quest / Continue / How to Play / Settings / Credits)
- First-time intro cutscene with Maya + quick tutorial (skippable)
- Basic sound effects and music with volume controls
- Pixel office with 9 areas (8 rooms + reception) and 8 agents
- Click an agent → assign a task (it still collaborates with others, per Rule 1)
- Full **Company Quest** flow: intake → company profile → tailored resume → DSA plan → mock interview → prep kit
- **Visual Action System**: intent, activity and result shown for every action
- Agent-to-agent **ASK / HANDOFF / SEND_BACK** with walking and folder-carrying animations
- **Ask-the-student** pauses with ❓
- Quest Board, Activity Log and Agent Inspector
- Tailored resume export (PDF/DOCX) + change log
- Readiness Score

### ⭐ Version 2
- Multiple quests in parallel with shared-prep detection
- Voice mock interviews (speech-to-text + text-to-speech)
- Agents choose handoffs themselves (dynamic routing)
- Replay mode (speed control is already in MVP settings)
- Attract mode on the title screen (uses replay)
- Day/night cycle and weather
- Advanced avatar customisation (more outfits, accessories, unlockables)
- Progress over time (DSA streak, interview scores)

---

## 12. System Architecture

```
┌────────────────────────────── BROWSER ──────────────────────────────┐
│  🎬 Scenes: Boot → Title (PRESS START) → Menu → Intro → Office       │
│  🎮 Phaser.js Office (map, sprites, pathfinding, animations)         │
│  🧩 React Overlay (quest intake, task box, quest board, log,         │
│      inspector, chat, prep kit viewer)                               │
│  📥 Event Queue per agent (plays animations in order, min durations) │
└───────────────▲──────────────────────────────────┬───────────────────┘
                │ WebSocket: visual events          │ REST/WebSocket: user actions
┌───────────────┴──────────────────────────────────▼───────────────────┐
│                         ⚙️ BACKEND (Python, FastAPI)                  │
│  🧠 Orchestrator (LangGraph): quest workflow, routing, guardrails     │
│  🤖 Agents (8): role prompt + tools + memory                          │
│  📬 Message Bus: ASK / ANSWER / HANDOFF / REVIEW / SEND_BACK …        │
│  📡 Event Emitter: turns every agent step into INTENT/MOVE/SPEAK/…    │
│  🚦 Gemini Request Queue: rate-limit handling + retries + caching     │
├──────────────────────────────────────────────────────────────────────┤
│  🗃️ SQLite: students, quests, messages, events, scores                │
│  🔎 ChromaDB: embeddings for resume ↔ JD matching, knowledge notes    │
│  📁 Files: resumes (input/output), prep kits                          │
└──────────────────────────────────────────────────────────────────────┘
        │                     │                     │
   Gemini API          GitHub API            Web search (public pages)
```

**Key principle:** the **backend decides**, the **game shows**. The game never makes decisions; it animates events. This keeps things easy to test and debug.

### Agent loop (per step)
```
Receive message/task
  → emit INTENT ("what I'm about to do")
  → (if needed) MOVE to room or agent
  → emit ACTIVITY (animation + progress)
  → think (Gemini) / use tool
  → write result to Quest File
  → emit RESULT
  → send next message (ASK / HANDOFF / INFORM / REVIEW_REQUEST / DONE)
```

---

## 13. Tech Stack

| Area | Choice |
|---|---|
| Game engine | **Phaser 3** + TypeScript |
| Map | **Tiled** (JSON export) |
| Pathfinding | Grid-based A* or BFS (e.g. `easystarjs`) |
| UI overlay | **React** + TypeScript |
| Backend | **Python 3.11+**, **FastAPI**, WebSockets |
| Multi-agent orchestration | **LangGraph** |
| LLM | **Google Gemini API (free tier)**, with queue + retry + cache |
| Embeddings | `bge-small` / `all-MiniLM` (local) or Gemini embeddings |
| Vector DB | **ChromaDB** |
| Database | **SQLite** |
| Resume parsing | PyMuPDF (PDF), `python-docx` (DOCX) |
| Resume export | `python-docx` + PDF export |
| GitHub review | GitHub REST API |
| Art | LibreSprite / Aseprite / Piskel, Tiled, Lospec palettes |
| Scenes & audio | Phaser scenes (Boot, Title, Menu, Intro, Office) + Phaser sound manager; jsfxr for SFX |
| Saves | Quest state in SQLite (backend); small UI settings (volume, speed) in browser storage |
| Deployment | Frontend: Vercel / Netlify · Backend: Render / Railway / Hugging Face Spaces |

**Hardware:** ⭐ to ⭐⭐. Runs comfortably on a MacBook M2 with 8GB RAM; the LLM runs in the cloud.

**About the Gemini free tier:** it has per-minute and per-day request limits. With 8 agents, we use:
- a **request queue** (agents take turns),
- **caching** (same JD or company is never analysed twice),
- **short prompts** with only the needed parts of the Quest File,
- and walking animations that naturally fill waiting time.

---

## 14. Data Models

```python
class Project(BaseModel):
    name: str
    description: str
    tech_stack: list[str]
    link: str | None               # GitHub / demo
    metrics: list[str] = []        # e.g. "82% answer accuracy"

class Experience(BaseModel):
    organisation: str
    role: str
    start: str
    end: str | None
    highlights: list[str]

class DayPlan(BaseModel):
    day: int
    date: str | None
    dsa_problems: list[str]
    theory_topics: list[str]
    other_tasks: list[str]         # e.g. "update GitHub README"

class StudentProfile(BaseModel):
    id: str
    name: str
    college: str
    degree: str
    branch: str
    year: int
    graduation_date: str
    cgpa: float | None
    skills: list[str]
    projects: list[Project]
    experience: list[Experience]
    achievements: list[str]
    links: dict[str, str]          # github, linkedin, leetcode…
    preferences: dict              # location, work mode, stipend

class Quest(BaseModel):
    id: str
    student_id: str
    company: str
    role: str
    job_description: str
    deadline: str | None
    days_available: int | None
    hours_per_day: float | None
    stage: Literal["intake", "company_intel", "resume", "prep",
                   "mock", "review", "done"]

class CompanyProfile(BaseModel):
    quest_id: str
    must_have_skills: list[str]
    nice_to_have_skills: list[str]
    jd_keywords: list[str]
    interview_rounds: list[str]
    dsa_focus: list[str]
    theory_focus: list[str]
    values: list[str]
    red_flags: list[str]
    sources: dict[str, Literal["jd", "role_common", "guess"]]

class AgentMessage(BaseModel):
    id: str
    quest_id: str
    sender: str
    receiver: str                  # agent id or "student"
    type: Literal["ASK", "ANSWER", "HANDOFF", "INFORM",
                  "REVIEW_REQUEST", "SEND_BACK", "ASK_HUMAN", "DONE"]
    content: str
    attachments: list[str] = []
    timestamp: str

class VisualEvent(BaseModel):
    event: Literal["INTENT", "MOVE", "SPEAK", "ACTIVITY",
                   "RESULT", "HANDOFF", "ASK_HUMAN", "IDLE", "ERROR"]
    agent: str
    text: str | None = None
    to: str | None = None          # room id or agent id
    anim: str | None = None
    progress: float | None = None
    status: str | None = None

class PrepKit(BaseModel):
    quest_id: str
    tailored_resume_path: str
    resume_changes: list[str]
    match_score_before: int
    match_score_after: int
    project_advice: list[str]
    dsa_plan: list[DayPlan]
    theory_checklist: list[str]
    mock_interview_report: dict
    readiness_score: int
    readiness_breakdown: dict[str, int]
```

---

## 15. Project Structure

```
offerquest/
├── backend/
│   ├── agents/
│   │   ├── base_agent.py          # shared loop: intent → act → result → message
│   │   ├── counselor.py           # Maya
│   │   ├── company_analyst.py     # Kabir
│   │   ├── resume_doctor.py       # Dr. Rhea
│   │   ├── project_advisor.py     # Arjun
│   │   ├── dsa_coach.py           # Coach Vikram
│   │   ├── interview_coach.py     # Ms. Iyer
│   │   ├── opportunity_scout.py   # Zoya
│   │   └── progress_manager.py    # Mr. Desai
│   ├── orchestrator/
│   │   ├── quest_graph.py         # LangGraph workflow
│   │   ├── router.py              # who acts next (fixed → dynamic)
│   │   └── guardrails.py          # step limits, loop detection
│   ├── messaging/
│   │   ├── message_bus.py
│   │   └── event_emitter.py       # agent steps → visual events
│   ├── tools/
│   │   ├── resume_parser.py
│   │   ├── resume_writer.py
│   │   ├── jd_matcher.py          # embeddings + scoring
│   │   ├── github_reader.py
│   │   └── web_search.py
│   ├── llm/
│   │   ├── gemini_client.py
│   │   ├── request_queue.py       # rate limits + retries
│   │   └── cache.py
│   ├── prompts/                   # one prompt file per agent
│   ├── models.py
│   ├── db.py
│   └── main.py                    # FastAPI + WebSockets
├── frontend/
│   ├── src/
│   │   ├── game/
│   │   │   ├── scenes/
│   │   │   │   ├── BootScene.ts           # preload assets + backend /health ping
│   │   │   │   ├── TitleScene.ts          # logo + blinking PRESS START + attract mode
│   │   │   │   ├── MenuScene.ts           # New Quest / Continue / How to Play / Settings / Credits
│   │   │   │   ├── IntroScene.ts          # first-time cutscene + tutorial
│   │   │   │   └── OfficeScene.ts         # the real app
│   │   │   ├── characters/Agent.ts        # state machine + animations
│   │   │   ├── bubbles/                   # thought, speech, icon bubbles
│   │   │   ├── pathfinding.ts
│   │   │   └── eventPlayer.ts             # per-agent event queue
│   │   ├── ui/                            # React overlay components
│   │   │   ├── QuestIntake.tsx
│   │   │   ├── TaskBox.tsx
│   │   │   ├── QuestBoard.tsx
│   │   │   ├── ActivityLog.tsx
│   │   │   ├── AgentInspector.tsx
│   │   │   └── PrepKitViewer.tsx
│   │   └── net/socket.ts
│   └── public/assets/
│       ├── tiles/
│       ├── characters/
│       ├── props/
│       ├── ui/                            # logo, title background, menu cursor, chai loading bar
│       ├── audio/                         # music + sound effects (CC0 / own)
│       └── maps/office.json               # Tiled export
├── art/                                   # source .aseprite / .piskel files
├── eval/
│   ├── test_quests.json
│   └── run_eval.py
├── docs/
│   └── idea.md
├── CREDITS.md                             # every asset + license
├── .env.example                           # GEMINI_API_KEY, GITHUB_TOKEN
└── README.md
```

---

## 16. Build Plan

| Week | Milestone | Done when… |
|---|---|---|
| 1 | **Design** | Agent roles, Quest File schema, message & event formats agreed; office floor plan sketched; palette chosen |
| 2 | **Agents in terminal (v0)** | Counselor → Analyst → Resume Doctor chain works in the terminal with real Gemini calls |
| 3 | **All agents + collaboration** | All 8 agents; ASK/ANSWER/HANDOFF/SEND_BACK work; guardrails in place |
| 4 | **Company Quest core** | Intake, Company Profile, tailored resume + match score working end to end (text only) |
| 5 | **Art sprint 1** | Tileset + office map in Tiled; 3 characters with idle/walk animations |
| 6 | **Office comes alive** | Boot + Title (PRESS START) + Menu scenes; Phaser office map loads; pathfinding; agents walk between rooms |
| 7 | **Connect brain ↔ body** | WebSocket events drive movement; intent/activity/result bubbles show for every action |
| 8 | **Art sprint 2** | All 8 characters + student avatar; type/read/write/carry/celebrate animations; lighting |
| 9 | **UI panels + intro** | Quest intake form, task box, Quest Board, Activity Log, Agent Inspector; first-time intro cutscene + tutorial |
| 10 | **Prep + mock interview** | DSA plan, mock interview flow, Prep Kit export, Readiness Score |
| 11 | **Evaluation & polish** | 20 test quests run; fixes; sound & music pass; replay + attract mode |
| 12 | **Ship it** | Deployed demo, README, CREDITS.md, 2–3 min demo video |

> 🥇 **Golden rule:** the agents must work in the terminal **before** they get bodies. The pixel office is the stage; the agents are the actors.

---

## 17. Work Split

| Area | Owner |
|---|---|
| Agents, prompts, orchestration (LangGraph), message bus | **Member A** |
| Tools: resume parsing/writing, JD matching, GitHub, search | **Member A** |
| Gemini queue, caching, guardrails | **Member A** |
| Pixel art: tiles, characters, animations, lighting | **Member B** |
| Phaser office: map, pathfinding, character state machines | **Member B** |
| Visual Action System: bubbles, event player, pacing | **Member B** |
| Title screen, menus, intro cutscene, sound & music | **Member B** (with Member A writing Maya's intro lines) |
| React UI panels | **Shared** |
| WebSocket contract (event format) | **Shared**: agree in Week 1, don't change without telling each other |
| Evaluation + test quests | **Shared** (10 each) |
| README, demo video, deployment | **Shared** |

---

## 18. Evaluation

### Test set
**20 test quests** with different students, companies and roles (product companies, service companies, AI startups, data roles), built from real public JDs.

### Metrics
| Metric | How we measure it |
|---|---|
| **Resume match improvement** | JD match score before vs. after (embeddings + keyword coverage) |
| **Resume faithfulness** | % of tailored resume claims that are true to the original profile (**must be 100%**) |
| **Company profile accuracy** | % of extracted skills/requirements actually present in the JD |
| **Plan relevance** | Human rating (1–5): does the DSA/theory plan fit the company? |
| **Mock interview quality** | Human rating of question relevance + feedback usefulness |
| **Collaboration value** | Multi-agent team vs. **one single agent** doing everything; compare output quality |
| **Send-back effectiveness** | % of issues caught by the Progress Manager before the final kit |
| **Visibility coverage** | % of backend actions that produced a visible event (**target: 100%**) |
| **Efficiency** | Gemini calls, time and failures per quest |
| **User testing** | 5–10 real students: usefulness, clarity, fun (1–5) |

---

## 19. Challenges & Solutions

| Challenge | Solution |
|---|---|
| Gemini free-tier rate limits with 8 agents | Request queue, caching, short prompts, parallel only when needed |
| Agents loop or ping-pong forever | Step limits, max 2 send-backs, loop detector, coordinator fallback |
| Resume "tailoring" could invent fake skills | Hard rule: only rephrase/reorder **existing** facts; faithfulness check flags anything new |
| Company info may be wrong or outdated | Label sources (JD / role-common / guess); JD is the source of truth |
| LLM speed vs. animation timing | Per-agent event queues, minimum durations, walking hides latency |
| Pixel art takes a long time | Start with simple shapes, build layered characters, use CC0 bases |
| Messy resume formats | Support PDF/DOCX; let the student correct parsed fields in a form |
| Too many simultaneous bubbles | Bubble priority rules; collapse older bubbles into the Activity Log |
| Title/intro screens feel slow on repeat visits | Splash and intro are skippable; returning players go Start → Menu → Office |
| Browsers block sound before user interaction | The PRESS START press unlocks audio; nothing plays before it |
| Free backend hosting sleeps when idle | Loading screen pings `/health` so the server wakes up during loading |
| Scope creep | Stick to MVP list; extra ideas go to Future Scope |

---

## 20. Privacy, Ethics & Honesty

- 🔒 **Resumes are personal data:** store locally or securely, let students delete their data anytime, never share it
- 🔑 **API keys** stay in `.env`, never committed
- ✍️ **No fake content:** OfferQuest never adds skills, projects or experience the student doesn't have
- 🏢 **No fake insider info:** company insights are labelled by source; no made-up "leaked" questions
- 🌐 **Respect websites:** follow terms of service and robots.txt; prefer pasted JDs and official career pages over scraping job portals
- ⚖️ **Fairness:** don't penalise students for college name, gender or background; test across different profiles
- 🤝 **Not a guarantee:** the Readiness Score is guidance, not a promise of selection
- 🎨 **Art licensing:** every asset tracked in `CREDITS.md`

---

## 21. Definition of Done

- [ ] App opens with loading screen → title screen → **PRESS START** → main menu (never straight into the office)
- [ ] Main menu works with keyboard, mouse and touch; Continue restores saved quests
- [ ] First-time intro cutscene + tutorial (skippable)
- [ ] Student can start a Company Quest and complete full intake
- [ ] All 8 agents collaborate (ASK / HANDOFF / REVIEW / SEND_BACK) on every quest
- [ ] Assigning a task to a single agent still triggers collaboration with relevant teammates
- [ ] **Every backend action produces a visible intent, activity and result** in the office
- [ ] Tailored resume export + change log + before/after match score
- [ ] DSA plan, theory checklist, mock interview report and Readiness Score
- [ ] Our own office map + 8 agents + student avatar with full animation set
- [ ] Quest Board, Activity Log and Agent Inspector working
- [ ] Evaluation report on 20 test quests (including team vs. single-agent comparison)
- [ ] `CREDITS.md` complete (art + audio + fonts); no unlicensed assets
- [ ] Deployed demo + README + demo video

---

## 22. Future Scope

- 🎙️ Voice mock interviews with live feedback on clarity and confidence
- 🏫 **College mode:** placement cells run OfferQuest for a whole batch, with a dashboard
- 👥 **Group discussion room:** practice GD rounds with multiple AI participants
- 🧑‍🤝‍🧑 **Multiplayer office:** friends prepare for the same company together
- 🌐 Hindi and Marathi support for students more comfortable in those languages
- 📅 Calendar sync for the day-by-day prep plan
- 🏆 Achievements and streaks to keep students motivated
- 🔌 Plug-in agents: new roles (Aptitude Coach, System Design Mentor) added like hiring a new employee, who walks in through the office door 🚪

---

## 23. Glossary

| Term | Plain meaning |
|---|---|
| **Agent** | An AI worker with a role that decides its next step and uses tools |
| **Multi-agent system** | Several agents working together, each with its own job |
| **Handoff** | One agent passing a task to another |
| **Orchestrator** | The part of the system that manages the workflow between agents |
| **LangGraph** | A Python library for building agent workflows as connected steps |
| **Quest** | A full preparation journey for one specific company and role |
| **Quest File** | The shared document where all agents store their work for a quest |
| **JD** | Job Description: what the company says it wants |
| **RAG** | Retrieval-Augmented Generation: look up relevant information first, then answer |
| **Embedding** | Text turned into numbers so similar meanings can be compared |
| **WebSocket** | A live, two-way connection between browser and server |
| **Phaser** | A JavaScript engine for building 2D browser games |
| **Tiled** | A free editor for building game maps out of tiles |
| **Tileset** | A sheet of small square images (floors, walls, furniture) used to build maps |
| **Sprite** | An image or animation of a character or object in a game |
| **Pathfinding** | How a character finds a route around walls and furniture |
| **State machine** | A character is always in exactly one state: idle, walking, working… |
| **CC0** | A license meaning "free for any use, no credit required" |
| **Title screen** | The first game screen with the logo and "Press Start", shown before the real app |
| **Scene** | One screen of the game (loading, title, menu, intro, office), each with its own code |
| **Attract mode** | A demo that plays on the title screen when nobody presses Start, like old arcade games |
| **Cutscene** | A short scripted animation, like the first-time intro with Maya |
| **Rate limit** | The maximum number of API requests allowed in a time period |

---

*OfferQuest: because every student deserves a crew in their corner.* 🏆
