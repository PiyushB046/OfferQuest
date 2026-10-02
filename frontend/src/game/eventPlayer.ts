/**
 * Plays backend events as animation. It never decides anything: it only acts out what arrives.
 *
 * Each agent has its own queue so animations play in order. An event that involves two agents
 * (a question, a hand-off) waits for both, so Kabir never answers before Rhea has walked over.
 *
 * The same player drives live quests, replays of finished quests and the title screen's attract
 * mode; the only difference is that a recording never waits for the student.
 */
import { AGENTS, type Pt } from "./config";
import type { Agent } from "./characters/Agent";
import type { BubbleLayer } from "./bubbles/BubbleLayer";
import { SPOTS } from "./map";
import { nearestNeighbour } from "./pathfinding";
import { sfx } from "./audio";
import { speak } from "./voice";
import { type Notice, store, type VisualEvent } from "../state/store";

export interface Stage {
  agents: Record<string, Agent>;
  bubbles: BubbleLayer;
  /** Resolves after `ms` of game time: honours pause and the speed setting. */
  wait(ms: number): Promise<void>;
  confetti(): void;
  /** Draws (or clears) the faint line between two agents who are talking. */
  link(a: Agent | null, b?: Agent): void;
}

export type Mode = "live" | "replay" | "attract";

const ACTIVITY_ICON: Record<string, string> = {
  clipboard: "📋", read: "📄", pin: "📌", web: "🌐", write: "✍️", code: "🐙", draw: "🧮", notes: "📝",
  inspect: "🔍", check: "🛡️", print: "🖨️", think: "💭", oops: "😅", chai: "☕", wave: "👋",
};
/** Which animation acts out each backend activity (spec §7.2). */
const ACTIVITY_POSE: Record<string, string> = {
  clipboard: "write", read: "read", pin: "write", web: "type", write: "write", code: "type", draw: "write",
  notes: "write", inspect: "read", check: "read", print: "type", oops: "confused", wave: "wave", chai: "sip",
};

/** What an agent's finished work means for the student: a "!" appears until they go and talk to that agent. */
function noticeFor(agent: string, text: string): Notice | null {
  const kit = (tab: string, say: string, label: string): Notice => ({ text: say, label, action: `kit:${tab}` });
  if (agent === "company_analyst" && /profile built/i.test(text)) return kit("Company", "I've studied the JD. Come and see what this company really wants.", "Show me the company profile");
  if (agent === "resume_doctor" && /match score/i.test(text)) return kit("Resume", `Your tailored resume is ready. ${text}.`, "Show me my resume");
  if (agent === "project_advisor" && /highlight|plan one/i.test(text)) return kit("Overview", "I have advice on which projects to lead with.", "Show me the advice");
  if (agent === "dsa_coach" && /plan ready/i.test(text)) return kit("Plan", `Your practice plan is on the whiteboard. ${text}.`, "Show me the plan");
  if (agent === "opportunity_scout" && /leads/i.test(text)) return kit("Opportunities", "I've lined up places to look for openings.", "Show me the leads");
  if (agent === "interview_coach" && /skipped/i.test(text)) return { text: "You skipped the mock interview. Come to the Interview Room when you're ready.", label: "Take the mock interview", action: "task:" };
  if (agent === "interview_coach" && /score/i.test(text)) return kit("Mock interview", `Your mock interview report is ready. ${text}.`, "Show me the report");
  if (agent === "progress_manager" && /readiness/i.test(text)) return kit("Overview", `${text}. Come see where to focus.`, "Show me the breakdown");
  return null;
}

/** Minimum visible time (spec §7.5), longer for longer text so it can actually be read. */
const readTime = (text = "") => Math.max(1500, Math.min(4200, 900 + text.length * 38));

export class EventPlayer {
  private tails = new Map<string, Promise<void>>();
  private pending = new Map<string, number>();
  private dest = new Map<string, Pt>();
  private visiting = new Set<string>();
  /** Bumped whenever real work arrives: small talk queued before it is dropped, so a quest never waits on chai. */
  private gen = 0;
  private stageGate: Promise<void> = Promise.resolve();
  /** The student is seated in the Interview Room: clicks on the map don't pull them out of it. */
  studentLocked = false;

  constructor(private stage: Stage, private mode: Mode = "live", private onEnd?: () => void) {}

  /** True while nothing is queued for this agent. */
  isFree(id: string) {
    return !this.pending.get(id);
  }

  enqueue(ev: VisualEvent) {
    const all = Object.keys(this.stage.agents);
    if (!this.stage.agents[ev.agent]) return;
    if (ev.local) (ev as VisualEvent & { gen?: number }).gen = this.gen;
    else this.gen++;
    let involved = [ev.agent];
    // Stage changes wait for everything before them to finish, but nobody has to wait for them.
    const barrier = ev.event === "STAGE" || ev.event === "QUEST_DONE";
    if (barrier) involved = all;
    else {
      const other = ev.to?.replace("agent:", "");
      if (other && other !== ev.agent && this.stage.agents[other] && !ev.to!.startsWith("room:")) involved.push(other);
    }
    this.pending.set(ev.agent, (this.pending.get(ev.agent) ?? 0) + 1);
    const deps = involved.map((a) => this.tails.get(a) ?? Promise.resolve());
    // Work from a later stage never starts on screen before the stage change itself has played.
    if (!ev.local && !barrier) deps.push(this.stageGate);
    const run = Promise.all(deps)
      .then(() => this.play(ev))
      .catch((e) => console.error("event failed", ev, e))
      .then(() => {
        this.pending.set(ev.agent, (this.pending.get(ev.agent) ?? 1) - 1);
        this.afterDrain(ev.agent);
      });
    if (!barrier) involved.forEach((a) => this.tails.set(a, run));
    else this.stageGate = run;
  }

  /** An agent who walked over to talk to someone goes back to their desk once they have nothing else to do. */
  private afterDrain(id: string) {
    if (this.isFree(id) && this.visiting.has(id)) {
      this.visiting.delete(id);
      this.enqueue({ event: "IDLE", agent: id, local: true });
    }
  }

  private taken = (self: string) => (p: Pt) =>
    Object.entries(this.stage.agents).some(([id, a]) => {
      if (id === self) return false;
      const d = this.dest.get(id) ?? a.tile;
      return d.x === p.x && d.y === p.y;
    });

  private resolve(a: Agent, to: string): Pt | null {
    if (to === "home") return a.meta.home;
    if (to.startsWith("tile:")) {
      const [x, y] = to.slice(5).split(",").map(Number);
      return { x, y };
    }
    if (to.startsWith("room:")) {
      const room = to.slice(5);
      const spots = SPOTS[room] ?? SPOTS.hall;
      if (a.meta.room === room) return spots[a.meta.id === "student" ? 1 : 0];
      const guest = a.meta.id === "student" ? spots.slice(1) : spots.slice(room === "meeting" ? 0 : 1);
      return guest.find((s) => !this.taken(a.meta.id)(s)) ?? guest[0];
    }
    const other = this.stage.agents[to.replace("agent:", "")];
    if (!other) return null;
    const dist = Math.abs(other.tile.x - a.tile.x) + Math.abs(other.tile.y - a.tile.y);
    if (dist <= 1) return a.tile;
    return nearestNeighbour(a.tile, other.tile, this.taken(a.meta.id));
  }

  private async walk(a: Agent, to: string) {
    const target = this.resolve(a, to);
    if (!target) return;
    this.dest.set(a.meta.id, target);
    this.stage.bubbles.hide(a.meta.id);
    a.setPose(null);
    await a.walkTo(target);
    this.dest.delete(a.meta.id);
    if (to.startsWith("agent:")) {
      this.visiting.add(a.meta.id);
      a.faceTowards(this.stage.agents[to.slice(6)].tile);
    } else {
      this.visiting.delete(a.meta.id);
      if (target.x === a.meta.home.x && target.y === a.meta.home.y) a.face(a.meta.face);
      else if (to.startsWith("room:")) a.face(to === "room:meeting" ? (a.tile.y <= 15 ? "down" : a.tile.y >= 18 ? "up" : a.tile.x < 25 ? "right" : "left") : "up");
    }
  }

  private log(ev: VisualEvent, kind: string, text: string) {
    if (ev.local || this.mode === "attract") return;
    store.getState().addLog({ agent: ev.agent, kind, text, to: ev.to?.replace("agent:", ""), quest: ev.quest_id });
  }

  private async play(ev: VisualEvent) {
    const { agents, bubbles, wait } = this.stage;
    const a = agents[ev.agent];
    // Small talk that was queued before real work arrived is skipped; walking home still happens.
    if (ev.local && (ev as VisualEvent & { gen?: number }).gen !== this.gen && ev.event !== "IDLE") return;
    const id = ev.agent;
    const s = store.getState();
    const text = ev.text ?? "";
    const live = this.mode === "live";

    switch (ev.event) {
      case "INTENT":
        bubbles.show(id, "thought", `💭 ${text}`);
        sfx("think");
        this.log(ev, "intent", text);
        s.setAgent(id, { intent: text });
        await wait(readTime(text));
        bubbles.hide(id);
        break;

      case "MOVE":
        if (ev.agent === "student" && !ev.local) this.studentLocked = ev.to === "room:interview";
        await this.walk(a, ev.to ?? "home");
        break;

      case "SPEAK": {
        const other = agents[ev.to ?? ""];
        if (other) {
          a.faceTowards(other.tile);
          if (!other.walking) other.faceTowards(a.tile);
          this.stage.link(a, other);
        }
        a.setPose("talk");
        bubbles.show(id, "speech", text);
        sfx("pop");
        if (live && id === "interview_coach" && ev.to === "student") speak(text);
        this.log(ev, "speak", text);
        s.setAgent(id, {}, `→ ${AGENTS[ev.to ?? ""]?.name ?? ev.to}: ${text}`);
        if (other) s.setAgent(other.meta.id, {}, `← ${a.meta.name}: ${text}`);
        await wait(readTime(text));
        a.setPose(null);
        bubbles.hide(id);
        this.stage.link(null);
        break;
      }

      case "ACTIVITY": {
        const icon = ACTIVITY_ICON[ev.anim ?? ""] ?? "⚙️";
        const thinking = text === "…";
        a.setPose(ACTIVITY_POSE[ev.anim ?? ""] ?? null);
        bubbles.show(id, thinking ? "thought" : "activity", thinking ? "💭 …" : `${icon} ${text}`, ev.progress);
        if (ev.anim === "write" || ev.anim === "print") sfx("paper");
        this.log(ev, "activity", thinking ? "Thinking…" : text);
        s.setAgent(id, { activity: text });
        await wait(thinking ? 900 : readTime(text) * 0.8);
        a.setPose(null);
        bubbles.hide(id);
        break;
      }

      case "RESULT": {
        const ok = ev.status === "success";
        if (ok) a.setPose("cheer");
        bubbles.show(id, ok ? "result" : "speech", ok ? `✅ ${text}` : text);
        sfx(/approved/i.test(text) ? "stamp" : "chime");
        this.log(ev, "result", text);
        s.setAgent(id, { activity: "", intent: "" }, `✅ ${text}`);
        if (live && !ev.local) {
          const notice = noticeFor(id, text);
          if (notice) store.getState().setNotice(id, notice);
        }
        await wait(readTime(text));
        a.setPose(null);
        bubbles.hide(id);
        break;
      }

      case "HANDOFF": {
        const other = agents[ev.to ?? ""];
        const back = ev.status === "send_back";
        a.carrying = true; // the folder is in the sprite's hands while walking
        if (back) bubbles.carry(id, "❗");
        if (other) await this.walk(a, `agent:${other.meta.id}`);
        if (other) this.stage.link(a, other);
        a.setPose("read");
        bubbles.show(id, back ? "error" : "speech", `${back ? "🔁" : "📁"} ${text}`);
        sfx(back ? "error" : "paper");
        this.log(ev, back ? "sendback" : "handoff", text);
        s.setAgent(id, {}, `📁 → ${other?.meta.name ?? ev.to}: ${text}`);
        if (other) s.setAgent(other.meta.id, {}, `📁 ← ${a.meta.name}: ${text}`);
        await wait(readTime(text));
        bubbles.hide(id);
        bubbles.carry(id, null);
        a.carrying = false;
        a.setPose(null);
        this.stage.link(null);
        if (other) {
          const rid = other.meta.id;
          bubbles.carry(rid, back ? "📁❗" : "📁");
          if (back) {
            other.setPose("confused");
            void wait(1400).then(() => other.setPose(null));
          }
          void wait(3500).then(() => bubbles.carry(rid, null));
        }
        break;
      }

      case "ASK_HUMAN": {
        a.face("down");
        sfx("ask");
        this.log(ev, "ask", text);
        if (live && ev.prompt) {
          bubbles.show(id, "ask", "❓ I need something from you");
          s.setAgent(id, { activity: "Waiting for your answer" });
          const before = store.getState().notices[id];
          store.getState().setNotice(id, { text, label: "Answer in the panel on the right", action: "prompt" });
          await new Promise<void>((resolve) =>
            store.setState({ prompts: [...store.getState().prompts, { ...ev.prompt!, resolve }] }));
          store.getState().setNotice(id, before ?? null);
          s.setAgent(id, { activity: "" });
        } else {
          bubbles.show(id, "ask", `❓ ${text.length > 90 ? text.slice(0, 88) + "…" : text}`);
          await wait(2600);
        }
        bubbles.hide(id);
        break;
      }

      case "IDLE":
        bubbles.hide(id);
        bubbles.carry(id, null);
        a.setPose(null);
        s.setAgent(id, { activity: "", intent: "" });
        await this.walk(a, "home");
        break;

      case "ERROR":
        a.setPose("confused");
        bubbles.show(id, "error", `⚠️ ${text}`);
        sfx("error");
        this.log(ev, "error", text);
        await wait(readTime(text));
        a.setPose(null);
        bubbles.hide(id);
        break;

      case "STAGE":
        if (ev.quest_id) store.setState({ stages: { ...store.getState().stages, [ev.quest_id]: ev.status ?? "" }, saved: live });
        this.log(ev, "stage", `Quest stage: ${ev.status}`);
        void wait(1500).then(() => store.setState({ saved: false }));
        break;

      case "QUEST_DONE": {
        const ok = ev.status === "success";
        if (ok) {
          this.stage.confetti();
          sfx("fanfare");
          Object.values(agents).forEach((x) => !x.walking && x.setPose("cheer"));
          bubbles.show(id, "result", `🎉 ${text}`);
          this.log(ev, "result", `Quest complete! ${text}`);
          await wait(2600);
          Object.values(agents).forEach((x) => x.setPose(null));
          bubbles.hide(id);
        } else this.log(ev, "error", `Quest stopped: ${text}`);
        if (live && ev.quest_id) {
          store.getState().setLive(ev.quest_id, false);
          // The kit opens for the quest on screen; a parallel quest just reports in the log.
          if (ok && ev.quest_id === store.getState().questId) store.setState({ kitReady: true, modal: "kit" });
        }
        this.onEnd?.();
        break;
      }
    }
  }
}
