import { create } from "zustand";
import type { Look } from "../game/config";

export interface VisualEvent {
  seq?: number; quest_id?: string; ts?: string; local?: boolean;
  event: "INTENT" | "MOVE" | "SPEAK" | "ACTIVITY" | "RESULT" | "HANDOFF" | "ASK_HUMAN" | "IDLE" | "ERROR"
    | "STAGE" | "QUEST_DONE";
  agent: string; text?: string; to?: string; anim?: string; progress?: number; status?: string;
  item?: string; prompt?: Prompt;
}
export interface Prompt { id: string; question: string; kind: string; options: string[]; optional: boolean; agent: string }
/** An agent has something for the student: shown as a "!" over their head until the student talks to them. */
export interface Notice { text: string; label: string; action: string }
export type OpenPrompt = Prompt & { resolve: () => void };
export interface LogEntry { id: number; time: string; agent: string; kind: string; text: string; to?: string; quest?: string }
export interface AgentStatus { intent: string; activity: string; recent: string[] }
export interface Settings {
  music: number; sfx: number; speed: number; reduceMotion: boolean; textSize: number;
  ambience: "auto" | "day" | "evening" | "night" | "rain"; voice: boolean;
}
export type Modal = null | "howto" | "settings" | "credits" | "intake" | "kit" | "board" | "avatar" | "slots" | "progress";

const KEY = "offerquest";
interface Saved {
  settings: Settings; studentId: string | null; questId: string | null; seenIntro: boolean; avatar: Look | null;
}
const DEFAULTS: Saved = {
  settings: { music: 0.4, sfx: 0.6, speed: 1, reduceMotion: false, textSize: 1, ambience: "auto", voice: false },
  studentId: null, questId: null, seenIntro: false, avatar: null,
};

function load(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return { ...DEFAULTS, ...raw, settings: { ...DEFAULTS.settings, ...(raw.settings ?? {}) } };
  } catch {
    return DEFAULTS;
  }
}

interface State extends Saved {
  scene: "boot" | "title" | "menu" | "intro" | "office" | "attract";
  modal: Modal;
  paused: boolean;
  brain: string;
  backendUp: boolean;
  /** Stage of every quest seen this session; the top bar shows the current quest's. */
  stages: Record<string, string>;
  /** Quests the crew is working on right now. Several can run in parallel. */
  live: string[];
  questNames: Record<string, string>;
  questTitle: string;
  kitReady: boolean;
  replaying: boolean;
  log: LogEntry[];
  /** Questions waiting for the student, oldest first. */
  prompts: OpenPrompt[];
  inspected: string | null;
  follow: string | null;
  agents: Record<string, AgentStatus>;
  notices: Record<string, Notice>;
  /** Which Prep Kit tab to open next (set when an agent points the student at their work). */
  kitTab: string | null;
  daysLeft: number | null;
  saved: boolean;
  set: (p: Partial<State>) => void;
  setSettings: (p: Partial<Settings>) => void;
  addLog: (e: Omit<LogEntry, "id" | "time">) => void;
  setAgent: (id: string, p: Partial<AgentStatus>, recent?: string) => void;
  setLive: (questId: string, on: boolean) => void;
  setNotice: (agent: string, notice: Notice | null) => void;
  resetQuestView: () => void;
}

let logId = 0;

export const useStore = create<State>((set, get) => ({
  ...load(),
  scene: "boot", modal: null, paused: false, brain: "offline", backendUp: false, stages: {}, live: [],
  questNames: {}, questTitle: "", kitReady: false, replaying: false, log: [], prompts: [], inspected: null,
  follow: null, agents: {}, notices: {}, kitTab: null, daysLeft: null, saved: false,
  set: (p) => {
    set(p);
    persist(get());
  },
  setSettings: (p) => {
    set({ settings: { ...get().settings, ...p } });
    persist(get());
  },
  addLog: (e) =>
    set({ log: [...get().log.slice(-400), { ...e, id: ++logId, time: new Date().toLocaleTimeString([], { hour12: false }) }] }),
  setAgent: (id, p, recent) => {
    const cur = get().agents[id] ?? { intent: "", activity: "", recent: [] };
    set({ agents: { ...get().agents, [id]: { ...cur, ...p, recent: recent ? [...cur.recent.slice(-5), recent] : cur.recent } } });
  },
  setLive: (questId, on) => {
    const rest = get().live.filter((q) => q !== questId);
    set({ live: on ? [...rest, questId] : rest });
  },
  setNotice: (agent, notice) => {
    const rest = { ...get().notices };
    delete rest[agent];
    set({ notices: notice ? { ...rest, [agent]: notice } : rest });
  },
  resetQuestView: () => set({ log: [], agents: {}, kitReady: false, notices: {}, daysLeft: null }),
}));

function persist(s: State) {
  try {
    const saved: Saved = { settings: s.settings, studentId: s.studentId, questId: s.questId, seenIntro: s.seenIntro, avatar: s.avatar };
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    /* private window or blocked storage: settings just won't be remembered */
  }
}

export const store = useStore;
