export const TILE = 32;
export const COLS = 40;
export const ROWS = 24;
export const W = COLS * TILE;
export const H = ROWS * TILE;

export type Dir = "down" | "up" | "left" | "right";
export type Pt = { x: number; y: number };

/** ~32 warm colours; everything in the office is drawn from these. */
export const PAL = {
  ink: "#2b2233", plum: "#4a3b57", plumLight: "#6b5878", cream: "#f3e7d0", creamDark: "#dcc9a6",
  wood: "#c99a6b", woodDark: "#a87a4f", woodDeep: "#7a5637", sand: "#e9d3a7",
  teal: "#3f8f8a", tealDark: "#2f6d6c", mint: "#9fd3b6", leaf: "#4f9d5d", leafDark: "#357a48",
  sky: "#8fc7e8", night: "#2a3158", blue: "#4f7ec9", blueDark: "#3a5d99",
  red: "#d9534f", redDark: "#a93b3a", orange: "#e8944a", yellow: "#f4cf5d", gold: "#e0a92e",
  pink: "#e79aa8", purple: "#8a6bb8", white: "#fbf7ef", grey: "#b9b3bd", greyDark: "#7d7686",
  terracotta: "#c9764f", cork: "#c8a26a", screen: "#9be7e0", paper: "#fffaf0",
};

export interface Look {
  skin: string; hair: string; hairStyle: "short" | "long" | "bun" | "hood" | "cap";
  top: string; bottom: string; shoes: string;
  extra?: "glasses" | "coat" | "headphones" | "whistle" | "blazer" | "backpack" | "tie";
}

/** How someone walks: pace, how much they bob, how far the arms swing and the legs reach. */
export interface Gait { speed: number; bounce: number; swing: number; stride: number }

export interface AgentMeta {
  id: string; name: string; title: string; emoji: string; room: string;
  home: Pt; face: Dir; look: Look; intro: string; gait?: Gait;
}

const skin = { a: "#f1c9a5", b: "#d9a273", c: "#b97a56", d: "#8d5a3b" };

export const AGENTS: Record<string, AgentMeta> = {
  counselor: {
    id: "counselor", gait: { speed: 1, bounce: 1, swing: 2, stride: 4 }, name: "Maya", title: "Career Counselor", emoji: "🙋", room: "reception",
    home: { x: 16, y: 20 }, face: "down", intro: "I collect your details and coordinate the crew.",
    look: { skin: skin.b, hair: "#3a2a2a", hairStyle: "long", top: PAL.pink, bottom: PAL.plum, shoes: PAL.ink, extra: "glasses" },
  },
  company_analyst: {
    id: "company_analyst", gait: { speed: 0.95, bounce: 1, swing: 0, stride: 4 }, name: "Kabir", title: "Company Analyst", emoji: "🕵️", room: "intel",
    home: { x: 2, y: 3 }, face: "down", intro: "I study the job description and tell everyone what the company wants.",
    look: { skin: skin.c, hair: "#1f1a24", hairStyle: "hood", top: PAL.tealDark, bottom: PAL.ink, shoes: PAL.greyDark },
  },
  resume_doctor: {
    id: "resume_doctor", gait: { speed: 1.08, bounce: 0, swing: 2, stride: 4 }, name: "Dr. Rhea", title: "Resume Doctor", emoji: "📄", room: "clinic",
    home: { x: 13, y: 3 }, face: "down", intro: "I tailor your resume to the company. I never invent anything.",
    look: { skin: skin.a, hair: "#5a3520", hairStyle: "bun", top: PAL.white, bottom: PAL.blueDark, shoes: PAL.ink, extra: "coat" },
  },
  project_advisor: {
    id: "project_advisor", gait: { speed: 1, bounce: 1, swing: 2, stride: 4 }, name: "Arjun", title: "Project Advisor", emoji: "🛠️", room: "workshop",
    home: { x: 23, y: 3 }, face: "down", intro: "I match your projects to the role and say what to build next.",
    look: { skin: skin.b, hair: "#221a1a", hairStyle: "short", top: PAL.orange, bottom: PAL.woodDeep, shoes: PAL.ink, extra: "headphones" },
  },
  dsa_coach: {
    id: "dsa_coach", gait: { speed: 1.25, bounce: 2, swing: 3, stride: 5 }, name: "Coach Vikram", title: "DSA Coach", emoji: "🧮", room: "whiteboard",
    home: { x: 6, y: 16 }, face: "down", intro: "I build your day-by-day coding practice plan.",
    look: { skin: skin.c, hair: PAL.red, hairStyle: "cap", top: PAL.red, bottom: PAL.redDark, shoes: PAL.white, extra: "whistle" },
  },
  interview_coach: {
    id: "interview_coach", gait: { speed: 0.9, bounce: 0, swing: 1, stride: 3 }, name: "Ms. Iyer", title: "Interview Coach", emoji: "🎤", room: "interview",
    home: { x: 13, y: 15 }, face: "down", intro: "I run mock interviews in the company's style.",
    look: { skin: skin.b, hair: "#2a1c1c", hairStyle: "bun", top: PAL.night, bottom: PAL.night, shoes: PAL.ink, extra: "blazer" },
  },
  opportunity_scout: {
    id: "opportunity_scout", gait: { speed: 1.18, bounce: 1, swing: 3, stride: 5 }, name: "Zoya", title: "Opportunity Scout", emoji: "🔭", room: "scout",
    home: { x: 2, y: 9 }, face: "down", intro: "I find where to look for openings and similar roles.",
    look: { skin: skin.a, hair: "#6b3a1e", hairStyle: "long", top: PAL.leaf, bottom: PAL.sand, shoes: PAL.woodDeep, extra: "backpack" },
  },
  progress_manager: {
    id: "progress_manager", gait: { speed: 0.8, bounce: 0, swing: 1, stride: 3 }, name: "Mr. Desai", title: "Progress Manager", emoji: "📊", room: "cabin",
    home: { x: 34, y: 3 }, face: "down", intro: "I review everyone's work and compute your Readiness Score.",
    look: { skin: skin.c, hair: PAL.grey, hairStyle: "short", top: PAL.white, bottom: PAL.greyDark, shoes: PAL.ink, extra: "tie" },
  },
  student: {
    id: "student", gait: { speed: 1.15, bounce: 1, swing: 2, stride: 4 }, name: "You", title: "Student", emoji: "🎓", room: "reception",
    home: { x: 16, y: 22 }, face: "up", intro: "",
    look: { skin: skin.b, hair: "#2a2030", hairStyle: "short", top: PAL.yellow, bottom: PAL.blue, shoes: PAL.white },
  },
};

export const CREW = Object.keys(AGENTS).filter((a) => a !== "student");

export const STAGES = ["intake", "company_intel", "resume", "prep", "mock", "review", "done"] as const;
export const STAGE_LABEL: Record<string, string> = {
  intake: "Intake", company_intel: "Company Intel", resume: "Resume", prep: "Prep", mock: "Mock",
  review: "Review", done: "Done",
};

export const TIPS = [
  "Tip: tailor your resume for every company!",
  "Tip: one measured result beats three adjectives.",
  "Tip: the job description is the syllabus. Read it twice.",
  "Tip: explain your project out loud before the interview.",
  "Tip: a GitHub link is proof. Add it.",
  "Tip: say the complexity before the interviewer asks.",
];
